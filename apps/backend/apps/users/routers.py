from ninja import Router
from ninja.errors import HttpError
from django.contrib.auth import authenticate
from django.conf import settings
from datetime import datetime, timedelta, timezone
import jwt
from django_ratelimit.decorators import ratelimit

from .models import User, CreatorProfile
from .schemas import (
    RegisterRequest, AuthResponse, LoginRequest, LogoutRequest, 
    RefreshRequest, RefreshResponse, MessageResponse, UserSchema,
    TopicCurationSchema
)
from apps.topics.schemas import TopicSchema
from apps.topics.models import Topic
from core.auth import AuthBearer

auth_router = Router(tags=["auth"])
channels_router = Router(tags=["channels"])

def create_access_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=15),
        "iat": datetime.now(timezone.utc),
        "type": "access"
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")

def create_refresh_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "iat": datetime.now(timezone.utc),
        "type": "refresh"
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")

@auth_router.post("/register", response=AuthResponse, auth=None)
@ratelimit(key='ip', rate='3/h', block=True)
def register(request, payload: RegisterRequest):
    email = payload.email.lower()
    if User.objects.filter(email=email).exists():
        raise HttpError(400, "Email already exists")
    if CreatorProfile.objects.filter(handle=payload.handle).exists():
        raise HttpError(400, "Handle already exists")

    # Check for reserved words
    reserved = ["admin", "api", "feed", "search", "auth"]
    if payload.handle in reserved:
        raise HttpError(400, "Handle is reserved")

    user = User.objects.create_user(
        email=email,
        password=payload.password
    )
    CreatorProfile.objects.create(
        user=user,
        handle=payload.handle,
        display_name=payload.display_name
    )

    return AuthResponse(
        user=user,
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id))
    )

@auth_router.post("/login", response=AuthResponse, auth=None)
@ratelimit(key='ip', rate='5/15m', block=True)
def login(request, payload: LoginRequest):
    email = payload.email.lower()
    user = authenticate(email=email, password=payload.password)
    if not user:
        raise HttpError(401, "Invalid credentials")
    
    user.last_login = datetime.now(timezone.utc)
    user.save(update_fields=['last_login'])

    return AuthResponse(
        user=user,
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id))
    )

@auth_router.post("/refresh", response=RefreshResponse, auth=None)
def refresh(request, payload: RefreshRequest):
    try:
        decoded = jwt.decode(payload.refresh_token, settings.SECRET_KEY, algorithms=["HS256"])
        if decoded.get("type") != "refresh":
            raise HttpError(401, "Invalid token type")
        
        user_id = decoded.get("user_id")
        if not User.objects.filter(id=user_id, is_active=True).exists():
            raise HttpError(401, "User inactive or deleted")

        return RefreshResponse(access_token=create_access_token(user_id))
    except jwt.ExpiredSignatureError:
        raise HttpError(401, "Refresh token expired")
    except jwt.InvalidTokenError:
        raise HttpError(401, "Invalid token")

@auth_router.post("/logout", response=MessageResponse, auth=AuthBearer())
def logout(request, payload: LogoutRequest):
    return MessageResponse(message="Logged out")

@auth_router.get("/me", response=UserSchema, auth=AuthBearer())
def me(request):
    return request.auth

@channels_router.get("/me", response=UserSchema, auth=AuthBearer())
def my_channel(request):
    return request.auth

from django.shortcuts import get_object_or_404
from .schemas import CreatorProfileSchema

@channels_router.get("/{handle}", response=CreatorProfileSchema, auth=None)
def get_channel(request, handle: str):
    profile = get_object_or_404(CreatorProfile, handle=handle)
    profile_dict = {
        "id": profile.id,
        "handle": profile.handle,
        "display_name": profile.display_name,
        "bio": profile.bio,
        "avatar_url": profile.avatar_url,
        "banner_url": profile.banner_url,
        "social_links": profile.social_links,
        "is_verified": profile.is_verified,
        "topics": list(profile.topics.all())
    }
    return profile_dict

from typing import List

@channels_router.get("/me/topics", response=List[TopicSchema], auth=AuthBearer())
def get_my_topics(request):
    profile = request.auth.creator_profile
    return list(profile.topics.all())

@channels_router.post("/me/topics", response=MessageResponse, auth=AuthBearer())
def set_my_topics(request, payload: TopicCurationSchema):
    profile = request.auth.creator_profile
    topics = Topic.objects.filter(slug__in=payload.topic_slugs)
    profile.topics.set(topics)
    return MessageResponse(message="Success")
