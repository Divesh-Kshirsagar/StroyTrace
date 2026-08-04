/**
 * Tests for EvidenceUploader (Task 9.1)
 *
 * Acceptance criteria
 * -------------------
 * - File exceeding 5 MB is rejected before any API call (no fetch mock called)
 * - Disallowed file type is rejected before any API call
 * - Valid upload sequence: Uppy restrictions are configured with correct values
 * - URL tab submits without making any fetch call
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';


// ---------------------------------------------------------------------------
// Mock Uppy — capture constructor options so we can assert restrictions
// ---------------------------------------------------------------------------
let capturedUppyOptions: any = null;
let capturedAwsS3Options: any = null;

vi.mock('@uppy/core', () => {
  const mockMethods = {
    use: vi.fn().mockImplementation(function (this: any, _Plugin: any, opts: any) {
      if (opts?.getUploadParameters) capturedAwsS3Options = opts;
      return this;
    }),
    on: vi.fn().mockReturnThis(),
    off: vi.fn().mockReturnThis(),
    setFileMeta: vi.fn(),
    getState: vi.fn(() => ({ files: {} })),
    destroy: vi.fn(),
  };

  function Uppy(this: any, opts: any) {
    capturedUppyOptions = opts;
    Object.assign(this, {
      ...mockMethods,
      use: vi.fn().mockImplementation(function (this: any, _Plugin: any, pluginOpts: any) {
        if (pluginOpts?.getUploadParameters) capturedAwsS3Options = pluginOpts;
        return this;
      }),
      on: vi.fn().mockReturnThis(),
      off: vi.fn().mockReturnThis(),
    });
  }
  return { default: Uppy };
});

vi.mock('@uppy/aws-s3', () => ({ default: vi.fn() }));

vi.mock('@uppy/react', () => ({
  Dashboard: () => <div data-testid="uppy-dashboard">Uppy Dashboard</div>,
}));

vi.mock('@uppy/core/dist/style.min.css', () => ({}));
vi.mock('@uppy/dashboard/dist/style.min.css', () => ({}));

// ---------------------------------------------------------------------------
// Mock EditorContext
// ---------------------------------------------------------------------------
const mockAddEvidenceToQueue = vi.fn();

vi.mock('../../context/EditorContext', () => ({
  useEditor: () => ({
    event: {
      slug: 'test-event',
      id: 'abc123',
      title: 'Test',
      status: 'draft',
      created_at: '',
      updated_at: '',
      lead_investigator: { handle: 'test', display_name: 'Test', avatar_url: null },
      topics: [],
    },
    addEvidenceToQueue: mockAddEvidenceToQueue,
    isEditing: true,
    narrative: { content: '', isDirty: false, isSaving: false },
    evidenceQueue: [],
    evidenceIsDirty: false,
    isCreating: false,
    isPublishing: false,
    error: null,
    setEvent: vi.fn(),
    setNarrativeContent: vi.fn(),
    saveNarrative: vi.fn(),
    removeEvidence: vi.fn(),
    updateEvidenceOrder: vi.fn(),
    setError: vi.fn(),
    createEventShell: vi.fn(),
    publishEvent: vi.fn(),
  }),
}));

vi.mock('@/generated', () => ({
  appsEventsRoutersCreateEvidence: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import EvidenceUploader from '../EvidenceUploader';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderUploader(isOpen = true) {
  const onClose = vi.fn();
  const utils = render(<EvidenceUploader isOpen={isOpen} onClose={onClose} />);
  return { ...utils, onClose };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EvidenceUploader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedUppyOptions = null;
    capturedAwsS3Options = null;
    global.fetch = vi.fn();
  });

  it('does not render when isOpen is false', () => {
    renderUploader(false);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders the modal with two tabs when open', () => {
    renderUploader();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Add by URL')).toBeInTheDocument();
    expect(screen.getByText('Upload File')).toBeInTheDocument();
  });

  it('shows the URL form on "Add by URL" tab (default)', () => {
    renderUploader();
    expect(screen.getByText('Source URL')).toBeInTheDocument();
  });

  it('switches to Upload File tab and shows Uppy dashboard', () => {
    renderUploader();
    fireEvent.click(screen.getByText('Upload File'));
    expect(screen.getByTestId('uppy-dashboard')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // R5.2 / R5.3 — Client-side restrictions must be set via Uppy options
  // ---------------------------------------------------------------------------
  it('configures Uppy with 5 MB maxFileSize restriction (R5.3)', () => {
    renderUploader();
    expect(capturedUppyOptions?.restrictions?.maxFileSize).toBe(5_242_880);
  });

  it('configures Uppy with allowed MIME type restrictions (R5.2)', () => {
    renderUploader();
    const allowed = capturedUppyOptions?.restrictions?.allowedFileTypes ?? [];
    expect(allowed).toContain('image/jpeg');
    expect(allowed).toContain('image/png');
    expect(allowed).toContain('image/webp');
    expect(allowed).toContain('application/pdf');
  });

  it('getUploadParameters calls /evidence/upload-url (R5.4)', async () => {
    renderUploader();

    // capturedAwsS3Options is set by the .use(AwsS3, opts) call inside the hook
    expect(capturedAwsS3Options).not.toBeNull();

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        evidence_id: 'ev-123',
        upload_url: 'https://r2.example.com/upload',
        fields: { key: 'pending/abc/photo.jpg' },
      }),
    });

    const result = await capturedAwsS3Options!.getUploadParameters({
      id: 'file-1',
      name: 'photo.jpg',
      type: 'image/jpeg',
    });

    expect(global.fetch).toHaveBeenCalledOnce();
    const calledUrl = (global.fetch as any).mock.calls[0][0] as string;
    expect(calledUrl).toContain('/api/v1/events/test-event/evidence/upload-url');
    expect(calledUrl).toContain('content_type=image%2Fjpeg');

    expect(result.method).toBe('POST');
    expect(result.url).toBe('https://r2.example.com/upload');
  });

  // ---------------------------------------------------------------------------
  // URL tab: no fetch on URL-based form submit
  // ---------------------------------------------------------------------------
  it('URL tab: submitting a valid URL does NOT call fetch (R5.2)', async () => {
    renderUploader();

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'image' } });
    fireEvent.change(screen.getByPlaceholderText('https://...'), {
      target: { value: 'https://example.com/photo.jpg' },
    });
    fireEvent.click(screen.getByText('Add to Board'));

    await waitFor(() => {
      expect(mockAddEvidenceToQueue).toHaveBeenCalledTimes(1);
    });

    // No fetch was called — URL is added directly, no API needed for URL tab
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
