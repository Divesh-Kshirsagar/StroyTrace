'use client';
/**
 * EvidenceUploader — two-tab modal for the Event Editor evidence panel.
 *
 * Tab 1: "Add by URL"  — existing URL form (moved from AddEvidenceModal, no logic changes)
 * Tab 2: "Upload File" — Uppy Dashboard with AwsS3 plugin pointing at R2
 *
 * Upload flow (Task 7.2 spec):
 *  1. getUploadParameters(file): GET /evidence/upload-url?filename=...&content_type=...
 *     → returns { evidence_id, upload_url, fields }
 *  2. Uppy posts the file directly to R2 using the presigned POST (browser never goes via Django)
 *  3. On Uppy `upload-success`: POST /evidence/{evidence_id}/confirm-upload
 *     → triggers the Celery worker to validate & move to production bucket
 *
 * Client-side restrictions (R5.2, R5.3):
 *  - allowedFileTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
 *  - maxFileSize: 5_242_880 (5 MB)
 *
 * These reject the file BEFORE any API call, satisfying the spec's pre-flight check.
 */
import { useState, useEffect, useRef } from 'react';
import Uppy from '@uppy/core';
import AwsS3 from '@uppy/aws-s3';
import { Dashboard } from '@uppy/react';
import '@uppy/core/dist/style.min.css';
import '@uppy/dashboard/dist/style.min.css';

import { useEditor } from '../context/EditorContext';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { evidenceSchema } from '../schemas';
import { z } from 'zod';
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@/shared/components/ui/field';

type FormValues = z.infer<typeof evidenceSchema>;

type TabId = 'url' | 'upload';

interface EvidenceUploaderProps {
  isOpen: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Uppy instance — created once per component mount
// ---------------------------------------------------------------------------

function useUppyInstance(eventSlug: string | null, onSuccess: (evidenceId: string) => void) {
  const uppyRef = useRef<Uppy | null>(null);

  if (!uppyRef.current) {
    const uppy = new Uppy({
      restrictions: {
        allowedFileTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
        maxFileSize: 5_242_880, // 5 MB — R5.3
        maxNumberOfFiles: 1,
      },
      autoProceed: false,
    });

    uppy.use(AwsS3, {
      // v4 API: shouldUseMultipart:false enables single-part presigned POST mode
      shouldUseMultipart: false,
      // Task 7.2: getUploadParameters calls GET /evidence/upload-url
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async getUploadParameters(file: any, _options: any) {
        if (!eventSlug) throw new Error('No event slug available');

        const contentType = file.type ?? 'application/octet-stream';
        const filename = encodeURIComponent(file.name ?? 'upload');

        const res = await fetch(
          `/api/v1/events/${eventSlug}/evidence/upload-url` +
            `?filename=${filename}&content_type=${encodeURIComponent(contentType)}`,
          {
            headers: {
              Authorization: `Bearer ${
                typeof document !== 'undefined'
                  ? document.cookie.match(/access_token=([^;]+)/)?.[1] ?? ''
                  : ''
              }`,
            },
          },
        );

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.detail ?? 'Failed to get upload URL');
        }

        const { evidence_id, upload_url, fields } = await res.json();

        // Store evidence_id on the file for later use in upload-success handler
        uppy.setFileMeta(file.id, { evidence_id });

        return {
          method: 'POST' as const,
          url: upload_url,
          fields,
          headers: {},
        };
      },
    } as any);

    uppyRef.current = uppy;
  }

  useEffect(() => {
    const uppy = uppyRef.current!;

    const handler = (_file: unknown, _response: unknown) => {
      const f = _file as { meta?: { evidence_id?: string } };
      const evidenceId = f?.meta?.evidence_id;
      if (!evidenceId || !eventSlug) return;

      // Task 7.2: On upload-success call confirm-upload
      fetch(`/api/v1/events/${eventSlug}/evidence/${evidenceId}/confirm-upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${
            typeof document !== 'undefined'
              ? document.cookie.match(/access_token=([^;]+)/)?.[1] ?? ''
              : ''
          }`,
        },
      })
        .then((res) => res.json())
        .then(() => onSuccess(evidenceId))
        .catch(console.error);
    };

    uppy.on('upload-success', handler);
    return () => {
      uppy.off('upload-success', handler);
    };
  }, [eventSlug, onSuccess]);

  return uppyRef.current;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function EvidenceUploader({ isOpen, onClose }: EvidenceUploaderProps) {
  const { addEvidenceToQueue, event, isEditing } = useEditor();
  const [activeTab, setActiveTab] = useState<TabId>('url');

  // Track uploaded evidence IDs so we can add stubs to the board
  const handleUploadSuccess = (evidenceId: string) => {
    // Add a processing stub to the board immediately (optimistic)
    addEvidenceToQueue({
      id: evidenceId,
      media_type: 'image',
      source_url: 'http://placeholder',
      upload_status: 'processing',
      caption: null,
      thumbnail_url: null,
    });
    onClose();
  };

  const uppy = useUppyInstance(event?.slug ?? null, handleUploadSuccess);

  // --- URL tab form ---
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(evidenceSchema),
    defaultValues: { mediaType: 'youtube', sourceUrl: '', caption: '' },
  });

  const onUrlSubmit = (data: FormValues) => {
    let thumbnailUrl: string | null = null;
    if (data.mediaType === 'youtube') {
      const videoId =
        data.sourceUrl.split('v=')[1]?.split('&')[0] ||
        data.sourceUrl.split('youtu.be/')[1]?.split('?')[0];
      if (videoId) thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    }

    addEvidenceToQueue({
      media_type: data.mediaType,
      source_url: data.sourceUrl,
      thumbnail_url: thumbnailUrl,
      caption: data.caption || '',
    });

    reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      id="evidence-uploader-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Add Evidence"
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4"
    >
      <div className="bg-white dark:bg-zinc-900 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-0">
          <h2 className="text-xl font-bold">Add Evidence</h2>
          <button
            id="evidence-uploader-close"
            aria-label="Close"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-700 mt-4 px-6">
          {(['url', 'upload'] as TabId[]).map((tab) => (
            <button
              key={tab}
              id={`evidence-tab-${tab}`}
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2 px-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              {tab === 'url' ? 'Add by URL' : 'Upload File'}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* --- Tab: Add by URL --- */}
          {activeTab === 'url' && (
            <form onSubmit={handleSubmit(onUrlSubmit)} className="space-y-4">
              <FieldGroup>
                <Field data-invalid={!!errors.mediaType ? '' : undefined}>
                  <FieldLabel>Media Type</FieldLabel>
                  <select
                    {...register('mediaType')}
                    className="w-full rounded-md border border-zinc-300 p-2 dark:bg-zinc-800 dark:border-zinc-700"
                    aria-invalid={!!errors.mediaType}
                  >
                    <option value="youtube">YouTube Video</option>
                    <option value="instagram">Instagram Post</option>
                    <option value="image">Image (URL)</option>
                    <option value="document">Document (URL)</option>
                  </select>
                  {errors.mediaType && (
                    <FieldDescription className="text-destructive">
                      {errors.mediaType.message}
                    </FieldDescription>
                  )}
                </Field>

                <Field data-invalid={!!errors.sourceUrl ? '' : undefined}>
                  <FieldLabel>Source URL</FieldLabel>
                  <Input
                    {...register('sourceUrl')}
                    placeholder="https://..."
                    aria-invalid={!!errors.sourceUrl}
                  />
                  {errors.sourceUrl && (
                    <FieldDescription className="text-destructive">
                      {errors.sourceUrl.message}
                    </FieldDescription>
                  )}
                </Field>

                <Field data-invalid={!!errors.caption ? '' : undefined}>
                  <FieldLabel>Caption (Optional)</FieldLabel>
                  <Input
                    {...register('caption')}
                    placeholder="What does this show?"
                    aria-invalid={!!errors.caption}
                  />
                  {errors.caption && (
                    <FieldDescription className="text-destructive">
                      {errors.caption.message}
                    </FieldDescription>
                  )}
                </Field>
              </FieldGroup>

              <div className="flex justify-end gap-2 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    reset();
                    onClose();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={Object.keys(errors).length > 0}>
                  Add to Board
                </Button>
              </div>
            </form>
          )}

          {/* --- Tab: Upload File --- */}
          {activeTab === 'upload' && (
            <div>
              {!isEditing ? (
                <p className="text-sm text-zinc-500 text-center py-8">
                  Save the event shell first before uploading files.
                </p>
              ) : (
                <div id="uppy-dashboard-container">
                  <Dashboard
                    uppy={uppy}
                    height={320}
                    showProgressDetails
                    proudlyDisplayPoweredByUppy={false}
                    note="Allowed: JPEG, PNG, WebP, PDF · Max 5 MB"
                    theme="auto"
                  />
                  <p className="text-xs text-zinc-400 mt-2 text-center">
                    Files are uploaded directly to secure cloud storage and validated before being
                    made public.
                  </p>
                </div>
              )}
              <div className="flex justify-end mt-4">
                <Button type="button" variant="outline" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
