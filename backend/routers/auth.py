from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from services.auth import create_token, verify_password

router = APIRouter()


class LoginRequest(BaseModel):
    password: str


@router.post("/auth/login")
async def login(request: LoginRequest):
    if not verify_password(request.password):
        return JSONResponse(status_code=401, content={"error": "Mật khẩu không đúng."})
    return {"token": create_token()}
