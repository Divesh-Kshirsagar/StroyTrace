from pydantic import BaseModel, EmailStr, Field
from typing import Optional
import uuid
from datetime import datetime

class CreatorProfileSchema(BaseModel):
    id: uuid.UUID
    handle: str
    display_name: str
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    banner_url: Optional[str] = None
    social_links: dict
    is_verified: bool

class UserSchema(BaseModel):
    id: uuid.UUID
    email: EmailStr
    is_active: bool
    date_joined: datetime
    creator_profile: CreatorProfileSchema

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    handle: str = Field(..., min_length=3, max_length=30, pattern=r"^[a-z0-9_]+$")
    display_name: str = Field(..., min_length=1, max_length=100)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class AuthResponse(BaseModel):
    user: UserSchema
    access_token: str
    refresh_token: str

class LogoutRequest(BaseModel):
    refresh_token: str

class RefreshRequest(BaseModel):
    refresh_token: str

class RefreshResponse(BaseModel):
    access_token: str

class MessageResponse(BaseModel):
    message: str
