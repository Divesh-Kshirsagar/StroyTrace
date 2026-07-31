from datetime import date, datetime
from typing import List, Optional
from ninja import Schema, ModelSchema
from uuid import UUID
from apps.topics.schemas import TopicSchema

class EvidenceSchema(Schema):
    id: UUID
    media_type: str
    source_url: str
    thumbnail_url: Optional[str] = None
    caption: Optional[str] = None
    display_order: int
    created_at: datetime

class EvidenceCreateSchema(Schema):
    media_type: str
    source_url: str
    thumbnail_url: Optional[str] = None
    caption: Optional[str] = None
    display_order: Optional[int] = 0

class EvidenceUpdateSchema(Schema):
    caption: Optional[str] = None
    display_order: Optional[int] = None

class NarrativeSchema(Schema):
    id: UUID
    content: str
    is_published: bool
    created_at: datetime
    updated_at: datetime

class NarrativeCreateUpdateSchema(Schema):
    content: str
    is_published: Optional[bool] = False

class EventSchema(Schema):
    id: UUID
    title: str
    slug: str
    summary: Optional[str] = None
    start_date: date
    end_date: Optional[date] = None
    status: str
    created_at: datetime
    updated_at: datetime
    topics: List[TopicSchema]

class EventFullSchema(Schema):
    event: EventSchema
    narrative: Optional[NarrativeSchema] = None
    evidence: List[EvidenceSchema]

class EventCreateSchema(Schema):
    title: str
    summary: Optional[str] = None
    start_date: date
    end_date: Optional[date] = None
    topic_slugs: List[str] = []

class EventUpdateSchema(Schema):
    title: Optional[str] = None
    summary: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[str] = None

class MessageSchema(Schema):
    message: str
