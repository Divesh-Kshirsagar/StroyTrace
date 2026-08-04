"""
Celery tasks for the secure-evidence-upload feature.

Flow
----
1. Worker downloads the first 261 bytes of the quarantined file.
2. `python-magic` inspects the magic number to determine the true MIME type.
3. Disallowed MIME → delete quarantine file, mark Evidence as 'failed'.
4. Image (JPEG/PNG/WebP) → pyvips strips metadata + re-encodes to WebP Q=85.
5. PDF → copy object verbatim to production bucket.
6. Delete quarantine file.
7. Update Evidence: source_url = CDN URL, upload_status = 'processed',
   r2_quarantine_key = None.

Security notes
--------------
- We only download 261 bytes for the magic-number check (not the full file)
  to minimise exposure to malicious payloads.
- pyvips streams the image through a pipeline and never loads the full decoded
  pixel buffer into RAM simultaneously (R8.1 compliance).
- Files are never served from the production bucket until this task succeeds
  (R7.2 compliance).
"""

import io
import logging
import os

import magic
from celery import shared_task
from django.conf import settings

log = logging.getLogger(__name__)

ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
}

IMAGE_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}

# Number of bytes required by libmagic for a reliable MIME-type detection
MAGIC_HEADER_BYTES = 261


def _build_cdn_url(production_key: str) -> str:
    """Build the public CDN URL for a processed evidence file."""
    cdn_domain = settings.R2_CDN_DOMAIN.rstrip("/")
    return f"{cdn_domain}/{production_key}"


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def validate_and_process_evidence(self, evidence_id: str) -> None:
    """
    Validate and process an uploaded evidence file.

    Parameters
    ----------
    evidence_id:
        String UUID of the ``Evidence`` record to process.
    """
    from apps.events.models import Evidence  # local import to avoid circular
    from core.storage import _get_r2_client

    try:
        evidence = Evidence.objects.get(id=evidence_id)
    except Evidence.DoesNotExist:
        log.error("validate_and_process_evidence: Evidence %s not found", evidence_id)
        return

    quarantine_key = evidence.r2_quarantine_key
    if not quarantine_key:
        log.error(
            "validate_and_process_evidence: Evidence %s has no quarantine key",
            evidence_id,
        )
        evidence.upload_status = "failed"
        evidence.save(update_fields=["upload_status"])
        return

    s3 = _get_r2_client()
    quarantine_bucket = settings.R2_QUARANTINE_BUCKET
    production_bucket = settings.R2_PRODUCTION_BUCKET

    try:
        # ------------------------------------------------------------------
        # Step 1: Download only the first 261 bytes for magic-number check
        # ------------------------------------------------------------------
        range_header = f"bytes=0-{MAGIC_HEADER_BYTES - 1}"
        head_response = s3.get_object(
            Bucket=quarantine_bucket,
            Key=quarantine_key,
            Range=range_header,
        )
        header_bytes = head_response["Body"].read()

        # ------------------------------------------------------------------
        # Step 2: Detect true MIME type
        # ------------------------------------------------------------------
        mime = magic.from_buffer(header_bytes, mime=True)

        if mime not in ALLOWED_MIME_TYPES:
            log.warning(
                "validate_and_process_evidence: Rejected %s — detected MIME '%s'",
                evidence_id,
                mime,
            )
            s3.delete_object(Bucket=quarantine_bucket, Key=quarantine_key)
            evidence.upload_status = "failed"
            evidence.r2_quarantine_key = None
            evidence.save(update_fields=["upload_status", "r2_quarantine_key"])
            return

        # ------------------------------------------------------------------
        # Step 3a: Images — re-encode as WebP Q=85, strip all metadata
        # ------------------------------------------------------------------
        if mime in IMAGE_MIME_TYPES:
            import pyvips  # imported here so tests without libvips can mock

            # Download the full image
            full_response = s3.get_object(
                Bucket=quarantine_bucket,
                Key=quarantine_key,
            )
            image_bytes = full_response["Body"].read()

            # Load via pyvips from a buffer; strip=True removes EXIF/GPS/ICC
            vips_image = pyvips.Image.new_from_buffer(image_bytes, "")
            webp_buffer = vips_image.write_to_buffer(".webp", Q=85, strip=True)

            # Build production key with .webp extension
            base_key = os.path.splitext(quarantine_key)[0]
            production_key = f"{base_key}.webp"

            # Upload re-encoded WebP to production bucket
            s3.put_object(
                Bucket=production_bucket,
                Key=production_key,
                Body=io.BytesIO(webp_buffer),
                ContentType="image/webp",
            )

        # ------------------------------------------------------------------
        # Step 3b: PDFs — copy object verbatim to production bucket
        # ------------------------------------------------------------------
        else:
            production_key = quarantine_key
            s3.copy_object(
                Bucket=production_bucket,
                CopySource={"Bucket": quarantine_bucket, "Key": quarantine_key},
                Key=production_key,
            )

        # ------------------------------------------------------------------
        # Step 4: Delete quarantine file
        # ------------------------------------------------------------------
        s3.delete_object(Bucket=quarantine_bucket, Key=quarantine_key)

        # ------------------------------------------------------------------
        # Step 5: Update Evidence record
        # ------------------------------------------------------------------
        evidence.source_url = _build_cdn_url(production_key)
        evidence.upload_status = "processed"
        evidence.r2_quarantine_key = None
        evidence.save(update_fields=["source_url", "upload_status", "r2_quarantine_key"])

        log.info(
            "validate_and_process_evidence: Evidence %s processed → %s",
            evidence_id,
            evidence.source_url,
        )

    except Exception as exc:
        log.exception(
            "validate_and_process_evidence: Error processing %s — retrying",
            evidence_id,
        )
        evidence.upload_status = "failed"
        evidence.save(update_fields=["upload_status"])
        raise self.retry(exc=exc)
