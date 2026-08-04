/**
 * Tests for EvidenceBoard (Task 9.2)
 *
 * Acceptance criteria
 * -------------------
 * - Card with upload_status='processing' renders spinner, no <img> or <a> tag
 * - Card with upload_status='failed' renders error state and remove button
 * - Card with upload_status='processed' renders source_url as image/link
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';


// ---------------------------------------------------------------------------
// Mock @/generated types (EvidenceSchema)
// ---------------------------------------------------------------------------
vi.mock('@/generated', () => ({
  // Just re-export the type — runtime value isn't needed
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
import EvidenceBoard from '../EvidenceBoard';
import type { EvidenceSchema } from '@/generated';

function makeEvidence(overrides: Partial<EvidenceSchema> & { upload_status?: string }): EvidenceSchema {
  return {
    id: crypto.randomUUID(),
    media_type: 'image',
    source_url: 'https://cdn.example.com/photo.webp',
    thumbnail_url: 'https://cdn.example.com/thumb.webp',
    caption: 'Test caption',
    display_order: 0,
    created_at: new Date().toISOString(),
    upload_status: 'url_based',
    ...overrides,
  } as EvidenceSchema;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EvidenceBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Processing state
  // -------------------------------------------------------------------------
  describe('upload_status = processing', () => {
    it('renders a spinner and no <img> or <a> tag', () => {
      const evidence = [makeEvidence({ upload_status: 'processing' })];
      const { container } = render(
        <EvidenceBoard evidence={evidence} publicView={false} />,
      );

      // Card is in the DOM
      expect(screen.getByTestId('evidence-card-processing')).toBeInTheDocument();

      // Has a spinner / status indicator
      expect(screen.getByRole('status')).toBeInTheDocument();

      // NO <img> element — R6.1
      expect(container.querySelector('img')).toBeNull();

      // NO <a> element — R6.1
      expect(container.querySelector('a')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Failed state
  // -------------------------------------------------------------------------
  describe('upload_status = failed', () => {
    it('renders error state and a remove button', () => {
      const onRemove = vi.fn();
      const evidence = [makeEvidence({ upload_status: 'failed' })];
      render(
        <EvidenceBoard evidence={evidence} publicView={false} onRemove={onRemove} />,
      );

      expect(screen.getByTestId('evidence-card-failed')).toBeInTheDocument();
      expect(screen.getByText('Upload failed')).toBeInTheDocument();

      const removeBtn = screen.getByRole('button', { name: /remove failed evidence/i });
      expect(removeBtn).toBeInTheDocument();
    });

    it('calls onRemove with the correct evidence ID when remove button is clicked', () => {
      const onRemove = vi.fn();
      const evidence = [makeEvidence({ id: 'ev-failed-1', upload_status: 'failed' })];
      render(
        <EvidenceBoard evidence={evidence} publicView={false} onRemove={onRemove} />,
      );

      fireEvent.click(screen.getByRole('button', { name: /remove failed evidence/i }));
      expect(onRemove).toHaveBeenCalledWith('ev-failed-1');
    });
  });

  // -------------------------------------------------------------------------
  // Processed state
  // -------------------------------------------------------------------------
  describe('upload_status = processed', () => {
    it('renders the source_url as an image/link', () => {
      const evidence = [
        makeEvidence({
          id: 'ev-processed-1',
          upload_status: 'processed',
          source_url: 'https://cdn.example.com/photo.webp',
          thumbnail_url: 'https://cdn.example.com/thumb.webp',
        }),
      ];
      const { container } = render(
        <EvidenceBoard evidence={evidence} publicView={false} />,
      );

      expect(screen.getByTestId('evidence-card-ready')).toBeInTheDocument();

      // Should render <img> — R9.2 spec says "renders source_url as image/link"
      const img = container.querySelector('img');
      expect(img).not.toBeNull();
      expect(img?.getAttribute('src')).toBe('https://cdn.example.com/thumb.webp');

      // Should render <a> with source_url
      const link = container.querySelector('a');
      expect(link).not.toBeNull();
      expect(link?.getAttribute('href')).toBe('https://cdn.example.com/photo.webp');
    });
  });

  // -------------------------------------------------------------------------
  // URL-based state (existing behavior preserved)
  // -------------------------------------------------------------------------
  describe('upload_status = url_based', () => {
    it('renders the media card with image and link', () => {
      const evidence = [
        makeEvidence({
          upload_status: 'url_based',
          source_url: 'https://example.com/doc.pdf',
          thumbnail_url: null,
          media_type: 'document',
        }),
      ];
      render(
        <EvidenceBoard evidence={evidence} publicView={false} />,
      );

      expect(screen.getByTestId('evidence-card-ready')).toBeInTheDocument();
      // No thumbnail → shows media_type label
      expect(screen.getByText('document')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Public view filtering (R6.4)
  // -------------------------------------------------------------------------
  describe('publicView=true filtering', () => {
    it('hides processing and failed evidence in public view', () => {
      const evidence = [
        makeEvidence({ id: 'proc', upload_status: 'processing' }),
        makeEvidence({ id: 'fail', upload_status: 'failed' }),
        makeEvidence({ id: 'done', upload_status: 'processed', caption: 'Visible item' }),
      ];
      render(
        <EvidenceBoard evidence={evidence} publicView={true} />,
      );

      // processing and failed cards must NOT be visible
      expect(screen.queryByTestId('evidence-card-processing')).toBeNull();
      expect(screen.queryByTestId('evidence-card-failed')).toBeNull();

      // processed card must be visible
      expect(screen.getByTestId('evidence-card-ready')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Empty state
  // -------------------------------------------------------------------------
  it('shows empty state when evidence list is empty', () => {
    render(<EvidenceBoard evidence={[]} />);
    expect(
      screen.getByText(/no evidence has been attached/i),
    ).toBeInTheDocument();
  });
});
