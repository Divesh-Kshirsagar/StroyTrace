from uuid import UUID

from ninja import Schema


class TopicSchema(Schema):
    id: UUID
    name: str
    slug: str
    description: str | None = None
