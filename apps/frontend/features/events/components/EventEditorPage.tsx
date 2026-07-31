'use client';
import { EditorProvider, useEditor } from '../context/EditorContext';
import EventMetadataHeader from './EventMetadataHeader';
import NarrativeEditorPanel from './NarrativeEditorPanel';
import EvidenceBoardPanel from './EvidenceBoardPanel';
import EditorActionBar from './EditorActionBar';
import type { EventFullSchema } from '@/generated/types.gen';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';

function EditorLayout() {
  const { event, error, publishEvent } = useEditor();
  const { user } = useAuth();
  const router = useRouter();

  const handlePublish = async () => {
    await publishEvent();
    if (event && user?.creator_profile?.handle) {
      router.push(`/@${user.creator_profile.handle}/${event.slug}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 pb-24">
      {error && <div className="bg-red-500 text-white p-4 text-center">{error}</div>}
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        <EventMetadataHeader />
        
        {event && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[70vh]">
            <NarrativeEditorPanel />
            <EvidenceBoardPanel />
          </div>
        )}
      </div>
      
      {event && <EditorActionBar onPublish={handlePublish} />}
    </div>
  );
}

export default function EventEditorPage({ initialEvent }: { initialEvent?: EventFullSchema | null }) {
  return (
    <EditorProvider initialEvent={initialEvent}>
      <EditorLayout />
    </EditorProvider>
  );
}
