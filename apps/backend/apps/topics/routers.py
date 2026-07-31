from ninja import Router
from .models import Topic
from .schemas import TopicSchema
from typing import List

topics_router = Router(tags=["topics"])

@topics_router.get("", response=List[TopicSchema], auth=None)
def list_topics(request):
    return Topic.objects.all()
