from ninja import NinjaAPI
from ninja.security import HttpBearer
from apps.users.routers import auth_router, channels_router
from apps.topics.routers import topics_router
from apps.events.routers import events_router
from apps.feeds.routers import feeds_router

from core.auth import AuthBearer

api = NinjaAPI(
    title="Clarity API",
    description="Backend API for the Clarity platform",
    version="1.0.0",
)

api.add_router("/auth", auth_router)
api.add_router("/channels", channels_router)
api.add_router("/topics", topics_router)
api.add_router("/events", events_router, auth=AuthBearer())
api.add_router("/feed", feeds_router)
