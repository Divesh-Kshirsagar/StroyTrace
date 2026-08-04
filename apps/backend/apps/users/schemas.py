import uuid
from datetime import datetime

from ninja import Schema
from pydantic import EmailStr, Field

from apps.topics.schemas import TopicSchema


class CreatorProfileSchema(Schema):
    id: uuid.UUID
    handle: str
    display_name: str
    bio: str | None = None
    avatar_url: str | None = None
    banner_url: str | None = None
    social_links: dict
    is_verified: bool
    topics: list[TopicSchema] = []

class UserSchema(Schema):
    id: uuid.UUID
    email: EmailStr
    is_active: bool
    date_joined: datetime
    creator_profile: CreatorProfileSchema

class RegisterRequest(Schema):
    email: EmailStr
    password: str = Field(..., min_length=8)
    handle: str = Field(..., min_length=3, max_length=30, pattern=r"^[a-z0-9_]+$")
    display_name: str = Field(..., min_length=1, max_length=100)

class LoginRequest(Schema):
    email: EmailStr
    password: str

class AuthResponse(Schema):
    user: UserSchema
    access_token: str
    refresh_token: str

class LogoutRequest(Schema):
    refresh_token: str

class RefreshRequest(Schema):
    refresh_token: str

class RefreshResponse(Schema):
    access_token: str

class MessageResponse(Schema):
    message: str

class TopicCurationSchema(Schema):
    topic_slugs: list[str]
