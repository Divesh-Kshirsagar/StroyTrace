from ninja import Schema
from uuid import UUID
from typing import Optional

class TopicSchema(Schema):
    id: UUID
    name: str
    slug: str
    description: Optional[str] = None
