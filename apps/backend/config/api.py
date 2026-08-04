from ninja import NinjaAPI

from apps.events.creator_routers import creator_events_router
from apps.events.routers import events_router
from apps.feeds.routers import feeds_router, interact_router
from apps.topics.routers import topics_router
from apps.users.routers import auth_router, channels_router
from core.auth import AuthBearer

api = NinjaAPI(
    title="Clarity API",
    description="Backend API for the Clarity platform",
    version="1.0.0",
)

from django_ratelimit.exceptions import Ratelimited


@api.exception_handler(Ratelimited)
def ratelimited_handler(request, exc):
    response = api.create_response(request, {"detail": "Too many requests. Please try again later."}, status=429)
    response['Retry-After'] = '900'
    return response

api.add_router("/auth", auth_router)
api.add_router("/channels", channels_router)
api.add_router("/topics", topics_router)
# NOTE: events_router has individual endpoints with auth=None for public reads
# (search, get_event). Applying router-level AuthBearer() here would override
# those individual auth=None settings in older Ninja versions and block
# anonymous reads. We handle per-endpoint auth inside the router itself.
api.add_router("/events", events_router)
api.add_router("/creator/events", creator_events_router, auth=AuthBearer())
api.add_router("/feed", feeds_router)
api.add_router("/feed", interact_router)
