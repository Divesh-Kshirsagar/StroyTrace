from ninja import Router, Schema

from apps.feeds.schemas import PaginatedEventSummarySchema
from core.pagination import paginate_queryset

from .models import Event

creator_events_router = Router(tags=["creator-events"])

class DraftsCountSchema(Schema):
    count: int

@creator_events_router.get("", response=PaginatedEventSummarySchema)
def list_creator_events(request, status: str | None = None, cursor: str | None = None, limit: int = 20):
    events = Event.objects.filter(lead_investigator=request.auth).select_related(
        'lead_investigator', 'lead_investigator__creator_profile'
    ).prefetch_related('topics', 'evidence_set')
    
    if status:
        events = events.filter(status=status)
        
    return paginate_queryset(events, cursor, limit)

@creator_events_router.get("/drafts/count", response=DraftsCountSchema)
def get_drafts_count(request):
    count = Event.objects.filter(lead_investigator=request.auth, status="draft").count()
    return {"count": count}
