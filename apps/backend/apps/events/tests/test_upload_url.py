"""
Tests for the GET /{slug}/evidence/upload-url endpoint.

R2/S3 is mocked via moto so no real network calls are made (R10.1).

Acceptance criteria
-------------------
- Allowed types return 200 with a stub Evidence record.
- Disallowed types return 400.
- Non-lead-investigator returns 403.
- content-length-range max is exactly 5 MB (5,242,880 bytes).
"""

import boto3
import pytest
from moto import mock_aws

from apps.events.factories import EventFactory
from apps.users.factories import CreatorProfileFactory, UserFactory

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_r2_buckets(region: str = "us-east-1"):
    """Create both quarantine and production buckets in the mocked S3."""
    from django.conf import settings

    s3 = boto3.client(
        "s3",
        region_name=region,
        endpoint_url=None,  # moto intercepts real boto3 calls
        aws_access_key_id="test",
        aws_secret_access_key="test",
    )
    for bucket in (settings.R2_QUARANTINE_BUCKET, settings.R2_PRODUCTION_BUCKET):
        s3.create_bucket(Bucket=bucket)
    return s3


def _auth_header(user):
    """Return a JWT Authorization header for the given user."""
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

@mock_aws
@pytest.mark.django_db
def test_upload_url_allowed_types(api_client):
    """Allowed MIME types return 200 and create a stub Evidence row."""
    _make_r2_buckets()

    profile = CreatorProfileFactory()
    event = EventFactory(status="draft", lead_investigator=profile.user)
    headers = _auth_header(profile.user)

    allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
    for ct in allowed:
        response = api_client.get(
            f"/api/v1/events/{event.slug}/evidence/upload-url"
            f"?filename=test.bin&content_type={ct}",
            **headers,
        )
        assert response.status_code == 200, f"Failed for {ct}: {response.content}"
        data = response.json()
        assert "evidence_id" in data
        assert "upload_url" in data
        assert "fields" in data

        # Verify the stub Evidence row was created with correct status
        from apps.events.models import Evidence
        ev = Evidence.objects.get(id=data["evidence_id"])
        assert ev.upload_status == "pending_upload"
        assert ev.r2_quarantine_key is not None


@mock_aws
@pytest.mark.django_db
def test_upload_url_disallowed_type_returns_400(api_client):
    """Disallowed MIME types return 400."""
    _make_r2_buckets()

    profile = CreatorProfileFactory()
    event = EventFactory(status="draft", lead_investigator=profile.user)
    headers = _auth_header(profile.user)

    for ct in ["application/javascript", "text/html", "video/mp4"]:
        response = api_client.get(
            f"/api/v1/events/{event.slug}/evidence/upload-url"
            f"?filename=bad.bin&content_type={ct}",
            **headers,
        )
        assert response.status_code == 400, f"Expected 400 for {ct}: {response.content}"


@mock_aws
@pytest.mark.django_db
def test_upload_url_non_lead_investigator_returns_403(api_client):
    """A user who is not the lead investigator must receive 403."""
    _make_r2_buckets()

    profile = CreatorProfileFactory()
    event = EventFactory(status="draft", lead_investigator=profile.user)

    other_user = UserFactory()
    headers = _auth_header(other_user)

    response = api_client.get(
        f"/api/v1/events/{event.slug}/evidence/upload-url"
        "?filename=test.jpg&content_type=image/jpeg",
        **headers,
    )
    assert response.status_code == 403


@mock_aws
@pytest.mark.django_db
def test_upload_url_content_length_range_max_is_5mb(api_client):
    """
    The presigned POST conditions must cap uploads at exactly 5 MB
    (5,242,880 bytes) — R1.5.
    """
    from unittest.mock import MagicMock, patch

    # We need to intercept what is passed to generate_presigned_post
    captured_conditions = []


    def mock_get_r2_client():
        mock_client = MagicMock()

        def _generate(Bucket, Key, Conditions, ExpiresIn):
            captured_conditions.extend(Conditions)
            return {"url": "https://r2.example.com/upload", "fields": {"key": Key}}

        mock_client.generate_presigned_post.side_effect = _generate
        return mock_client

    profile = CreatorProfileFactory()
    event = EventFactory(status="draft", lead_investigator=profile.user)
    headers = _auth_header(profile.user)

    with patch("apps.events.routers._get_r2_client", side_effect=mock_get_r2_client):
        response = api_client.get(
            f"/api/v1/events/{event.slug}/evidence/upload-url"
            "?filename=photo.jpg&content_type=image/jpeg",
            **headers,
        )

    assert response.status_code == 200, response.content

    # Find the content-length-range condition
    cl_range = next(
        (c for c in captured_conditions if isinstance(c, list) and c[0] == "content-length-range"),
        None,
    )
    assert cl_range is not None, "content-length-range condition not found"
    assert cl_range[2] == 5_242_880, f"Expected max 5,242,880 bytes, got {cl_range[2]}"

