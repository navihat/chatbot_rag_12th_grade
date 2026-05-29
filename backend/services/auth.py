import os
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv
from jose import JWTError, jwt

load_dotenv()

SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me")
APP_PASSWORD: str = os.getenv("APP_PASSWORD", "hoa12")
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 24


def verify_password(password: str) -> bool:
    return password == APP_PASSWORD


def create_token() -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS)
    return jwt.encode({"exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> bool:
    try:
        jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return True
    except JWTError:
        return False
