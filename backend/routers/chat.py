import json
import logging
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from services.auth import verify_token
from services.rag import generate_answer
from services.db import save_chat_message, get_chat_history, clear_chat_history

logger = logging.getLogger(__name__)
router = APIRouter()
_bearer = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(_bearer)) -> str:
    """Dependency to extract user email from the JWT token."""
    payload = verify_token(credentials.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Token không hợp lệ hoặc đã hết hạn.")
    return payload["sub"]

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    question: str
    history: list[Message] = []

@router.post("/chat")
async def chat(request: ChatRequest, email: str = Depends(get_current_user)):
    # Save the user's question immediately to the SQLite database
    save_chat_message(email, "user", request.question)
    
    history = [m.model_dump() for m in request.history]

    async def stream():
        full_text = ""
        all_sources = []
        try:
            async for chunk in generate_answer(request.question, history):
                if "delta" in chunk:
                    full_text += chunk["delta"]
                if "sources" in chunk:
                    all_sources.extend(chunk["sources"])
                yield f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n"
            
            # Once streaming completes successfully, save the assistant's answer
            save_chat_message(email, "assistant", full_text, sources=all_sources)
            
        except Exception as e:
            logger.error(f"Stream error: {e}")
            err = {"delta": "Xin lỗi, có lỗi xảy ra. Vui lòng thử lại."}
            yield f"data: {json.dumps(err, ensure_ascii=False)}\n\n"
        finally:
            yield "data: [DONE]\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")

@router.get("/chat/history")
async def chat_history(email: str = Depends(get_current_user)):
    """Retrieve persistent chat history for the logged-in user."""
    return get_chat_history(email)

@router.post("/chat/history/clear")
async def clear_history(email: str = Depends(get_current_user)):
    """Clear chat history for the logged-in user."""
    clear_chat_history(email)
    return {"status": "ok"}

@router.get("/health")
async def health():
    return {"status": "ok"}
