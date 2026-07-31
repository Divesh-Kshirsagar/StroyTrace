from typing import List, Optional, Any
from pydantic import Field
from ninja import Schema
from datetime import date, datetime
from uuid import UUID

class CreatorSummarySchema(Schema):
    handle: str
    display_name: str
    avatar_url: Optional[str] = None

class TopicSummarySchema(Schema):
    slug: str
    name: str

class EventSummarySchema(Schema):
    id: UUID
    slug: str
    title: str
    summary: Optional[str] = None
    start_date: date
    status: str
    lead_investigator: CreatorSummarySchema
    primary_topic: Optional[TopicSummarySchema] = None
    evidence_count: int
    primary_thumbnail: Optional[str] = None
    created_at: datetime
    
    @staticmethod
    def resolve_lead_investigator(obj):
        profile = getattr(obj.lead_investigator, 'creator_profile', None)
        return {
            "handle": profile.handle if profile else f"user-{obj.lead_investigator.id}",
            "display_name": profile.display_name if profile else "Unknown",
            "avatar_url": profile.avatar_url if profile else None,
        }
        
    @staticmethod
    def resolve_primary_topic(obj):
        # We assume prefetch_related('topics')
        topics = list(obj.topics.all())
        if topics:
            return {"slug": topics[0].slug, "name": topics[0].name}
        return None

    @staticmethod
    def resolve_evidence_count(obj):
        # Prefer using annotation if available, fallback to len
        if hasattr(obj, 'evidence_count_annotated'):
            return obj.evidence_count_annotated
        return len(list(obj.evidence_set.all()))
        
    @staticmethod
    def resolve_primary_thumbnail(obj):
        evidence_list = list(obj.evidence_set.all())
        if evidence_list:
            for ev in evidence_list:
                if ev.thumbnail_url:
                    return ev.thumbnail_url
        return None

class PaginatedEventSummarySchema(Schema):
    items: List[EventSummarySchema]
    next_cursor: Optional[str] = None
    previous_cursor: Optional[str] = None
    has_next: bool
