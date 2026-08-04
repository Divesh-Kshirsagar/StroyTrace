# Architecture Decision Record: Direct-to-Cloud Evidence Upload

## Context and Problem Statement
When investigators upload evidence (images, PDFs) for an event, routing these uploads through our Django backend or Next.js frontend introduces several bottlenecks and security risks:
1. **Serverless Limits:** The Next.js frontend on Vercel is subject to strict request payload size limits (4.5 MB), preventing large evidence uploads.
2. **Resource Consumption:** Routing large files through the Django backend (VPS) consumes significant RAM and bandwidth, tying up worker threads for long-lived upload connections.
3. **Security:** Malicious files could be uploaded and immediately served if they bypass validation, or could exploit image parsing libraries on the server during synchronous processing.

## Decision: Direct-to-Cloud Upload with Quarantine
We have adopted a **Direct-to-Cloud (Presigned POST)** upload pattern paired with an asynchronous **Quarantine-to-Production** pipeline.

### Flow
1. **Upload Initiation:** The client requests an upload URL from Django (`GET /evidence/upload-url`). Django verifies permissions, generates a stub `Evidence` record (`upload_status='pending_upload'`), and returns a presigned Cloudflare R2 POST URL for the **quarantine bucket**. This presigned URL enforces size limits (max 5 MB) and specific MIME types via POST policy conditions.
2. **Direct Upload:** The client uploads the file directly to the R2 quarantine bucket using Uppy, bypassing our application servers entirely.
3. **Confirmation:** The client notifies Django that the upload is complete (`POST /evidence/{id}/confirm-upload`). Django transitions the status to `processing` and enqueues a Celery validation task.
4. **Validation and Processing (Celery Worker):**
   - **Magic Number Check:** The worker downloads *only the first 261 bytes* of the quarantined file and uses `python-magic` to reliably determine the true MIME type (preventing spoofed extensions).
   - **Re-encoding and Stripping:** For images, the worker downloads the full file and processes it using `pyvips`. Pyvips strips all EXIF/GPS metadata and re-encodes the image to WebP (Q=85) using an efficient streaming pipeline that avoids loading the entire uncompressed pixel buffer into memory.
   - **Promotion:** Valid PDFs are copied verbatim, and processed WebPs are uploaded to the **production bucket**.
   - **Cleanup:** The quarantine file is deleted, and the database record is updated to `processed` with the final CDN URL. If validation fails, the quarantine file is deleted, and the status becomes `failed`.

### Rationale
- **Performance:** Bypasses Vercel's payload limits and frees up Django web threads.
- **Security:** Files in the quarantine bucket are never publicly readable. They are only promoted to the production bucket after strict magic-number validation and metadata stripping, preventing the spread of malicious files or sensitive EXIF data.
- **Resource Efficiency:** `pyvips` is chosen over `Pillow` because of its lower memory footprint for processing large images, mitigating Denial of Service (DoS) risks via image bombs.

## Affected Components
- **Backend:** `apps.events.routers`, `apps.events.tasks`, `apps.events.models`, `core.storage`
- **Frontend:** `EvidenceUploader.tsx`, `EvidenceBoard.tsx` (now handles asynchronous polling of `upload_status`).
- **Infrastructure:** Two R2 buckets (`storytrace-quarantine` and `storytrace-evidence-public`), Redis (Celery broker), and a Celery worker service.

## Consequences
- **Positive:** Improved scalability, robust security isolation, reduced server load.
- **Negative:** Increased architectural complexity (requires background workers, polling on the frontend, and dual storage buckets).
