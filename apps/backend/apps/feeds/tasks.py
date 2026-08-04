"""
Background tasks for the feeds app.

Currently implemented as synchronous helpers that are called directly
from signals.  The function signatures are ARQ-compatible so they can be
promoted to a real worker queue (arq / Celery) with a one-line change.
"""
from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def update_event_trending_score_sync(event_id: str) -> None:
    """
    Recalculate and persist the trending score for a single event.

    Called synchronously from Django signals for the MVP.  When a task
    queue is added, replace the call-site in signals.py with:

        await arq_pool.enqueue_job("update_event_trending_score", event_id)

    and rename this function to ``async def update_event_trending_score(ctx, event_id)``.
    """
    from apps.events.models import Event
    from apps.feeds.services.scoring import TrendingScoreService

    try:
        event = Event.objects.get(id=event_id)
        TrendingScoreService.update_event_score(event)
    except Event.DoesNotExist:
        logger.warning("update_event_trending_score: event %s not found", event_id)
    except Exception:
        logger.exception(
            "update_event_trending_score: unexpected error for event %s",
            event_id,
        )
