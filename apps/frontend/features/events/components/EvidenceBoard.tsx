import { EvidenceSchema } from '@/generated';
import { Card } from '@/shared/components/ui/card';

interface EvidenceBoardProps {
  evidence: EvidenceSchema[];
}

export default function EvidenceBoard({ evidence }: EvidenceBoardProps) {
  if (!evidence || evidence.length === 0) {
    return (
      <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-8 text-center text-zinc-500 border border-zinc-200 dark:border-zinc-800">
        <p>No evidence has been attached to this investigation yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {evidence.map(item => (
        <Card key={item.id} className="overflow-hidden bg-zinc-50 dark:bg-zinc-900 shadow-sm border-none">
          <div className="aspect-video bg-zinc-200 dark:bg-zinc-800 w-full relative group">
            {item.thumbnail_url ? (
              <img 
                src={item.thumbnail_url} 
                alt={item.caption || 'Evidence'} 
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full text-zinc-500 uppercase text-xs font-bold tracking-wider">
                {item.media_type}
              </div>
            )}
            
            <a 
              href={item.source_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 hover:opacity-100"
            >
              <span className="bg-white/90 text-black px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm shadow-lg">
                View Source
              </span>
            </a>
          </div>
          
          {(item.caption || item.source_url) && (
            <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
              <p className="text-sm line-clamp-2 text-zinc-700 dark:text-zinc-300" title={item.caption || item.source_url}>
                {item.caption || item.source_url}
              </p>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
