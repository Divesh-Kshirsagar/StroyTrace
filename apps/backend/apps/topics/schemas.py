from ninja import Schema
from uuid import UUID

class TopicSchema(Schema):
    id: UUID
    name: str
    slug: str
    description: str
