'use client';
import { createContext, useContext, useState, ReactNode } from 'react';
import type { EventFullSchema, EvidenceSchema } from '@/generated/types.gen';
import { 
  appsEventsRoutersCreateEvent,
  appsEventsRoutersUpdateEvent,
  appsEventsRoutersUpdateNarrative,
  appsEventsRoutersCreateEvidence
} from '@/generated';

interface EditorState {
  event: EventFullSchema['event'] | null;
  narrative: { content: string; isDirty: boolean; isSaving: boolean };
  evidenceQueue: EvidenceSchema[];
  evidenceIsDirty: boolean;
  isCreating: boolean;
  isEditing: boolean;
  isPublishing: boolean;
  error: string | null;
}

interface EditorContextType extends EditorState {
  setEvent: (event: EventFullSchema['event'] | null) => void;
  setNarrativeContent: (content: string) => void;
  saveNarrative: () => Promise<void>;
  addEvidenceToQueue: (evidence: any) => void;
  removeEvidence: (id: string) => Promise<void>;
  updateEvidenceOrder: (newOrder: EvidenceSchema[]) => Promise<void>;
  setError: (error: string | null) => void;
  createEventShell: (title: string, summary: string, startDate: string, topicSlugs: string[]) => Promise<void>;
  publishEvent: () => Promise<void>;
}

const EditorContext = createContext<EditorContextType | null>(null);

export const EditorProvider = ({ children, initialEvent = null }: { children: ReactNode, initialEvent?: EventFullSchema | null }) => {
  const [event, setEvent] = useState<EventFullSchema['event'] | null>(initialEvent?.event || null);
  const [narrative, setNarrative] = useState({ content: initialEvent?.narrative?.content || '', isDirty: false, isSaving: false });
  const [evidenceQueue, setEvidenceQueue] = useState<EvidenceSchema[]>(initialEvent?.evidence || []);
  const [evidenceIsDirty, setEvidenceIsDirty] = useState(false);
  
  const [isCreating, setIsCreating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!initialEvent;

  const setNarrativeContent = (content: string) => {
    if (content !== narrative.content) {
      setNarrative({ content, isDirty: true, isSaving: false });
    }
  };

  const saveNarrative = async () => {
    if (!event || !narrative.isDirty) return;
    setNarrative(prev => ({ ...prev, isSaving: true }));
    try {
      await appsEventsRoutersUpdateNarrative({
        path: { slug: event.slug },
          body: { content: narrative.content, is_published: true }
      });
      setNarrative(prev => ({ ...prev, isDirty: false, isSaving: false }));
    } catch (err: any) {
      console.error(err);
      setNarrative(prev => ({ ...prev, isSaving: false }));
      // keeping isDirty true so it retries
    }
  };

  const addEvidenceToQueue = (evidence: any) => {
    // Optimistic evidence item
    const optimistic: EvidenceSchema = {
      id: crypto.randomUUID(),
      media_type: evidence.media_type,
      source_url: evidence.source_url,
      thumbnail_url: evidence.thumbnail_url || null,
      caption: evidence.caption || null,
      display_order: evidenceQueue.length,
      created_at: new Date().toISOString()
    };
    const newQueue = [...evidenceQueue, optimistic];
    setEvidenceQueue(newQueue);
    setEvidenceIsDirty(true);
    
    // Auto-save evidence for edit mode
    if (isEditing && event) {
      appsEventsRoutersCreateEvidence({
        path: { slug: event.slug },
          body: {
          media_type: optimistic.media_type,
          source_url: optimistic.source_url,
          thumbnail_url: optimistic.thumbnail_url || undefined,
          caption: optimistic.caption || undefined,
          display_order: optimistic.display_order
        }
      }).catch(console.error);
    }
  };

  const removeEvidence = async (id: string) => {
    setEvidenceQueue(prev => prev.filter(e => e.id !== id));
    if (isEditing && event) {
      try {
        const { appsEventsRoutersDeleteEvidence } = await import('@/generated');
        await appsEventsRoutersDeleteEvidence({ slug: event.slug, evidence_id: id } as any);
      } catch (err) {
        console.error("Failed to delete evidence", err);
      }
    }
  };

  const updateEvidenceOrder = async (newOrder: EvidenceSchema[]) => {
    setEvidenceQueue(newOrder);
    if (isEditing && event) {
      try {
        const { appsEventsRoutersReorderEvidence } = await import('@/generated');
        await appsEventsRoutersReorderEvidence({
          path: { slug: event.slug },
          body: { evidence_ids: newOrder.map(e => e.id) }
        } as any);
      } catch (err) {
        console.error("Failed to reorder evidence", err);
      }
    }
  };

  const createEventShell = async (title: string, summary: string, startDate: string, topicSlugs: string[]) => {
    setIsCreating(true);
    setError(null);
    try {
      const { data: res } = await appsEventsRoutersCreateEvent({
        body: {
          title,
          summary,
          start_date: startDate,
          topic_slugs: topicSlugs
        }
      } as any);
      setEvent(res!);
    } catch (err: any) {
      setError(err?.body?.detail || "Failed to create event shell");
      throw err;
    } finally {
      setIsCreating(false);
    }
  };

  const publishEvent = async () => {
    if (!event) return;
    setIsPublishing(true);
    setError(null);
    try {
      if (narrative.isDirty) {
        await appsEventsRoutersUpdateNarrative({
          path: { slug: event.slug },
          body: { content: narrative.content, is_published: true }
        } as any);
        setNarrative(prev => ({ ...prev, isDirty: false }));
      }
      
      if (evidenceIsDirty) {
        for (const item of evidenceQueue) {
          // In a real app we'd track which items are new vs already in DB
          await appsEventsRoutersCreateEvidence({
            path: { slug: event.slug },
            body: {
              media_type: item.media_type,
              source_url: item.source_url,
              thumbnail_url: item.thumbnail_url || undefined,
              caption: item.caption || undefined,
              display_order: item.display_order
            }
          } as any);
        }
        setEvidenceIsDirty(false);
      }

      const { data: res } = await appsEventsRoutersUpdateEvent({
        path: { slug: event.slug },
        body: { status: 'published' }
      } as any);
      setEvent(res || null);
      
      // Usually you'd redirect here or let the parent component handle it
    } catch (err: any) {
      setError(err?.body?.detail || "Failed to publish event");
      throw err;
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <EditorContext.Provider value={{
      event, narrative, evidenceQueue, evidenceIsDirty, isCreating, isEditing, isPublishing, error,
      setEvent, setNarrativeContent, saveNarrative, addEvidenceToQueue, removeEvidence, updateEvidenceOrder, setError, createEventShell, publishEvent
    }}>
      {children}
    </EditorContext.Provider>
  );
};

export const useEditor = () => {
  const context = useContext(EditorContext);
  if (!context) throw new Error("useEditor must be used within EditorProvider");
  return context;
};
