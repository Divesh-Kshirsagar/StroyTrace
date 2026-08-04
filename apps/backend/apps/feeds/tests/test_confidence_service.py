"""
Unit tests for EngagementConfidenceService.

Tests cover all four scoring factors (account age, email verified,
no moderation flags, complete profile) and the qualitative factor output.
"""
from __future__ import annotations

from datetime import timedelta

import pytest
from django.utils import timezone

from apps.feeds.services.confidence import EngagementConfidenceService
from apps.users.factories import UserFactory

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _user_aged(days: int):
    """Return a User whose date_joined is `days` ago."""
    user = UserFactory()
    user.date_joined = timezone.now() - timedelta(days=days)
    return user


# ---------------------------------------------------------------------------
# Account age factor
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_new_account_contributes_zero():
    user = _user_aged(0)
    score = EngagementConfidenceService.calculate(user)
    # Only no_flags weight should contribute (0.3); no profile, not verified, age=0
    from django.conf import settings
    assert score == pytest.approx(settings.RANKING_WEIGHT_NO_FLAGS)


@pytest.mark.django_db
def test_account_15_days_contributes_half_age_weight():
    from django.conf import settings
    user = _user_aged(15)
    score = EngagementConfidenceService.calculate(user)
    expected_age = settings.RANKING_WEIGHT_ACCOUNT_AGE * (15 / 30)
    expected = expected_age + settings.RANKING_WEIGHT_NO_FLAGS
    assert score == pytest.approx(expected, rel=1e-3)


@pytest.mark.django_db
def test_account_30_days_full_age_weight():
    from django.conf import settings
    user = _user_aged(30)
    score = EngagementConfidenceService.calculate(user)
    # age + no_flags
    expected = settings.RANKING_WEIGHT_ACCOUNT_AGE + settings.RANKING_WEIGHT_NO_FLAGS
    assert score == pytest.approx(expected)


# ---------------------------------------------------------------------------
# Email verified factor
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_email_verified_adds_weight():
    from django.conf import settings
    user = _user_aged(30)
    user.email_verified = True
    score = EngagementConfidenceService.calculate(user)
    expected = (
        settings.RANKING_WEIGHT_ACCOUNT_AGE
        + settings.RANKING_WEIGHT_VERIFIED
        + settings.RANKING_WEIGHT_NO_FLAGS
    )
    assert score == pytest.approx(expected)


# ---------------------------------------------------------------------------
# Complete profile factor
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_complete_profile_adds_weight():
    from django.conf import settings

    from apps.users.factories import CreatorProfileFactory

    user = _user_aged(30)
    user.save()
    # Create a real CreatorProfile with bio + avatar_url so the profile check passes
    CreatorProfileFactory(user=user, bio="hello", avatar_url="http://img.test/a.png")
    # Re-fetch to clear cached descriptor
    user.refresh_from_db()
    score = EngagementConfidenceService.calculate(user)
    expected = (
        settings.RANKING_WEIGHT_ACCOUNT_AGE
        + settings.RANKING_WEIGHT_NO_FLAGS
        + settings.RANKING_WEIGHT_PROFILE_COMPLETE
    )
    assert score == pytest.approx(expected)


# ---------------------------------------------------------------------------
# Score cap
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_score_capped_at_one():
    """Even if all factors sum > 1.0 (e.g., custom weights), score stays ≤ 1.0."""
    from apps.users.factories import CreatorProfileFactory

    user = _user_aged(30)
    user.email_verified = True
    user.save()
    CreatorProfileFactory(user=user, bio="x", avatar_url="http://img.test/a.png")
    user.refresh_from_db()
    score = EngagementConfidenceService.calculate(user)
    assert score <= 1.0


# ---------------------------------------------------------------------------
# Qualitative factors
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_qualitative_factors_new_account():
    user = _user_aged(0)
    factors = EngagementConfidenceService.get_qualitative_factors(user)
    statuses = [f["status"] for f in factors]
    assert "warning" in statuses  # new account warning


@pytest.mark.django_db
def test_qualitative_factors_old_account():
    user = _user_aged(31)
    factors = EngagementConfidenceService.get_qualitative_factors(user)
    account_factor = next(f for f in factors if f["factor"] == "account_age")
    assert account_factor["status"] == "positive"


@pytest.mark.django_db
def test_qualitative_factors_no_flags_always_present():
    user = _user_aged(5)
    factors = EngagementConfidenceService.get_qualitative_factors(user)
    factor_keys = [f["factor"] for f in factors]
    assert "clean_record" in factor_keys
