"""
Integration tests for the /feed/events/{slug}/interact endpoint.

Covers: create, duplicate guard (UniqueConstraint), delete, invalid type,
and the transparency endpoint.
"""
from __future__ import annotations

from datetime import UTC, datetime, timedelta

import jwt
import pytest
from django.conf import settings

from apps.events.factories import EventFactory
from apps.feeds.models import Interaction
from apps.users.factories import CreatorProfileFactory, UserFactory

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_user():
    """Create a user with a CreatorProfile so login returns AuthResponse cleanly."""
    user = UserFactory()
    user.set_password("password123")
    user.save()
    CreatorProfileFactory(user=user)
    return user


def _jwt_headers(user) -> dict:
    """Generate a Bearer token directly (avoids hitting the rate-limited login endpoint)."""
    payload = {
        "user_id": str(user.id),
        "exp": datetime.now(UTC) + timedelta(minutes=15),
        "iat": datetime.now(UTC),
        "type": "access",
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")
    return {"HTTP_AUTHORIZATION": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# Create interaction
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_upvote_creates_interaction(client):
    user = _make_user()
    event = EventFactory(status="published")
    headers = _jwt_headers(user)

    resp = client.post(
        f"/api/v1/feed/events/{event.slug}/interact",
        data={"type": "upvote"},
        content_type="application/json",
        **headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert Interaction.objects.filter(
        user=user, event=event, interaction_type="upvote"
    ).exists()


@pytest.mark.django_db
def test_duplicate_upvote_returns_400(client):
    user = _make_user()
    event = EventFactory(status="published")
    Interaction.objects.create(user=user, event=event, interaction_type="upvote")
    headers = _jwt_headers(user)

    resp = client.post(
        f"/api/v1/feed/events/{event.slug}/interact",
        data={"type": "upvote"},
        content_type="application/json",
        **headers,
    )
    assert resp.status_code == 400


@pytest.mark.django_db
def test_invalid_interaction_type_returns_400(client):
    user = _make_user()
    event = EventFactory(status="published")
    headers = _jwt_headers(user)

    resp = client.post(
        f"/api/v1/feed/events/{event.slug}/interact",
        data={"type": "clap"},
        content_type="application/json",
        **headers,
    )
    assert resp.status_code == 400


@pytest.mark.django_db
def test_unauthenticated_interact_returns_401(client):
    event = EventFactory(status="published")
    resp = client.post(
        f"/api/v1/feed/events/{event.slug}/interact",
        data={"type": "upvote"},
        content_type="application/json",
    )
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Delete interaction
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_remove_upvote(client):
    user = _make_user()
    event = EventFactory(status="published")
    Interaction.objects.create(user=user, event=event, interaction_type="upvote")
    headers = _jwt_headers(user)

    resp = client.delete(
        f"/api/v1/feed/events/{event.slug}/interact",
        data={"type": "upvote"},
        content_type="application/json",
        **headers,
    )
    assert resp.status_code == 200
    assert not Interaction.objects.filter(user=user, event=event).exists()


@pytest.mark.django_db
def test_remove_nonexistent_interaction_returns_404(client):
    user = _make_user()
    event = EventFactory(status="published")
    headers = _jwt_headers(user)

    resp = client.delete(
        f"/api/v1/feed/events/{event.slug}/interact",
        data={"type": "upvote"},
        content_type="application/json",
        **headers,
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Transparency endpoint
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_transparency_anonymous_user(client):
    event = EventFactory(status="published")
    resp = client.get(f"/api/v1/feed/events/{event.slug}/transparency")
    assert resp.status_code == 200
    data = resp.json()
    assert "trending_score" in data
    assert "total_interactions" in data
    assert "event_factors" in data
    assert data["viewer_factors"] == []


@pytest.mark.django_db
def test_transparency_authenticated_viewer(client):
    user = _make_user()
    event = EventFactory(status="published")
    headers = _jwt_headers(user)

    resp = client.get(
        f"/api/v1/feed/events/{event.slug}/transparency",
        **headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    # Authenticated user gets their own factor list (non-empty: at least clean_record)
    assert len(data["viewer_factors"]) > 0


# ---------------------------------------------------------------------------
# Home feed sort parameter
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_home_feed_trending_sort(client):
    resp = client.get("/api/v1/feed/home?sort=trending")
    assert resp.status_code == 200
    assert "items" in resp.json()


@pytest.mark.django_db
def test_home_feed_latest_sort(client):
    resp = client.get("/api/v1/feed/home?sort=latest")
    assert resp.status_code == 200
    assert "items" in resp.json()
