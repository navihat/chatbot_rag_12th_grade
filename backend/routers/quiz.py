import logging
from fastapi import APIRouter
from pydantic import BaseModel
from services.quiz import generate_quiz

logger = logging.getLogger(__name__)
router = APIRouter()


class QuizRequest(BaseModel):
    question: str


@router.post("/quiz")
async def quiz(request: QuizRequest):
    return await generate_quiz(request.question)
