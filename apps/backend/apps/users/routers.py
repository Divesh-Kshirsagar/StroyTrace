from ninja import Router
auth_router = Router(tags=["auth"])
channel_router = Router(tags=["channels"])

@auth_router.get("/me")
def get_me(request):
    return {"id": "dummy"}

@channel_router.get("/{handle}")
def get_channel(request, handle: str):
    return {"handle": handle}
