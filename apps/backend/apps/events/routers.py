from typing import List
from django.shortcuts import get_object_or_404
from django.utils.text import slugify
from django.db import transaction
from django.db.models import Q
from ninja import Router
from ninja.errors import HttpError
import uuid

from .models import Event, Narrative, Evidence
from apps.topics.models import Topic
from .schemas import (
    EventSchema,
    EventCreateSchema,
    EventUpdateSchema,
    EventFullSchema,
    NarrativeSchema,
    NarrativeCreateUpdateSchema,
    EvidenceSchema,
    EvidenceCreateSchema,
    EvidenceUpdateSchema,
    MessageSchema
)

events_router = Router(tags=["events"])

def get_event_or_404(slug: str):
    return get_object_or_404(Event, slug=slug)

def require_lead_investigator(request, event):
    if event.lead_investigator != request.user:
        raise HttpError(403, "Only the lead investigator can modify this event")

@events_router.post("/", response=EventSchema)
def create_event(request, data: EventCreateSchema):
    with transaction.atomic():
        base_slug = slugify(data.title)
        slug = base_slug
        if Event.objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{str(uuid.uuid4())[:8]}"
            
        event = Event.objects.create(
            title=data.title,
            slug=slug,
            summary=data.summary,
            start_date=data.start_date,
            end_date=data.end_date,
            lead_investigator=request.user
        )
        
        if data.topic_slugs:
            topics = Topic.objects.filter(slug__in=data.topic_slugs)
            event.topics.set(topics)
            
        return event

from typing import Optional
from apps.feeds.schemas import PaginatedEventSummarySchema
from core.pagination import paginate_queryset

@events_router.get("/search", response=PaginatedEventSummarySchema, auth=None)
def search_events(request, q: str = "", topic: str = "", status: str = "published", cursor: Optional[str] = None, limit: int = 20):
    events = Event.objects.filter(status=status).select_related(
        'lead_investigator', 'lead_investigator__creator_profile'
    ).prefetch_related('topics', 'evidence_set')
    
    if q:
        terms = q.split()
        for term in terms:
            events = events.filter(Q(title__icontains=term) | Q(summary__icontains=term) | Q(narrative__content__icontains=term))
            
    if topic:
        events = events.filter(topics__slug=topic)
        
    return paginate_queryset(events, cursor, limit)

@events_router.get("/{slug}", response=EventFullSchema, auth=None)
def get_event(request, slug: str):
    event = get_event_or_404(slug)
    narrative = getattr(event, 'narrative', None)
    if narrative and not narrative.is_published:
        # Check if user is lead investigator, else hide narrative
        if not hasattr(request, 'user') or event.lead_investigator != request.user:
            narrative = None
            
    return {
        "event": event,
        "narrative": narrative,
        "evidence": list(event.evidence_set.all())
    }

@events_router.put("/{slug}", response=EventSchema)
def update_event(request, slug: str, data: EventUpdateSchema):
    event = get_event_or_404(slug)
    require_lead_investigator(request, event)
    
    for attr, value in data.dict(exclude_unset=True).items():
        setattr(event, attr, value)
    event.save()
    return event

@events_router.delete("/{slug}", response=MessageSchema)
def delete_event(request, slug: str):
    event = get_event_or_404(slug)
    require_lead_investigator(request, event)
    event.delete()
    return {"message": "Deleted"}

@events_router.post("/{slug}/narrative", response=NarrativeSchema)
def update_narrative(request, slug: str, data: NarrativeCreateUpdateSchema):
    event = get_event_or_404(slug)
    require_lead_investigator(request, event)
    
    narrative, created = Narrative.objects.update_or_create(
        event=event,
        defaults={
            'content': data.content,
            'is_published': data.is_published
        }
    )
    return narrative

@events_router.get("/{slug}/narrative", response=NarrativeSchema, auth=None)
def get_narrative(request, slug: str):
    event = get_event_or_404(slug)
    narrative = get_object_or_404(Narrative, event=event)
    if not narrative.is_published:
        if not hasattr(request, 'user') or event.lead_investigator != request.user:
            raise HttpError(403, "Narrative is not published")
    return narrative

@events_router.post("/{slug}/evidence", response=EvidenceSchema)
def create_evidence(request, slug: str, data: EvidenceCreateSchema):
    event = get_event_or_404(slug)
    require_lead_investigator(request, event)
    
    evidence = Evidence.objects.create(
        event=event,
        **data.dict()
    )
    return evidence

@events_router.get("/{slug}/evidence", response=List[EvidenceSchema], auth=None)
def list_evidence(request, slug: str):
    event = get_event_or_404(slug)
    return list(event.evidence_set.all())

@events_router.put("/{slug}/evidence/{evidence_id}", response=EvidenceSchema)
def update_evidence(request, slug: str, evidence_id: uuid.UUID, data: EvidenceUpdateSchema):
    event = get_event_or_404(slug)
    require_lead_investigator(request, event)
    
    evidence = get_object_or_404(Evidence, id=evidence_id, event=event)
    for attr, value in data.dict(exclude_unset=True).items():
        setattr(evidence, attr, value)
    evidence.save()
    return evidence

@events_router.delete("/{slug}/evidence/{evidence_id}", response=MessageSchema)
def delete_evidence(request, slug: str, evidence_id: uuid.UUID):
    event = get_event_or_404(slug)
    require_lead_investigator(request, event)
    
    evidence = get_object_or_404(Evidence, id=evidence_id, event=event)
    evidence.delete()
    return {"message": "Deleted"}
