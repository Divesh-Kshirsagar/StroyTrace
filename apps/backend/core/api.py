from ninja import NinjaAPI
from api.routers import topic_router, event_router, feed_router, channel_router

api = NinjaAPI(
    title="Clarity API",
    description="Backend API for the Clarity platform",
    version="1.0.0"
)

api.add_router("/topics", topic_router)
api.add_router("/events", event_router)
api.add_router("/feed", feed_router)
api.add_router("/channels", channel_router)

@api.get("/health")
def health(request):
    return {"status": "ok"}
