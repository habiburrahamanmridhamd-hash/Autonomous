from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, Header
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ..core.config import settings
from ..core.security import create_token, hash_password, verify_password
from ..db.database import get_db
from ..db.models import User

router = APIRouter(prefix="/auth", tags=["Auth"])

class RegisterReq(BaseModel):
    username: str
    display_name: str
    email: EmailStr
    password: str

class LoginReq(BaseModel):
    email: EmailStr
    password: str

class RefreshReq(BaseModel):
    refresh_token: str

async def get_current_user(authorization: str = Header(None), db: AsyncSession = Depends(get_db)) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id = payload.get("sub")
        res = await db.execute(select(User).where(User.id == user_id))
        user = res.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.post("/register")
async def register(body: RegisterReq, db: AsyncSession = Depends(get_db)):
    exists = await db.execute(select(User).where((User.email == body.email) | (User.username == body.username)))
    if exists.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email or username already exists")
    user = User(
        username=body.username,
        display_name=body.display_name,
        email=body.email,
        password_hash=hash_password(body.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return {
        "access_token": create_token(str(user.id), "access", timedelta(minutes=settings.access_token_expire_minutes)),
        "refresh_token": create_token(str(user.id), "refresh", timedelta(days=settings.refresh_token_expire_days)),
        "user": {"id": str(user.id), "username": user.username, "display_name": user.display_name, "email": user.email},
    }

@router.post("/login")
async def login(body: LoginReq, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(User).where(User.email == body.email))
    user = res.scalar_one_or_none()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {
        "access_token": create_token(str(user.id), "access", timedelta(minutes=settings.access_token_expire_minutes)),
        "refresh_token": create_token(str(user.id), "refresh", timedelta(days=settings.refresh_token_expire_days)),
        "user": {"id": str(user.id), "username": user.username, "display_name": user.display_name, "email": user.email},
    }

@router.post("/refresh")
async def refresh(body: RefreshReq):
    try:
        payload = jwt.decode(body.refresh_token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        sub = payload["sub"]
        return {
            "access_token": create_token(sub, "access", timedelta(minutes=settings.access_token_expire_minutes)),
            "refresh_token": create_token(sub, "refresh", timedelta(days=settings.refresh_token_expire_days)),
        }
    except JWTError:
        raise HTTPException(status_code=401, detail="Expired refresh token")
