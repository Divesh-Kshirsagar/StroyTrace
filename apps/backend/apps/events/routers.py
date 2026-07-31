from ninja import Router
events_router = Router(tags=["events"])

@events_router.get("/")
def list_events(request):
    return []
