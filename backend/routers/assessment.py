import logging
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from routers.chat import get_current_user
from services.assessment import (
    generate_assessment_questions,
    evaluate_assessment_submission,
    get_user_mastery
)

logger = logging.getLogger(__name__)
router = APIRouter()

class SubmitRequest(BaseModel):
    chapter: str
    answers: dict[str, str] # question_id -> user answer ("A", "B", "C", "D")
    response_times: dict[str, float] # question_id -> time in seconds

@router.get("/assessment/chapter/questions")
async def get_chapter_questions(
    chapter: str = Query(..., description="Tên chương học để tạo câu hỏi"),
    email: str = Depends(get_current_user)
):
    return await generate_assessment_questions(chapter, email)

@router.post("/assessment/chapter/submit")
async def submit_chapter_assessment(
    request: SubmitRequest,
    email: str = Depends(get_current_user)
):
    return await evaluate_assessment_submission(
        email=email,
        chapter=request.chapter,
        answers=request.answers,
        response_times=request.response_times
    )

@router.get("/assessment/mastery")
async def get_mastery(email: str = Depends(get_current_user)):
    """Retrieve all chapter masteries for the user."""
    return get_user_mastery(email)
