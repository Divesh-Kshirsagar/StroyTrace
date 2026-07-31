from ninja import NinjaAPI
from ninja.security import HttpBearer
from apps.users.routers import auth_router, channel_router
from apps.topics.routers import topics_router
from apps.events.routers import events_router
from apps.feeds.routers import feeds_router

class AuthBearer(HttpBearer):
    def authenticate(self, request, token):
        return token

api = NinjaAPI(
    title="Clarity API",
    description="Backend API for the Clarity platform",
    version="1.0.0",
)

api.add_router("/auth", auth_router, auth=AuthBearer())
api.add_router("/channels", channel_router)
api.add_router("/topics", topics_router)
api.add_router("/events", events_router, auth=AuthBearer())
api.add_router("/feed", feeds_router)
