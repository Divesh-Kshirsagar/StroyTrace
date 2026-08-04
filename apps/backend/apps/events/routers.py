import uuid

from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils.text import slugify
from ninja import Router
from ninja.errors import HttpError

from apps.topics.models import Topic
from core.auth import AuthBearer, OptionalAuthBearer

from .models import Event, Evidence, Narrative
from django.conf import settings

from core.storage import _get_r2_client

from .schemas import (
    EventCreateSchema,
    EventFullSchema,
    EventSchema,
    EventStatusUpdateSchema,
    EventUpdateSchema,
    EvidenceCreateSchema,
    EvidenceReorderSchema,
    EvidenceSchema,
    EvidenceUpdateSchema,
    MessageSchema,
    NarrativeCreateUpdateSchema,
    NarrativeSchema,
    UploadUrlSchema,
)

events_router = Router(tags=["events"])

_auth = AuthBearer()
_optional_auth = OptionalAuthBearer()

def get_event_or_404(slug: str):
    return get_object_or_404(Event, slug=slug)

def require_lead_investigator(request, event):
    if event.lead_investigator != request.auth:
        raise HttpError(403, "Only the lead investigator can modify this event")

@events_router.post("", response=EventSchema, auth=_auth)
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
            lead_investigator=request.auth
        )
        
        if data.topic_slugs:
            topics = Topic.objects.filter(slug__in=data.topic_slugs)
            event.topics.set(topics)
            
        return event


from apps.feeds.schemas import PaginatedEventSummarySchema
from core.pagination import paginate_queryset


@events_router.get("/search", response=PaginatedEventSummarySchema, auth=None)
def search_events(request, q: str = "", topic: str = "", status: str = "published", cursor: str | None = None, limit: int = 20):
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

@events_router.get("/{slug}", response=EventFullSchema, auth=_optional_auth)
def get_event(request, slug: str):
    event = get_event_or_404(slug)
    narrative = getattr(event, 'narrative', None)
    if narrative and not narrative.is_published:
        # request.auth is None for anonymous; only show unpublished narrative to owner
        if request.auth is None or event.lead_investigator != request.auth:
            narrative = None
            
    return {
        "event": event,
        "narrative": narrative,
        "evidence": list(event.evidence_set.all())
    }

@events_router.put("/{slug}", response=EventSchema, auth=_auth)
def update_event(request, slug: str, data: EventUpdateSchema):
    event = get_event_or_404(slug)
    require_lead_investigator(request, event)
    
    for attr, value in data.dict(exclude_unset=True).items():
        setattr(event, attr, value)
    event.save()
    return event

@events_router.delete("/{slug}", response=MessageSchema, auth=_auth)
def delete_event(request, slug: str):
    event = get_event_or_404(slug)
    require_lead_investigator(request, event)
    event.delete()
    return {"message": "Deleted"}

@events_router.post("/{slug}/narrative", response=NarrativeSchema, auth=_auth)
def update_narrative(request, slug: str, data: NarrativeCreateUpdateSchema):
    event = get_event_or_404(slug)
    require_lead_investigator(request, event)
    
    narrative, _created = Narrative.objects.update_or_create(
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

@events_router.get("/{slug}/evidence/upload-url", response=UploadUrlSchema, auth=_auth)
def get_evidence_upload_url(request, slug: str, filename: str, content_type: str):
    event = get_event_or_404(slug)
    require_lead_investigator(request, event)

    ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "application/pdf"}

    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HttpError(400, "Unsupported file type")

    evidence_id = uuid.uuid4()
    key = f"pending/{event.id}/{evidence_id}/{filename}"

    conditions = [
        ["content-length-range", 1024, 5_242_880],  # 1 KB to 5 MB
        ["eq", "$Content-Type", content_type],
    ]

    s3_client = _get_r2_client()
    post_dict = s3_client.generate_presigned_post(
        Bucket=settings.R2_QUARANTINE_BUCKET,
        Key=key,
        Conditions=conditions,
        ExpiresIn=3600,
    )

    media_type = "image" if content_type.startswith("image/") else "document"
    evidence = Evidence.objects.create(
        id=evidence_id,
        event=event,
        media_type=media_type,
        source_url="http://placeholder",
        upload_status="pending_upload",
        r2_quarantine_key=key,
        caption="",
    )

    return {"evidence_id": str(evidence.id), "upload_url": post_dict["url"], "fields": post_dict["fields"]}


@events_router.post("/{slug}/evidence/{evidence_id}/confirm-upload", response=EvidenceSchema, auth=_auth)
def confirm_evidence_upload(request, slug: str, evidence_id: uuid.UUID):
    """
    Transition evidence from pending_upload → processing and enqueue the
    background validation task.  Returns 404 if called a second time (status
    is no longer pending_upload).
    """
    event = get_event_or_404(slug)
    require_lead_investigator(request, event)

    evidence = get_object_or_404(
        Evidence,
        id=evidence_id,
        event=event,
        upload_status="pending_upload",
    )

    evidence.upload_status = "processing"
    evidence.save(update_fields=["upload_status"])

    # Lazy import to avoid circular dependency between routers ↔ tasks
    from apps.events.tasks import validate_and_process_evidence  # noqa: PLC0415
    validate_and_process_evidence.delay(str(evidence.id))

    return evidence


@events_router.post("/{slug}/evidence", response=EvidenceSchema, auth=_auth)
def create_evidence(request, slug: str, data: EvidenceCreateSchema):
    event = get_event_or_404(slug)
    require_lead_investigator(request, event)
    
    evidence = Evidence.objects.create(
        event=event,
        **data.dict()
    )
    return evidence

@events_router.get("/{slug}/evidence", response=list[EvidenceSchema], auth=None)
def list_evidence(request, slug: str):
    event = get_event_or_404(slug)
    return list(event.evidence_set.all())

@events_router.put("/{slug}/evidence/{evidence_id}", response=EvidenceSchema, auth=_auth)
def update_evidence(request, slug: str, evidence_id: uuid.UUID, data: EvidenceUpdateSchema):
    event = get_event_or_404(slug)
    require_lead_investigator(request, event)
    
    evidence = get_object_or_404(Evidence, id=evidence_id, event=event)
    for attr, value in data.dict(exclude_unset=True).items():
        setattr(evidence, attr, value)
    evidence.save()
    return evidence

@events_router.delete("/{slug}/evidence/{evidence_id}", response=MessageSchema, auth=_auth)
def delete_evidence(request, slug: str, evidence_id: uuid.UUID):
    event = get_event_or_404(slug)
    require_lead_investigator(request, event)
    
    evidence = get_object_or_404(Evidence, id=evidence_id, event=event)
    evidence.delete()
    return {"message": "Deleted"}

@events_router.put("/{slug}/status", response=EventSchema, auth=_auth)
def update_event_status(request, slug: str, data: EventStatusUpdateSchema):
    event = get_event_or_404(slug)
    require_lead_investigator(request, event)
    
    if data.status not in ["draft", "published", "archived"]:
        raise HttpError(400, "Invalid status")
        
    old_status = event.status
    event.status = data.status
    event.save()
    
    if old_status != "published" and data.status == "published":
        try:
            handle = event.lead_investigator.creator_profile.handle
            print(f"[MOCK EMAIL] To subscribers of @{handle}: New Event published - '{event.title}' at https://clarity.com/{handle}/{event.slug}")
        except Exception as e:
            print(f"[MOCK EMAIL ERROR] {e}")

    return event

@events_router.put("/{slug}/evidence/reorder", response=MessageSchema, auth=_auth)
def reorder_evidence(request, slug: str, data: EvidenceReorderSchema):
    event = get_event_or_404(slug)
    require_lead_investigator(request, event)
    
    with transaction.atomic():
        # Validate that all IDs belong to this event
        existing_ids = set(event.evidence_set.values_list('id', flat=True))
        provided_ids = set(data.evidence_ids)
        
        if not provided_ids.issubset(existing_ids):
            raise HttpError(400, "Some evidence IDs do not belong to this event")
            
        for index, ev_id in enumerate(data.evidence_ids):
            Evidence.objects.filter(id=ev_id, event=event).update(display_order=index)
            
    return {"message": "Success"}
