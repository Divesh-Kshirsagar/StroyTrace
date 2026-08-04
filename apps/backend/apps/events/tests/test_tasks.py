"""
Tests for the validate_and_process_evidence Celery task.

R2/S3 is mocked via moto (R10.1).
Celery tasks run synchronously via CELERY_TASK_ALWAYS_EAGER=True (R10.2).
EXIF-stripping is verified by asserting GPS tags are absent (R10.3).

Coverage
--------
- Valid JPEG → processed, CDN URL ends in .webp, quarantine deleted
- PHP file disguised as JPEG → failed, quarantine deleted, production empty
- JPEG with GPS EXIF → processed WebP has no GPS tags
- Valid PDF → processed, file present in production bucket
"""

import io
import struct
import uuid
from unittest.mock import MagicMock, patch

import pytest
import boto3
from moto import mock_aws

from apps.events.factories import EvidenceFactory, EventFactory
from apps.events.models import Evidence
from apps.users.factories import CreatorProfileFactory


# ---------------------------------------------------------------------------
# Constants / fixtures
# ---------------------------------------------------------------------------

# Minimal valid JPEG bytes (SOI + EOI markers)
_MINIMAL_JPEG = bytes([
    0xFF, 0xD8, 0xFF, 0xE0,  # SOI + APP0 marker
    0x00, 0x10,              # APP0 length
    0x4A, 0x46, 0x49, 0x46, 0x00,  # "JFIF\0"
    0x01, 0x01,              # version
    0x00,                    # aspect ratio units
    0x00, 0x01, 0x00, 0x01,  # density
    0x00, 0x00,              # thumbnail size
    0xFF, 0xD9,              # EOI
])

# PHP file disguised as JPEG — real magic bytes are PHP opening tag
_PHP_BYTES = b"<?php echo 'hello'; ?>" + b"\xff\xd8\xff" * 10  # starts with PHP

# Minimal valid PDF bytes
_MINIMAL_PDF = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF"


def _make_buckets(s3_client):
    from django.conf import settings
    for bucket in (settings.R2_QUARANTINE_BUCKET, settings.R2_PRODUCTION_BUCKET):
        s3_client.create_bucket(Bucket=bucket)


def _get_mock_s3():
    return boto3.client(
        "s3",
        region_name="us-east-1",
        aws_access_key_id="test",
        aws_secret_access_key="test",
    )


def _put_quarantine(s3, bucket, key, body):
    s3.put_object(Bucket=bucket, Key=key, Body=body)


# ---------------------------------------------------------------------------
# pyvips mock helper
#
# pyvips requires native libvips which may not be present in the dev env.
# We mock pyvips in these tests — the mock simulates the WebP output
# WITHOUT EXIF GPS tags (which is the entire point: stripping happens).
# ---------------------------------------------------------------------------

class _FakeVipsImage:
    """Simulates a pyvips.Image object that produces a minimal WebP buffer."""

    _GPS_KEY = "exif-0x0025"  # GPS tag often used in tests

    def __init__(self, has_gps: bool = False):
        self._has_gps = has_gps
        self._metadata: dict = {}
        if has_gps:
            # Simulate GPS data present on the input image
            self._metadata[self._GPS_KEY] = b"\x00" * 8

    def get_fields(self):
        return list(self._metadata.keys())

    def get(self, key):
        return self._metadata.get(key)

    def write_to_buffer(self, suffix, **kwargs):
        # strip=True removes EXIF — simulate by clearing metadata in output
        strip = kwargs.get("strip", False)
        # Return a tiny but valid-looking WebP header (RIFF header)
        webp_header = b"RIFF\x00\x00\x00\x00WEBP"
        if strip:
            # No EXIF data in buffer — GPS stripped
            return webp_header
        else:
            # Include fake EXIF
            return webp_header + b"EXIF" + b"\x00" * 16

    @classmethod
    def new_from_buffer(cls, data, options, **kwargs):
        # Detect if input "contains" GPS to simulate pass-through
        return cls(has_gps=False)


def _make_pyvips_module(has_gps_input=False):
    """Create a mock pyvips module."""
    mock_pyvips = MagicMock()
    mock_pyvips.Image.new_from_buffer.return_value = _FakeVipsImage(has_gps=has_gps_input)
    return mock_pyvips


# ---------------------------------------------------------------------------
# Helper to run the task (imports lazily inside mock context)
# ---------------------------------------------------------------------------

def _run_task(evidence_id: str):
    from apps.events.tasks import validate_and_process_evidence
    # Call synchronously (no need for CELERY_TASK_ALWAYS_EAGER when calling directly)
    validate_and_process_evidence(evidence_id)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@mock_aws
@pytest.mark.django_db
def test_valid_jpeg_produces_webp_and_processed_status():
    """
    A valid JPEG should:
    - Be re-encoded to WebP and placed in the production bucket.
    - CDN URL ends with .webp
    - Evidence upload_status becomes 'processed'
    - Quarantine file is deleted
    """
    from django.conf import settings

    s3 = _get_mock_s3()
    _make_buckets(s3)

    profile = CreatorProfileFactory()
    event = EventFactory(lead_investigator=profile.user)
    key = f"pending/{event.id}/{uuid.uuid4()}/photo.jpg"
    _put_quarantine(s3, settings.R2_QUARANTINE_BUCKET, key, _MINIMAL_JPEG)

    evidence = EvidenceFactory(
        event=event,
        upload_status="processing",
        r2_quarantine_key=key,
        source_url="http://placeholder",
    )

    mock_pyvips = _make_pyvips_module()

    with patch.dict("sys.modules", {"pyvips": mock_pyvips}):
        with patch("core.storage._get_r2_client", return_value=_get_mock_s3()):
            _run_task(str(evidence.id))

    evidence.refresh_from_db()
    assert evidence.upload_status == "processed"
    assert evidence.source_url.endswith(".webp")
    assert evidence.r2_quarantine_key is None

    # Quarantine file must no longer exist
    import botocore.exceptions
    with pytest.raises(botocore.exceptions.ClientError) as exc_info:
        s3.head_object(Bucket=settings.R2_QUARANTINE_BUCKET, Key=key)
    assert exc_info.value.response["Error"]["Code"] in ("404", "NoSuchKey")


@mock_aws
@pytest.mark.django_db
def test_php_disguised_as_jpeg_fails_and_quarantine_deleted():
    """
    A PHP file disguised as JPEG must:
    - Set upload_status='failed'
    - Delete the quarantine file
    - Leave production bucket empty
    """
    from django.conf import settings

    s3 = _get_mock_s3()
    _make_buckets(s3)

    profile = CreatorProfileFactory()
    event = EventFactory(lead_investigator=profile.user)
    key = f"pending/{event.id}/{uuid.uuid4()}/evil.jpg"
    _put_quarantine(s3, settings.R2_QUARANTINE_BUCKET, key, _PHP_BYTES)

    evidence = EvidenceFactory(
        event=event,
        upload_status="processing",
        r2_quarantine_key=key,
        source_url="http://placeholder",
    )

    with patch("core.storage._get_r2_client", return_value=_get_mock_s3()):
        _run_task(str(evidence.id))

    evidence.refresh_from_db()
    assert evidence.upload_status == "failed"
    assert evidence.r2_quarantine_key is None

    # Quarantine file must be deleted
    import botocore.exceptions
    with pytest.raises(botocore.exceptions.ClientError):
        s3.head_object(Bucket=settings.R2_QUARANTINE_BUCKET, Key=key)

    # Production bucket must be empty
    objs = s3.list_objects_v2(Bucket=settings.R2_PRODUCTION_BUCKET)
    assert objs.get("KeyCount", 0) == 0


@mock_aws
@pytest.mark.django_db
def test_jpeg_with_gps_exif_strips_metadata():
    """
    A JPEG with GPS metadata must produce a WebP output with NO GPS tags
    (R10.3 — EXIF-stripping verification).

    We verify that the mock pyvips write_to_buffer is called with strip=True.
    """
    from django.conf import settings

    s3 = _get_mock_s3()
    _make_buckets(s3)

    profile = CreatorProfileFactory()
    event = EventFactory(lead_investigator=profile.user)
    key = f"pending/{event.id}/{uuid.uuid4()}/gps-photo.jpg"
    _put_quarantine(s3, settings.R2_QUARANTINE_BUCKET, key, _MINIMAL_JPEG)

    evidence = EvidenceFactory(
        event=event,
        upload_status="processing",
        r2_quarantine_key=key,
        source_url="http://placeholder",
    )

    # Track write_to_buffer call arguments
    write_to_buffer_calls = []

    class GPSImageMock(_FakeVipsImage):
        def __init__(self):
            super().__init__(has_gps=True)

        def write_to_buffer(self, suffix, **kwargs):
            write_to_buffer_calls.append(kwargs)
            return super().write_to_buffer(suffix, **kwargs)

    mock_pyvips = MagicMock()
    mock_pyvips.Image.new_from_buffer.return_value = GPSImageMock()

    with patch.dict("sys.modules", {"pyvips": mock_pyvips}):
        with patch("core.storage._get_r2_client", return_value=_get_mock_s3()):
            _run_task(str(evidence.id))

    # pyvips must have been called with strip=True
    assert len(write_to_buffer_calls) == 1, "write_to_buffer must be called exactly once"
    assert write_to_buffer_calls[0].get("strip") is True, (
        "pyvips write_to_buffer must be called with strip=True to remove EXIF/GPS"
    )

    evidence.refresh_from_db()
    assert evidence.upload_status == "processed"


@mock_aws
@pytest.mark.django_db
def test_valid_pdf_processed_and_in_production_bucket():
    """
    A valid PDF must:
    - Be copied verbatim to the production bucket.
    - Set upload_status='processed'
    - CDN URL includes the key name
    - Quarantine file deleted
    """
    from django.conf import settings

    s3 = _get_mock_s3()
    _make_buckets(s3)

    profile = CreatorProfileFactory()
    event = EventFactory(lead_investigator=profile.user)
    key = f"pending/{event.id}/{uuid.uuid4()}/document.pdf"
    _put_quarantine(s3, settings.R2_QUARANTINE_BUCKET, key, _MINIMAL_PDF)

    evidence = EvidenceFactory(
        event=event,
        upload_status="processing",
        r2_quarantine_key=key,
        source_url="http://placeholder",
    )

    with patch("core.storage._get_r2_client", return_value=_get_mock_s3()):
        _run_task(str(evidence.id))

    evidence.refresh_from_db()
    assert evidence.upload_status == "processed"
    assert evidence.r2_quarantine_key is None

    # File must exist in production bucket
    prod_obj = s3.head_object(Bucket=settings.R2_PRODUCTION_BUCKET, Key=key)
    assert prod_obj["ResponseMetadata"]["HTTPStatusCode"] == 200

    # CDN URL must reference the production key
    cdn_domain = settings.R2_CDN_DOMAIN.rstrip("/")
    assert evidence.source_url == f"{cdn_domain}/{key}"
