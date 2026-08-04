"""
Tests for POST /{slug}/evidence/{evidence_id}/confirm-upload endpoint.

Acceptance criteria
-------------------
- First call transitions Evidence to upload_status='processing' and
  enqueues the Celery task.
- Second call returns 404 (status is no longer 'pending_upload').
"""

import uuid
from unittest.mock import patch

import pytest

from apps.events.factories import EvidenceFactory, EventFactory
from apps.users.factories import CreatorProfileFactory


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _auth_header(user):
    import jwt
    from django.conf import settings
    token = jwt.encode(
        {"user_id": str(user.id), "type": "access"},
        settings.SECRET_KEY,
        algorithm="HS256",
    )
    return {"HTTP_AUTHORIZATION": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_confirm_upload_transitions_to_processing(api_client):
    """
    A valid first call must:
    - Set upload_status to 'processing'
    - Enqueue the Celery task
    - Return the updated EvidenceSchema
    """
    profile = CreatorProfileFactory()
    event = EventFactory(lead_investigator=profile.user)
    evidence = EvidenceFactory(
        event=event,
        upload_status="pending_upload",
        r2_quarantine_key="pending/abc/def.jpg",
    )
    headers = _auth_header(profile.user)

    with patch("apps.events.tasks.validate_and_process_evidence") as mock_task:
        mock_task.delay = lambda eid: None

        response = api_client.post(
            f"/api/v1/events/{event.slug}/evidence/{evidence.id}/confirm-upload",
            **headers,
        )

    assert response.status_code == 200, response.content
    data = response.json()
    assert data["upload_status"] == "processing"

    # Verify DB was updated
    evidence.refresh_from_db()
    assert evidence.upload_status == "processing"


@pytest.mark.django_db
def test_confirm_upload_second_call_returns_404(api_client):
    """
    A second call to confirm-upload must return 404 because upload_status
    is no longer 'pending_upload'.
    """
    profile = CreatorProfileFactory()
    event = EventFactory(lead_investigator=profile.user)
    evidence = EvidenceFactory(
        event=event,
        upload_status="pending_upload",
        r2_quarantine_key="pending/abc/def.jpg",
    )
    headers = _auth_header(profile.user)

    # First call
    with patch("apps.events.tasks.validate_and_process_evidence") as mock_task:
        mock_task.delay = lambda eid: None
        response1 = api_client.post(
            f"/api/v1/events/{event.slug}/evidence/{evidence.id}/confirm-upload",
            **headers,
        )

    assert response1.status_code == 200, response1.content

    # Second call — should now be 404
    with patch("apps.events.tasks.validate_and_process_evidence") as mock_task:
        mock_task.delay = lambda eid: None
        response2 = api_client.post(
            f"/api/v1/events/{event.slug}/evidence/{evidence.id}/confirm-upload",
            **headers,
        )

    assert response2.status_code == 404, response2.content


@pytest.mark.django_db
def test_confirm_upload_enqueues_celery_task(api_client):
    """Confirm that validate_and_process_evidence.delay is called with the evidence ID."""
    profile = CreatorProfileFactory()
    event = EventFactory(lead_investigator=profile.user)
    evidence = EvidenceFactory(
        event=event,
        upload_status="pending_upload",
        r2_quarantine_key="pending/abc/def.jpg",
    )
    headers = _auth_header(profile.user)

    task_calls = []

    def fake_delay(evidence_id):
        task_calls.append(evidence_id)

    with patch("apps.events.tasks.validate_and_process_evidence") as mock_task:
        mock_task.delay = fake_delay
        api_client.post(
            f"/api/v1/events/{event.slug}/evidence/{evidence.id}/confirm-upload",
            **headers,
        )

    assert len(task_calls) == 1
    assert task_calls[0] == str(evidence.id)
