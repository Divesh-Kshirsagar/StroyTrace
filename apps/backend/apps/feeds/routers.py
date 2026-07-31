from ninja import Router
from typing import Optional
from django.db.models import Prefetch

from apps.events.models import Event
from core.pagination import paginate_queryset
from .schemas import PaginatedEventSummarySchema

feeds_router = Router(tags=["feeds"])

def get_base_queryset():
    return Event.objects.filter(status='published').select_related(
        'lead_investigator', 'lead_investigator__creator_profile'
    ).prefetch_related('topics', 'evidence_set')

@feeds_router.get("/home", response=PaginatedEventSummarySchema)
def home_feed(request, cursor: Optional[str] = None, limit: int = 20):
    qs = get_base_queryset()
    return paginate_queryset(qs, cursor, limit)

@feeds_router.get("/topic/{slug}", response=PaginatedEventSummarySchema)
def topic_feed(request, slug: str, cursor: Optional[str] = None, limit: int = 20):
    qs = get_base_queryset().filter(topics__slug=slug)
    return paginate_queryset(qs, cursor, limit)

@feeds_router.get("/channel/{handle}", response=PaginatedEventSummarySchema)
def channel_feed(request, handle: str, cursor: Optional[str] = None, limit: int = 20):
    qs = get_base_queryset().filter(lead_investigator__creator_profile__handle=handle)
    return paginate_queryset(qs, cursor, limit)

# Add search here as well to cleanly expose it under /feed/search if we want,
# but the prompt asked for /search. I'll just use the /events/search or /search via api.py.
