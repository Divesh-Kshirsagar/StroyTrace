from __future__ import annotations

import math

from django.conf import settings
from django.utils import timezone

from apps.feeds.services.confidence import EngagementConfidenceService


class TrendingScoreService:
    """
    Calculates and persists the trending score for an Event.

    Formula:
        trending_score = Σ (interaction_weight × user_confidence × time_decay)

    Where:
        time_decay = 1 / (age_in_hours + base) ^ gravity   (Hacker News style)

    All numerical constants come from settings (env-driven); none are
    hard-coded here to keep the open-source repository algorithm-transparent
    while keeping the tuneable weights private.
    """

    @staticmethod
    def calculate_for_event(event: object) -> float:
        interactions = (
            event.interactions.all().select_related("user")  # type: ignore[attr-defined]
        )
        total = 0.0
        now = timezone.now()

        for interaction in interactions:
            weight = TrendingScoreService._get_interaction_weight(
                interaction.interaction_type
            )
            confidence = EngagementConfidenceService.calculate(interaction.user)
            age_hours = (now - interaction.created_at).total_seconds() / 3600
            decay = TrendingScoreService._time_decay(age_hours)
            total += weight * confidence * decay

        return max(total, 0.0)  # floor at 0.0

    @staticmethod
    def update_event_score(event: object) -> float:
        """Recalculate and persist the trending score synchronously."""
        new_score = TrendingScoreService.calculate_for_event(event)
        event.trending_score = new_score  # type: ignore[attr-defined]
        event.last_interaction_at = timezone.now()  # type: ignore[attr-defined]
        event.save(  # type: ignore[attr-defined]
            update_fields=["trending_score", "last_interaction_at", "updated_at"]
        )
        return new_score

    @staticmethod
    def _get_interaction_weight(interaction_type: str) -> float:
        weights = {
            "upvote": settings.RANKING_WEIGHT_UPVOTE,
            "comment": settings.RANKING_WEIGHT_COMMENT,
            "share": settings.RANKING_WEIGHT_SHARE,
        }
        return weights.get(interaction_type, 1.0)

    @staticmethod
    def _time_decay(age_hours: float) -> float:
        """
        Hacker News-style time decay.
        Newer content gets a higher multiplier; older content naturally decays.
        """
        base: float = settings.RANKING_TIME_DECAY_BASE_HOURS
        gravity: float = settings.RANKING_TIME_DECAY_GRAVITY
        return 1.0 / math.pow(age_hours + base, gravity)
