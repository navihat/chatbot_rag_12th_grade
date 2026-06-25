import json
import logging
import os
import re
from collections import defaultdict
from typing import Any

from fastapi import HTTPException
from groq import AsyncGroq

from services.db import get_learning_report_source_data
from services.retrieval import retrieve_chunks

logger = logging.getLogger(__name__)

REPORT_SYSTEM = """Bạn là cố vấn học tập môn Hóa học 12.
Chỉ dùng dữ liệu đánh giá được cung cấp để viết báo cáo học tập.
Trả về đúng JSON, không thêm markdown hay văn bản ngoài JSON.

Schema:
{
  "llm_report": "<báo cáo ngắn bằng tiếng Việt>",
  "practice_recommendations": [
    {
      "id": "<id-ngan>",
      "chapter": "<tên chương>",
      "level": 1,
      "title": "<tiêu đề luyện tập>",
      "prompt": "<yêu cầu luyện tập cụ thể>"
    }
  ]
}
"""

PRACTICE_SYSTEM = """Bạn là giáo viên Hóa học 12.
Tạo bài luyện tập trắc nghiệm dựa trên [CONTEXT] và điểm yếu trong [REPORT_CONTEXT].
Trả về đúng JSON, không thêm markdown hay văn bản ngoài JSON.

Schema:
{
  "topic": "<chủ đề>",
  "questions": [
    {
      "id": 1,
      "question": "<câu hỏi>",
      "options": {"A": "<...>", "B": "<...>", "C": "<...>", "D": "<...>"},
      "correct": "A",
      "explanation": "<giải thích ngắn>"
    }
  ]
}
"""


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _level_label(level: int) -> str:
    if level == 1:
        return "Nhận biết"
    if level == 2:
        return "Thông hiểu"
    return "Vận dụng"


def _slug(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", value.lower()).strip("-")
    return slug[:40] or "practice"


def _extract_json(raw: str) -> dict:
    match = re.search(r"\{[\s\S]+\}", raw)
    if not match:
        raise ValueError("LLM did not return JSON.")
    return json.loads(match.group())


def _aggregate_report_data(source: dict) -> dict:
    mastery = source["mastery"]
    details = source["assessment_details"]

    chapters = [
        {
            "chapter": row["chapter"],
            "mastery_score": _safe_float(row["mastery_score"]),
            "status": row["status"],
            "highest_mastery_score": _safe_float(row["highest_mastery_score"]),
            "highest_status": row["highest_status"],
            "updated_at": row.get("updated_at"),
        }
        for row in mastery
    ]

    chapters_by_highest = sorted(chapters, key=lambda item: item["highest_mastery_score"])
    weakest_chapters = chapters_by_highest[:3]
    strongest_chapters = list(reversed(chapters_by_highest[-3:]))

    total_attempts = len(details)
    average_mastery = (
        round(sum(item["highest_mastery_score"] for item in chapters) / len(chapters), 1)
        if chapters
        else 0.0
    )

    level_stats: dict[int, dict[str, float]] = defaultdict(lambda: {"total": 0, "correct": 0})
    for row in details:
        level = int(row["level"])
        level_stats[level]["total"] += 1
        level_stats[level]["correct"] += int(row["correct"])

    level_breakdown = []
    for level in (1, 2, 3):
        stats = level_stats[level]
        total = int(stats["total"])
        correct = int(stats["correct"])
        accuracy = round(correct / total, 2) if total else 0.0
        level_breakdown.append(
            {
                "level": level,
                "label": _level_label(level),
                "total": total,
                "correct": correct,
                "accuracy": accuracy,
            }
        )

    weakest_level = min(
        level_breakdown,
        key=lambda item: (item["accuracy"] if item["total"] else 2, item["level"]),
    )

    return {
        "summary": {
            "average_mastery": average_mastery,
            "total_attempts": total_attempts,
            "strongest_chapters": strongest_chapters,
            "weakest_chapters": weakest_chapters,
            "weakest_level": weakest_level,
        },
        "level_breakdown": level_breakdown,
        "source_sample": {
            "mastery": chapters,
            "recent_assessment_details": details[:30],
        },
    }


def _fallback_recommendations(aggregated: dict) -> list[dict]:
    weakest_chapters = aggregated["summary"]["weakest_chapters"]
    weakest_level = aggregated["summary"]["weakest_level"]
    if not weakest_chapters:
        return []

    recommendations = []
    for index, item in enumerate(weakest_chapters, start=1):
        chapter = item["chapter"]
        level = weakest_level["level"] or 1
        recommendations.append(
            {
                "id": f"{_slug(chapter)}-level-{level}",
                "chapter": chapter,
                "level": level,
                "title": f"Luyện {_level_label(level)} - {chapter}",
                "prompt": (
                    f"Tạo 5 câu hỏi trắc nghiệm mức {_level_label(level)} để ôn lại "
                    f"điểm yếu trong {chapter}."
                ),
            }
        )
    return recommendations


async def generate_learning_report(email: str) -> dict:
    source = get_learning_report_source_data(email)
    if not source["mastery"] and not source["assessment_details"]:
        return {
            "summary": {
                "average_mastery": 0.0,
                "total_attempts": 0,
                "strongest_chapters": [],
                "weakest_chapters": [],
                "weakest_level": None,
            },
            "level_breakdown": [],
            "llm_report": "",
            "practice_recommendations": [],
        }

    aggregated = _aggregate_report_data(source)
    fallback_recommendations = _fallback_recommendations(aggregated)

    try:
        client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
        response = await client.chat.completions.create(
            model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
            messages=[
                {"role": "system", "content": REPORT_SYSTEM},
                {
                    "role": "user",
                    "content": "[ASSESSMENT_DATA]\n"
                    + json.dumps(aggregated, ensure_ascii=False),
                },
            ],
            temperature=0.2,
            max_tokens=1200,
        )
        raw = response.choices[0].message.content or ""
        llm_data = _extract_json(raw)
        llm_report = llm_data.get("llm_report", "")
        recommendations = llm_data.get("practice_recommendations") or fallback_recommendations
    except Exception as exc:
        logger.error("Learning report LLM error: %s", exc)
        llm_report = "Báo cáo tự động tạm thời chưa tạo được. Hãy ưu tiên ôn lại các chương có điểm thông thạo thấp nhất."
        recommendations = fallback_recommendations

    return {
        "summary": aggregated["summary"],
        "level_breakdown": aggregated["level_breakdown"],
        "llm_report": llm_report,
        "practice_recommendations": recommendations[:5],
    }


async def generate_report_practice(email: str, recommendation: dict) -> dict:
    report = await generate_learning_report(email)
    chapter = recommendation.get("chapter") or ""
    prompt = recommendation.get("prompt") or recommendation.get("title") or chapter
    level = int(recommendation.get("level") or 1)

    chunks = retrieve_chunks(f"{chapter} {prompt}", top_k=6)
    context = "\n\n---\n\n".join(chunk["text"] for chunk in chunks)
    if not context:
        raise HTTPException(status_code=400, detail="Không tìm thấy ngữ cảnh SGK phù hợp để tạo bài luyện tập.")

    client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
    response = await client.chat.completions.create(
        model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
        messages=[
            {"role": "system", "content": PRACTICE_SYSTEM},
            {
                "role": "user",
                "content": (
                    f"[REPORT_CONTEXT]\n{json.dumps(report, ensure_ascii=False)}\n\n"
                    f"[PRACTICE_REQUEST]\nchapter={chapter}\nlevel={level}\nprompt={prompt}\n\n"
                    f"[CONTEXT]\n{context}"
                ),
            },
        ],
        temperature=0.25,
        max_tokens=2200,
    )

    raw = response.choices[0].message.content or ""
    try:
        quiz = _extract_json(raw)
    except (ValueError, json.JSONDecodeError) as exc:
        logger.error("Report practice JSON parse error: %s - raw: %s", exc, raw[:300])
        raise HTTPException(status_code=500, detail="Không thể tạo bài luyện tập từ báo cáo. Vui lòng thử lại.")

    if "questions" not in quiz:
        raise HTTPException(status_code=500, detail="Bài luyện tập trả về thiếu danh sách câu hỏi.")
    return quiz
