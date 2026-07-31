'use client';
import { createContext, useContext, useState, ReactNode } from 'react';
import type { EventFullSchema, EvidenceSchema } from '@/generated/types.gen';
import { 
  appsEventsRoutersCreateEvent,
  appsEventsRoutersUpdateEvent,
  appsEventsRoutersUpdateNarrative,
  appsEventsRoutersCreateEvidence
} from '@/generated/services.gen';

interface EditorState {
  event: EventFullSchema['event'] | null;
  narrative: { content: string; isDirty: boolean; isSaving: boolean };
  evidenceQueue: EvidenceSchema[];
  evidenceIsDirty: boolean;
  isCreating: boolean;
  isPublishing: boolean;
  error: string | null;
}

interface EditorContextType extends EditorState {
  setEvent: (event: EventFullSchema['event'] | null) => void;
  setNarrativeContent: (content: string) => void;
  addEvidenceToQueue: (evidence: any) => void;
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

  const setNarrativeContent = (content: string) => {
    setNarrative({ content, isDirty: true, isSaving: false });
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
    setEvidenceQueue([...evidenceQueue, optimistic]);
    setEvidenceIsDirty(true);
  };

  const createEventShell = async (title: string, summary: string, startDate: string, topicSlugs: string[]) => {
    setIsCreating(true);
    setError(null);
    try {
      const res = await appsEventsRoutersCreateEvent({
        requestBody: {
          title,
          summary,
          start_date: startDate,
          topic_slugs: topicSlugs
        }
      });
      setEvent(res);
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
          slug: event.slug,
          requestBody: { content: narrative.content, is_published: true }
        });
        setNarrative(prev => ({ ...prev, isDirty: false }));
      }
      
      if (evidenceIsDirty) {
        for (const item of evidenceQueue) {
          // In a real app we'd track which items are new vs already in DB
          await appsEventsRoutersCreateEvidence({
            slug: event.slug,
            requestBody: {
              media_type: item.media_type,
              source_url: item.source_url,
              thumbnail_url: item.thumbnail_url || undefined,
              caption: item.caption || undefined,
              display_order: item.display_order
            }
          });
        }
        setEvidenceIsDirty(false);
      }

      const res = await appsEventsRoutersUpdateEvent({
        slug: event.slug,
        requestBody: { status: 'published' }
      });
      setEvent(res);
      
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
      event, narrative, evidenceQueue, evidenceIsDirty, isCreating, isPublishing, error,
      setEvent, setNarrativeContent, addEvidenceToQueue, setError, createEventShell, publishEvent
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
