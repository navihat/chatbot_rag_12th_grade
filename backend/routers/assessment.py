import re
import os
import json
import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from services.auth import verify_token
from services.db import (
    save_active_diagnostic,
    get_active_diagnostic,
    save_chapter_mastery,
    get_all_chapter_mastery,
    save_assessment_detail
)
from services.embeddings import embed_query
from services.vectorstore import query_chunks
from routers.chat import get_current_user
from groq import AsyncGroq

logger = logging.getLogger(__name__)
router = APIRouter()

DIAGNOSTIC_SYSTEM = """Bạn là giáo viên Hóa học lớp 12. Tạo đề đánh giá năng lực gồm ĐÚNG 10 câu hỏi trắc nghiệm dựa HOÀN TOÀN vào nội dung [CONTEXT] bên dưới.

Yêu cầu cấu trúc đề bắt buộc:
1. Đề thi phải có đúng 10 câu hỏi trắc nghiệm, mỗi câu có 4 lựa chọn A, B, C, D và duy nhất 1 đáp án đúng.
2. Phân tầng cấp độ nhận thức chính xác:
   - 4 câu Nhận biết (Cấp độ 1 - câu hỏi nền tảng, ghi nhớ nhanh).
   - 3 câu Thông hiểu (Cấp độ 2 - câu hỏi giải thích tính chất, khái niệm).
   - 3 câu Vận dụng (Cấp độ 3 - câu hỏi liên quan đến đời sống, thực tiễn, thí nghiệm).
3. Đề thi chỉ hỏi về lý thuyết của chủ đề [CHAPTER_TOPIC] được yêu cầu.
4. Trả về đúng JSON định dạng sau, tuyệt đối không thêm bớt bất kỳ ký tự nào khác ngoài JSON:

{
  "questions": [
    {
      "id": 1,
      "chapter": "<Tên chương học tương ứng>",
      "level": 1, 
      "level_name": "<Tên cấp độ: Nhận biết, Thông hiểu hoặc Vận dụng>",
      "question": "<Nội dung câu hỏi>",
      "options": {"A": "<Lựa chọn A>", "B": "<Lựa chọn B>", "C": "<Lựa chọn C>", "D": "<Lựa chọn D>"},
      "correct": "A",
      "explanation": "<Giải thích ngắn gọn lý do chọn đáp án này theo SGK>"
    }
  ]
}"""

class SubmitRequest(BaseModel):
    chapter: str
    answers: dict[str, str] # question_id -> user answer ("A", "B", "C", "D")
    response_times: dict[str, float] # question_id -> time in seconds

@router.get("/assessment/chapter/questions")
async def get_chapter_questions(
    chapter: str = Query(..., description="Tên chương học để tạo câu hỏi"),
    email: str = Depends(get_current_user)
):
    try:
        # Retrieve contexts from ChromaDB specifically for this chapter
        embedding = embed_query(chapter)
        # Fetch top 8 chunks to have enough context for 10 distinct questions
        chunks = query_chunks(embedding, top_k=8)
        context = "\n\n---\n\n".join(c["text"] for c in chunks)
        
        if not context:
            raise HTTPException(status_code=400, detail="Không tìm thấy nội dung SGK phù hợp để tạo đề thi.")
            
        client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
        response = await client.chat.completions.create(
            model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
            messages=[
                {"role": "system", "content": DIAGNOSTIC_SYSTEM},
                {"role": "user", "content": f"[CHAPTER_TOPIC]\n{chapter}\n\n[CONTEXT]\n{context}"},
            ],
            temperature=0.3,
            max_tokens=3000,
        )
        
        raw = response.choices[0].message.content or ""
        match = re.search(r"\{[\s\S]+\}", raw)
        if not match:
            logger.error(f"LLM returned non-JSON for diagnostic: {raw[:300]}")
            raise HTTPException(status_code=500, detail="Lỗi tạo đề thi tự động. Vui lòng thử lại.")
            
        try:
            quiz_data = json.loads(match.group())
            questions = quiz_data.get("questions", [])
            if len(questions) != 10:
                logger.warning(f"LLM generated {len(questions)} instead of 10 questions")
                
            # Cache the complete questions (with answers) in SQLite for server-side grading
            save_active_diagnostic(email, json.dumps(questions, ensure_ascii=False))
            
            # Strip correct answers and explanations before sending to client to prevent cheating
            client_questions = []
            for q in questions:
                client_q = q.copy()
                client_q.pop("correct", None)
                client_q.pop("explanation", None)
                client_questions.append(client_q)
                
            return {"questions": client_questions}
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error in diagnostic: {e} — raw: {raw[:300]}")
            raise HTTPException(status_code=500, detail="Lỗi phân tích cú pháp đề thi. Vui lòng thử lại.")
            
    except Exception as e:
        logger.error(f"Error in get_chapter_questions: {e}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/assessment/chapter/submit")
async def submit_chapter_assessment(request: SubmitRequest, email: str = Depends(get_current_user)):
    # Load correct questions from cache
    raw_questions = get_active_diagnostic(email)
    if not raw_questions:
        raise HTTPException(status_code=400, detail="Không tìm thấy bài thi đang hoạt động. Vui lòng làm lại.")
        
    questions = json.loads(raw_questions)
    
    correctness = []
    correct_answers = {}
    explanations = {}
    
    # Calculate correctness list
    for q in questions:
        q_id_str = str(q["id"])
        user_ans = request.answers.get(q_id_str, "").strip().upper()
        correct_ans = q["correct"].strip().upper()
        
        is_correct = 1 if user_ans == correct_ans else 0
        correctness.append(is_correct)
        
        correct_answers[q_id_str] = correct_ans
        explanations[q_id_str] = q["explanation"]
        
    # Calculate max consecutive correct answers (streak)
    max_streak = 0
    curr_streak = 0
    for val in correctness:
        if val == 1:
            curr_streak += 1
            max_streak = max(max_streak, curr_streak)
        else:
            curr_streak = 0
            
    # Calculate average difficulty weight of all correct answers
    # Level 1: 1.0, Level 2: 1.5, Level 3: 2.0
    correct_weights = []
    for i, q in enumerate(questions):
        if correctness[i] == 1:
            level = q.get("level", 1)
            weight = 1.0 if level == 1 else 1.5 if level == 2 else 2.0
            correct_weights.append(weight)
            
    avg_difficulty = sum(correct_weights) / len(correct_weights) if correct_weights else 1.0
    
    # Calculate average response time (in seconds)
    avg_response_time = sum(request.response_times.values()) / len(request.response_times) if request.response_times else 15.0
    
    # Mastery Score formula: (streak * avg_difficulty * 50) / Max(5.0, avg_response_time)
    if max_streak == 0:
        score = 0.0
    else:
        score = (max_streak * avg_difficulty * 50) / max(5.0, avg_response_time)
        score = min(100.0, max(0.0, score))
        
    # Round score to 1 decimal place
    score = round(score, 1)
    
    # Determine competency status
    if score >= 80.0:
        status = "Expert"
    elif score >= 50.0:
        status = "Proficient"
    else:
        status = "Novice"
        
    # Save results to chapter_mastery table
    save_chapter_mastery(email, request.chapter, score, status)
    
    # Save details of each question to chapter_assessment_details
    for i, q in enumerate(questions):
        q_id_str = str(q["id"])
        level = q.get("level", 1)
        resp_time = request.response_times.get(q_id_str, 15.0)
        save_assessment_detail(email, request.chapter, level, correctness[i], resp_time)
        
    return {
        "score": score,
        "status": status,
        "correctness": correctness,
        "correct_answers": correct_answers,
        "explanations": explanations
    }

@router.get("/assessment/mastery")
async def get_mastery(email: str = Depends(get_current_user)):
    """Retrieve all chapter masteries for the user."""
    return get_all_chapter_mastery(email)
