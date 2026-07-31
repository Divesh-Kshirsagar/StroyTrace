'use client';
import { Button } from '@/shared/components/ui/button';
import { useEditor } from '../context/EditorContext';

export default function EditorActionBar({ onPublish }: { onPublish: () => void }) {
  const { isPublishing, error, narrative, evidenceIsDirty } = useEditor();
  const isDirty = narrative.isDirty || evidenceIsDirty;

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 shadow-lg z-50">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="text-sm text-zinc-500">
          {isDirty ? 'You have unsaved changes.' : 'All changes saved.'}
        </div>
        <div className="flex gap-4">
          <Button variant="outline" disabled={isPublishing}>Discard Draft</Button>
          <Button variant="secondary" disabled={isPublishing || !isDirty} onClick={onPublish}>
            {isPublishing ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button onClick={onPublish} disabled={isPublishing}>
            {isPublishing ? 'Publishing...' : 'Publish Event'}
          </Button>
        </div>
      </div>
    </div>
  );
}
