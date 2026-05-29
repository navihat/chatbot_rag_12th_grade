import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from services.auth import verify_token
from services.quiz import generate_quiz

logger = logging.getLogger(__name__)
router = APIRouter()
_bearer = HTTPBearer()


def _require_auth(credentials: HTTPAuthorizationCredentials = Depends(_bearer)) -> None:
    if not verify_token(credentials.credentials):
        raise HTTPException(status_code=401, detail="Token không hợp lệ hoặc đã hết hạn.")


class QuizRequest(BaseModel):
    question: str


@router.post("/quiz")
async def quiz(request: QuizRequest, _: None = Depends(_require_auth)):
    return await generate_quiz(request.question)
