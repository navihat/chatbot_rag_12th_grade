from fastapi import APIRouter, Depends
from pydantic import BaseModel

from routers.chat import get_current_user
from services.learning_report import generate_learning_report, generate_report_practice

router = APIRouter()


class PracticeRecommendationRequest(BaseModel):
    id: str | None = None
    chapter: str
    level: int = 1
    title: str | None = None
    prompt: str


@router.get("/learning-report")
async def get_learning_report(email: str = Depends(get_current_user)):
    return await generate_learning_report(email)


@router.post("/learning-report/practice")
async def create_learning_report_practice(
    request: PracticeRecommendationRequest,
    email: str = Depends(get_current_user),
):
    return await generate_report_practice(email, request.model_dump())
