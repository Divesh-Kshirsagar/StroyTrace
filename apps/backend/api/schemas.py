from ninja import Schema
from pydantic import UUID4, HttpUrl
from typing import List, Optional, Dict
from datetime import date, datetime

class TopicSchema(Schema):
    id: UUID4
    name: str
    slug: str
    description: Optional[str] = None

class CreatorProfileSchema(Schema):
    id: UUID4
    handle: str
    display_name: str
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    banner_url: Optional[str] = None
    social_links: Dict = {}
    is_verified: bool

class EvidenceSchema(Schema):
    id: UUID4
    media_type: str
    source_url: str
    thumbnail_url: Optional[str] = None
    caption: Optional[str] = None
    display_order: int

class NarrativeSchema(Schema):
    id: UUID4
    content: str
    is_published: bool

class EventSchema(Schema):
    id: UUID4
    title: str
    slug: str
    summary: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: str
    created_at: datetime
    lead_investigator_id: UUID4
    topics: List[TopicSchema]
    narrative: Optional[NarrativeSchema] = None
    evidence: List[EvidenceSchema] = []
