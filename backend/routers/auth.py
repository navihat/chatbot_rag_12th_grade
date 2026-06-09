import re
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, field_validator
from services.auth import create_token, hash_password, verify_password
from services.db import create_user, get_user

router = APIRouter()

# Setup email validation regex
EMAIL_REGEX = re.compile(r"^[\w\.-]+@[\w\.-]+\.\w+$")

class AuthRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        v_clean = v.strip().lower()
        if not EMAIL_REGEX.match(v_clean):
            raise ValueError("Định dạng email không hợp lệ.")
        return v_clean

    @field_validator("password")
    @classmethod
    def validate_password_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Mật khẩu phải có ít nhất 6 ký tự.")
        return v

@router.post("/auth/register")
async def register(request: AuthRequest):
    try:
        # Check if user already exists
        existing_user = get_user(request.email)
        if existing_user:
            return JSONResponse(
                status_code=400,
                content={"error": "Email này đã được đăng ký sử dụng."}
            )
        
        # Hash password and store user
        hashed_pw = hash_password(request.password)
        success = create_user(request.email, hashed_pw)
        if not success:
            return JSONResponse(
                status_code=500,
                content={"error": "Không thể tạo tài khoản. Vui lòng thử lại."}
            )
            
        # Create token for immediate login
        token = create_token(request.email)
        return {"token": token}
        
    except ValueError as e:
        return JSONResponse(status_code=400, content={"error": str(e)})

@router.post("/auth/login")
async def login(request: AuthRequest):
    try:
        user = get_user(request.email)
        if not user:
            return JSONResponse(
                status_code=401,
                content={"error": "Tài khoản không tồn tại."}
            )
            
        if not verify_password(request.password, user["password_hash"]):
            return JSONResponse(
                status_code=401,
                content={"error": "Mật khẩu không chính xác."}
            )
            
        token = create_token(request.email)
        return {"token": token}
        
    except ValueError as e:
        return JSONResponse(status_code=400, content={"error": str(e)})
