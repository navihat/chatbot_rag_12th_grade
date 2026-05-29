import json
import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from services.auth import verify_token
from services.rag import generate_answer

logger = logging.getLogger(__name__)
router = APIRouter()
_bearer = HTTPBearer()


def _require_auth(credentials: HTTPAuthorizationCredentials = Depends(_bearer)) -> None:
    if not verify_token(credentials.credentials):
        raise HTTPException(status_code=401, detail="Token không hợp lệ hoặc đã hết hạn.")


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    question: str
    history: list[Message] = []


@router.post("/chat")
async def chat(request: ChatRequest, _: None = Depends(_require_auth)):
    history = [m.model_dump() for m in request.history]

    async def stream():
        try:
            async for chunk in generate_answer(request.question, history):
                yield f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n"
        except Exception as e:
            logger.error(f"Stream error: {e}")
            err = {"delta": "Xin lỗi, có lỗi xảy ra. Vui lòng thử lại."}
            yield f"data: {json.dumps(err, ensure_ascii=False)}\n\n"
        finally:
            yield "data: [DONE]\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")


@router.get("/health")
async def health():
    return {"status": "ok"}
