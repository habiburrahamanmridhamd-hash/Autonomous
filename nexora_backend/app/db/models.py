from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(40), unique=True, nullable=False)
    display_name = Column(String(80), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(Text, nullable=False)
    bio = Column(Text, default="")
    avatar_url = Column(Text, nullable=True)
    cover_url = Column(Text, nullable=True)
    is_private = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Post(Base):
    __tablename__ = "posts"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    post_type = Column(String(20), default="feed")
    content = Column(Text, nullable=False)
    media_url = Column(Text, nullable=True)
    media_type = Column(String(20), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Community(Base):
    __tablename__ = "communities"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    description = Column(Text, default="")
    privacy = Column(String(20), default="public")
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Message(Base):
    __tablename__ = "messages"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), nullable=False)
    sender_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    message_type = Column(String(20), default="text")
    content = Column(Text, nullable=False)
    media_url = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
