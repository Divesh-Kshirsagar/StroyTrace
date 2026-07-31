from ninja import Router
topics_router = Router(tags=["topics"])

@topics_router.get("/")
def list_topics(request):
    return []
