import logging
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from services.quiz import generate_quiz
from services.db import save_chat_message
from routers.chat import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

class QuizRequest(BaseModel):
    question: str

@router.post("/quiz")
async def quiz(request: QuizRequest, email: str = Depends(get_current_user)):
    # Save user's quiz request to SQLite
    save_chat_message(email, "user", request.question)
    
    # Generate the quiz
    quiz_data = await generate_quiz(request.question)
    
    # Save the generated quiz as assistant's response in history
    save_chat_message(email, "assistant", "", quiz=quiz_data)
    
    return quiz_data
