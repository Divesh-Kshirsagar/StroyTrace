from datetime import date, datetime
from uuid import UUID

from ninja import Schema

from apps.feeds.schemas import CreatorSummarySchema
from apps.topics.schemas import TopicSchema


class EvidenceSchema(Schema):
    id: UUID
    media_type: str
    source_url: str
    thumbnail_url: str | None = None
    caption: str | None = None
    display_order: int
    upload_status: str = 'url_based'
    created_at: datetime

class EvidenceCreateSchema(Schema):
    media_type: str
    source_url: str
    thumbnail_url: str | None = None
    caption: str | None = None
    display_order: int | None = 0

class EvidenceUpdateSchema(Schema):
    caption: str | None = None
    display_order: int | None = None

class NarrativeSchema(Schema):
    id: UUID
    content: str
    is_published: bool
    created_at: datetime
    updated_at: datetime

class NarrativeCreateUpdateSchema(Schema):
    content: str
    is_published: bool | None = False

class EventSchema(Schema):
    id: UUID
    title: str
    slug: str
    summary: str | None = None
    start_date: date
    end_date: date | None = None
    status: str
    created_at: datetime
    updated_at: datetime
    lead_investigator: CreatorSummarySchema
    topics: list[TopicSchema]
    
    @staticmethod
    def resolve_lead_investigator(obj):
        profile = getattr(obj.lead_investigator, 'creator_profile', None)
        return {
            "handle": profile.handle if profile else f"user-{obj.lead_investigator.id}",
            "display_name": profile.display_name if profile else "Unknown",
            "avatar_url": profile.avatar_url if profile else None,
        }

class EventFullSchema(Schema):
    event: EventSchema
    narrative: NarrativeSchema | None = None
    evidence: list[EvidenceSchema]

class EventCreateSchema(Schema):
    title: str
    summary: str | None = None
    start_date: date
    end_date: date | None = None
    topic_slugs: list[str] = []

class EventUpdateSchema(Schema):
    title: str | None = None
    summary: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    status: str | None = None

class EventStatusUpdateSchema(Schema):
    status: str

class EvidenceReorderSchema(Schema):
    evidence_ids: list[UUID]

class MessageSchema(Schema):
    message: str

class UploadUrlSchema(Schema):
    evidence_id: str
    upload_url: str
    fields: dict
