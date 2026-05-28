import os
import json
import logging
import re
from groq import AsyncGroq
from dotenv import load_dotenv
from services.vectorstore import query_chunks
from services.embeddings import embed_query

load_dotenv()
logger = logging.getLogger(__name__)

MIN_SCORE = 0.35

QUIZ_SYSTEM = """Bạn là giáo viên Hóa học lớp 12. Tạo câu hỏi trắc nghiệm dựa HOÀN TOÀN vào nội dung [CONTEXT] bên dưới.

Quy tắc bắt buộc:
1. Chỉ dùng thông tin từ [CONTEXT]. Không bịa thêm.
2. Mỗi câu có đúng 4 lựa chọn A, B, C, D. Chỉ 1 đáp án đúng.
3. Giải thích ngắn gọn tại sao đáp án đúng (dẫn từ SGK).
4. Trả về ĐÚNG JSON schema sau, không thêm bất kỳ text nào khác ngoài JSON.

JSON schema:
{
  "topic": "<chủ đề>",
  "questions": [
    {
      "id": 1,
      "question": "<nội dung câu hỏi>",
      "options": {"A": "<..>", "B": "<..>", "C": "<..>", "D": "<..>"},
      "correct": "A",
      "explanation": "<giải thích ngắn>"
    }
  ]
}"""


async def generate_quiz(question: str) -> dict:
    embedding = embed_query(question)
    top_k = int(os.getenv("TOP_K", "5"))
    chunks = query_chunks(embedding, top_k=top_k)
    relevant = [c for c in chunks if c["score"] >= MIN_SCORE]

    if not relevant:
        return {"error": "Không tìm thấy nội dung SGK phù hợp để tạo câu hỏi. Hãy thử chủ đề khác."}

    context = "\n\n---\n\n".join(c["text"] for c in relevant)

    client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
    response = await client.chat.completions.create(
        model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
        messages=[
            {"role": "system", "content": QUIZ_SYSTEM},
            {"role": "user", "content": f"[CONTEXT]\n{context}\n\n[YÊU CẦU]\n{question}"},
        ],
        temperature=0.3,
        max_tokens=2048,
    )

    raw = response.choices[0].message.content or ""
    match = re.search(r"\{[\s\S]+\}", raw)
    if not match:
        logger.error(f"LLM returned non-JSON: {raw[:300]}")
        return {"error": "Không thể tạo câu hỏi. Vui lòng thử lại."}

    try:
        return json.loads(match.group())
    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error: {e} — raw: {raw[:300]}")
        return {"error": "Không thể tạo câu hỏi. Vui lòng thử lại."}
