from __future__ import annotations

from django.conf import settings
from django.utils import timezone


class EngagementConfidenceService:
    """
    Calculates a 0.0–1.0 confidence score for a user's interactions.

    A higher score signals more trustworthy engagement (older account,
    verified email, clean moderation record, complete profile).

    This is an anti-abuse mechanism, NOT a measure of expertise or truth.
    Weights are loaded from settings (env-driven) so they can be tuned in
    production without code changes.
    """

    @staticmethod
    def calculate(user: object) -> float:
        score = 0.0

        # Factor 1: Account age (linear ramp up to 30 days)
        days_old = (timezone.now() - user.date_joined).days  # type: ignore[attr-defined]
        if days_old >= 30:
            score += settings.RANKING_WEIGHT_ACCOUNT_AGE
        elif days_old >= 1:
            score += settings.RANKING_WEIGHT_ACCOUNT_AGE * (days_old / 30)

        # Factor 2: Email verified (binary)
        if getattr(user, "email_verified", False):
            score += settings.RANKING_WEIGHT_VERIFIED

        # Factor 3: No moderation flags (binary)
        if not EngagementConfidenceService._has_moderation_flags(user):
            score += settings.RANKING_WEIGHT_NO_FLAGS

        # Factor 4: Complete creator profile (binary)
        if EngagementConfidenceService._has_complete_profile(user):
            score += settings.RANKING_WEIGHT_PROFILE_COMPLETE

        return min(score, 1.0)  # cap at 1.0

    @staticmethod
    def _has_moderation_flags(user: object) -> bool:
        # TODO: implement when moderation system is built
        return False

    @staticmethod
    def _has_complete_profile(user: object) -> bool:
        try:
            profile = user.creator_profile  # type: ignore[attr-defined]
            return bool(profile.bio and profile.avatar_url)
        except Exception:
            return False

    @staticmethod
    def get_qualitative_factors(user: object) -> list[dict]:
        """
        Returns human-readable factors for the Transparency UI.
        Never exposes raw scores or weights.
        """
        factors: list[dict] = []
        days_old = (timezone.now() - user.date_joined).days  # type: ignore[attr-defined]

        if days_old >= 30:
            factors.append(
                {
                    "factor": "account_age",
                    "label": "Aged account (30+ days)",
                    "status": "positive",
                }
            )
        elif days_old >= 1:
            factors.append(
                {
                    "factor": "account_age",
                    "label": f"Account age: {days_old} day(s)",
                    "status": "neutral",
                }
            )
        else:
            factors.append(
                {
                    "factor": "account_age",
                    "label": "New account (< 1 day)",
                    "status": "warning",
                }
            )

        if getattr(user, "email_verified", False):
            factors.append(
                {
                    "factor": "verified",
                    "label": "Email verified",
                    "status": "positive",
                }
            )

        if not EngagementConfidenceService._has_moderation_flags(user):
            factors.append(
                {
                    "factor": "clean_record",
                    "label": "No moderation flags",
                    "status": "positive",
                }
            )

        if EngagementConfidenceService._has_complete_profile(user):
            factors.append(
                {
                    "factor": "complete_profile",
                    "label": "Complete profile",
                    "status": "positive",
                }
            )

        return factors
