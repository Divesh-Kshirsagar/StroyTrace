'use client';
import { useEditor } from '../context/EditorContext';
import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { useState } from 'react';
import AddEvidenceModal from './AddEvidenceModal';

export default function EvidenceBoardPanel() {
  const { evidenceQueue } = useEditor();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <Card className="flex flex-col h-full overflow-hidden bg-zinc-100 dark:bg-zinc-950/50">
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex justify-between items-center">
        <h3 className="font-semibold">Evidence Board</h3>
        <Button variant="outline" size="sm" onClick={() => setIsModalOpen(true)}>
          + Add Evidence
        </Button>
      </div>
      
      <div className="flex-grow overflow-y-auto p-4">
        {evidenceQueue.length === 0 ? (
          <div className="h-full flex items-center justify-center text-zinc-500 flex-col gap-2">
            <p>No evidence attached yet.</p>
            <p className="text-sm text-center max-w-xs">All media must be added here to maintain a structured investigation record.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {evidenceQueue.map((item, i) => (
              <Card key={item.id || i} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="aspect-video bg-zinc-200 dark:bg-zinc-800 relative">
                  {item.thumbnail_url ? (
                    <img src={item.thumbnail_url} alt={item.caption || 'Evidence'} className="object-cover w-full h-full" />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full text-zinc-400">
                      [{item.media_type}]
                    </div>
                  )}
                </div>
                <div className="p-2 text-xs truncate" title={item.caption || item.source_url}>
                  {item.caption || item.source_url}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AddEvidenceModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </Card>
  );
}
