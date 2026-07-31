from ninja import Router
feeds_router = Router(tags=["feeds"])

@feeds_router.get("/home")
def home_feed(request):
    return []
