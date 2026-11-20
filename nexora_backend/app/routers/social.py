import os
import uuid
from fastapi import APIRouter, Depends, File, UploadFile
from pydantic import BaseModel
from sqlalchemy import desc, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from ..core.config import settings
from ..db.database import get_db
from ..db.models import Community, Message, Post, User
from .auth import get_current_user

router = APIRouter(tags=["Social"])

class PostCreate(BaseModel):
    content: str
    post_type: str = "feed"
    media_url: str | None = None

class ProfileUpdate(BaseModel):
    display_name: str | None = None
    bio: str | None = None
    is_private: bool | None = None

@router.get("/users/me")
async def get_me(user: User = Depends(get_current_user)):
    return {
        "id": str(user.id),
        "username": user.username,
        "display_name": user.display_name,
        "email": user.email,
        "bio": user.bio,
        "avatar_url": user.avatar_url,
        "cover_url": user.cover_url,
        "is_private": user.is_private,
    }

@router.patch("/users/me")
async def update_me(body: ProfileUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if body.display_name is not None:
        user.display_name = body.display_name
    if body.bio is not None:
        user.bio = body.bio
    if body.is_private is not None:
        user.is_private = body.is_private
    await db.commit()
    return {"status": "updated"}

@router.delete("/users/me")
async def delete_me(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.delete(user)
    await db.commit()
    return {"status": "deleted"}

@router.get("/posts")
async def list_posts(mode: str = "personalized", db: AsyncSession = Depends(get_db)):
    stmt = select(Post).order_by(desc(Post.created_at)).limit(50)
    if mode == "pulse":
        stmt = select(Post).where(Post.post_type == "pulse").order_by(desc(Post.created_at)).limit(50)
    res = await db.execute(stmt)
    posts = res.scalars().all()
    return [
        {
            "id": str(p.id),
            "author_id": str(p.author_id),
            "post_type": p.post_type,
            "content": p.content,
            "media_url": p.media_url,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        }
        for p in posts
    ]

@router.post("/posts")
async def create_post(body: PostCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    post = Post(author_id=user.id, post_type=body.post_type, content=body.content, media_url=body.media_url)
    db.add(post)
    await db.commit()
    await db.refresh(post)
    return {"id": str(post.id), "status": "created"}

@router.post("/posts/{post_id}/like")
async def like_post(post_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.execute(
        text("INSERT INTO post_likes (post_id, user_id) VALUES (:pid, :uid) ON CONFLICT DO NOTHING"),
        {"pid": post_id, "uid": str(user.id)},
    )
    await db.commit()
    return {"status": "liked"}

@router.post("/posts/{post_id}/save")
async def save_post(post_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.execute(
        text("INSERT INTO post_saves (post_id, user_id) VALUES (:pid, :uid) ON CONFLICT DO NOTHING"),
        {"pid": post_id, "uid": str(user.id)},
    )
    await db.commit()
    return {"status": "saved"}

@router.get("/communities")
async def list_communities(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Community).order_by(desc(Community.created_at)))
    return [{"id": str(c.id), "name": c.name, "description": c.description, "privacy": c.privacy} for c in res.scalars().all()]

@router.get("/messages/{conversation_id}")
async def get_messages(conversation_id: str, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    res = await db.execute(select(Message).where(Message.conversation_id == conversation_id).order_by(Message.created_at))
    return [{"id": str(m.id), "content": m.content, "message_type": m.message_type, "sender_id": str(m.sender_id)} for m in res.scalars().all()]

@router.post("/media/upload")
async def upload_media(file: UploadFile = File(...), _: User = Depends(get_current_user)):
    os.makedirs(settings.media_root, exist_ok=True)
    ext = os.path.splitext(file.filename or "")[1]
    filename = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(settings.media_root, filename)
    with open(path, "wb") as f:
        f.write(await file.read())
    return {"url": f"/media/{filename}"}
