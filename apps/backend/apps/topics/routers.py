
from ninja import Router

from .models import Topic
from .schemas import TopicSchema

topics_router = Router(tags=["topics"])

@topics_router.get("", response=list[TopicSchema], auth=None)
def list_topics(request):
    return Topic.objects.all()
