from __future__ import annotations

from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.feeds.models import Interaction


@receiver(post_save, sender=Interaction)
@receiver(post_delete, sender=Interaction)
def interaction_changed(sender: type, instance: Interaction, **kwargs: object) -> None:
    """
    Recalculate the event's trending score whenever an interaction is
    created or deleted.

    Falls back to a synchronous in-process calculation if a task queue
    (e.g., ARQ/Celery) is unavailable so the score is never stale.
    """
    from apps.feeds.services.scoring import TrendingScoreService

    try:
        # Lazy import to avoid circular imports at module load time
        from apps.feeds import tasks as feed_tasks

        feed_tasks.update_event_trending_score_sync(str(instance.event_id))
    except Exception:
        # Graceful fallback: compute synchronously
        try:
            TrendingScoreService.update_event_score(instance.event)
        except Exception:
            pass  # Never crash the request thread over a ranking update
