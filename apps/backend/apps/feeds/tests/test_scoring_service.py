"""
Unit tests for TrendingScoreService.

Verifies time decay math, interaction weight application, and score persistence.
"""
from __future__ import annotations

import math
from datetime import timedelta

import pytest
from django.conf import settings
from django.utils import timezone

from apps.events.factories import EventFactory
from apps.feeds.factories import InteractionFactory
from apps.feeds.models import Interaction
from apps.feeds.services.scoring import TrendingScoreService
from apps.users.factories import UserFactory


# ---------------------------------------------------------------------------
# Time decay
# ---------------------------------------------------------------------------

def test_time_decay_decreases_with_age():
    """Older content must have a lower decay multiplier than newer content."""
    new_decay = TrendingScoreService._time_decay(0.5)
    old_decay = TrendingScoreService._time_decay(48)
    assert new_decay > old_decay


def test_time_decay_formula():
    """Verify the Hacker News formula: 1 / (age + base) ^ gravity."""
    age = 10.0
    expected = 1.0 / math.pow(
        age + settings.RANKING_TIME_DECAY_BASE_HOURS,
        settings.RANKING_TIME_DECAY_GRAVITY,
    )
    assert TrendingScoreService._time_decay(age) == pytest.approx(expected)


# ---------------------------------------------------------------------------
# Interaction weight mapping
# ---------------------------------------------------------------------------

def test_upvote_weight():
    assert TrendingScoreService._get_interaction_weight("upvote") == pytest.approx(
        settings.RANKING_WEIGHT_UPVOTE
    )


def test_comment_weight_heavier_than_upvote():
    assert TrendingScoreService._get_interaction_weight(
        "comment"
    ) > TrendingScoreService._get_interaction_weight("upvote")


def test_share_weight_heaviest():
    assert TrendingScoreService._get_interaction_weight(
        "share"
    ) > TrendingScoreService._get_interaction_weight("comment")


def test_unknown_type_returns_default_weight():
    assert TrendingScoreService._get_interaction_weight("unknown") == pytest.approx(1.0)


# ---------------------------------------------------------------------------
# Score calculation
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_event_with_no_interactions_scores_zero():
    event = EventFactory(status="published")
    score = TrendingScoreService.calculate_for_event(event)
    assert score == pytest.approx(0.0)


@pytest.mark.django_db
def test_event_with_recent_upvote_has_positive_score():
    event = EventFactory(status="published")
    InteractionFactory(event=event, interaction_type=Interaction.InteractionType.UPVOTE)
    score = TrendingScoreService.calculate_for_event(event)
    assert score > 0.0


@pytest.mark.django_db
def test_share_produces_higher_score_than_upvote():
    event_upvote = EventFactory(status="published")
    event_share = EventFactory(status="published")
    user = UserFactory()
    InteractionFactory(
        event=event_upvote, user=user, interaction_type=Interaction.InteractionType.UPVOTE
    )
    InteractionFactory(
        event=event_share, user=user, interaction_type=Interaction.InteractionType.SHARE
    )
    assert TrendingScoreService.calculate_for_event(
        event_share
    ) > TrendingScoreService.calculate_for_event(event_upvote)


@pytest.mark.django_db
def test_update_event_score_persists_to_db():
    event = EventFactory(status="published")
    InteractionFactory(event=event)
    new_score = TrendingScoreService.update_event_score(event)
    event.refresh_from_db()
    assert event.trending_score == pytest.approx(new_score)
    assert event.last_interaction_at is not None


@pytest.mark.django_db
def test_score_floor_is_zero():
    """Trending score must never go negative."""
    event = EventFactory(status="published")
    score = TrendingScoreService.calculate_for_event(event)
    assert score >= 0.0
