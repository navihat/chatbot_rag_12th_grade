import os
import logging
from typing import AsyncGenerator
from groq import AsyncGroq
from dotenv import load_dotenv
from services.vectorstore import query_chunks
from services.embeddings import embed_query

load_dotenv()
logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Bạn là trợ lý học tập môn Hóa học lớp 12, chỉ trả lời dựa trên nội dung Sách Giáo Khoa trong [CONTEXT] bên dưới.

Quy tắc bắt buộc:
1. Chỉ sử dụng thông tin từ [CONTEXT]. Không bổ sung kiến thức bên ngoài.
2. Nếu [CONTEXT] không đủ thông tin, chỉ trả lời đúng câu: "Câu hỏi này nằm ngoài nội dung SGK Hóa học 12 mà tôi được cung cấp. Bạn có thể hỏi câu khác không?"
3. Trả lời bằng tiếng Việt, ngắn gọn, rõ ràng, phù hợp học sinh lớp 12.
4. Viết công thức hóa học đúng: H₂SO₄, HNO₃, NaOH (không viết H2SO4)."""

MIN_SCORE = 0.35


async def generate_answer(
    question: str,
    history: list[dict],
) -> AsyncGenerator[dict, None]:
    embedding = embed_query(question)
    top_k = int(os.getenv("TOP_K", "5"))
    chunks = query_chunks(embedding, top_k=top_k)
    relevant = [c for c in chunks if c["score"] >= MIN_SCORE]

    if not relevant:
        yield {"delta": "Câu hỏi này nằm ngoài nội dung SGK Hóa học 12 mà tôi được cung cấp. Bạn có thể hỏi câu khác không?"}
        yield {"sources": []}
        return

    context = "\n\n---\n\n".join(c["text"] for c in relevant)
    sources = [c["metadata"] for c in relevant]

    client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))

    messages: list[dict] = [{"role": "system", "content": SYSTEM_PROMPT}]
    for msg in history[-6:]:
        messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({
        "role": "user",
        "content": f"[CONTEXT]\n{context}\n\n[CÂU HỎI]\n{question}",
    })

    stream = await client.chat.completions.create(
        model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
        messages=messages,
        stream=True,
        temperature=0.1,
        max_tokens=1024,
    )

    async for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield {"delta": delta}

    yield {"sources": sources}
