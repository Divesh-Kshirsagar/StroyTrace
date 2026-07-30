from ninja import Router
from typing import List
from .models import Topic, Event, CreatorProfile
from .schemas import TopicSchema, EventSchema, CreatorProfileSchema

topic_router = Router(tags=["Topics"])
event_router = Router(tags=["Events"])
feed_router = Router(tags=["Feeds"])
channel_router = Router(tags=["Channels"])

@topic_router.get("/", response=List[TopicSchema])
def list_topics(request):
    return Topic.objects.all()

@topic_router.get("/{slug}", response=TopicSchema)
def get_topic(request, slug: str):
    return Topic.objects.get(slug=slug)

@feed_router.get("/home", response=List[EventSchema])
def home_feed(request):
    return Event.objects.all().order_by("-created_at")[:20]

@channel_router.get("/{handle}", response=CreatorProfileSchema)
def get_channel(request, handle: str):
    return CreatorProfile.objects.get(handle=handle)
