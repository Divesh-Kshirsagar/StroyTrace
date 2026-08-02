import uuid
from django.db import models
from django.conf import settings


class Interaction(models.Model):
    """
    Tracks user engagement with events (upvote, comment, share).

    Used to calculate trending scores via the EngagementConfidenceService.
    The UniqueConstraint at the DB level is the last line of defence against
    duplicate interactions regardless of race conditions at the API layer.
    """

    class InteractionType(models.TextChoices):
        UPVOTE = "upvote", "Upvote"
        COMMENT = "comment", "Comment"
        SHARE = "share", "Share"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="interactions",
    )
    event = models.ForeignKey(
        "events.Event",
        on_delete=models.CASCADE,
        related_name="interactions",
    )
    interaction_type = models.CharField(
        max_length=20,
        choices=InteractionType.choices,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "event", "interaction_type"],
                name="unique_user_event_interaction",
            )
        ]
        indexes = [
            models.Index(fields=["event", "interaction_type"]),
            models.Index(fields=["user", "created_at"]),
        ]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.user_id} — {self.interaction_type} — {self.event_id}"
