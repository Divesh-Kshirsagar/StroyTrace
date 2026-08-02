import { EventFullSchema } from '@/generated';
import NarrativeRenderer from './NarrativeRenderer';
import EvidenceBoard from './EvidenceBoard';
import TrendingBreakdown from './TrendingBreakdown';
import CreatorBadge from '@/shared/components/CreatorBadge';

interface EventDetailViewProps {
  data: EventFullSchema;
}

export default function EventDetailView({ data }: EventDetailViewProps) {
  const { event, narrative, evidence } = data;
  
  const startDate = new Date(event.start_date).toLocaleDateString(undefined, { 
    year: 'numeric', month: 'long', day: 'numeric' 
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 md:py-16">
      <header className="mb-12 max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <CreatorBadge creator={event.lead_investigator} />
          <span className="text-zinc-300 dark:text-zinc-700 text-sm">•</span>
          <time className="text-sm text-zinc-500 font-medium">{startDate}</time>
        </div>
        
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6 leading-tight">
          {event.title}
        </h1>
        
        {event.summary && (
          <p className="text-xl text-zinc-600 dark:text-zinc-400 leading-relaxed mb-6">
            {event.summary}
          </p>
        )}
        
        {/* We would render TopicBadges here if topics were populated in EventFullSchema */}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8">
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-6 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            The Narrative
          </h2>
          
          {narrative?.content ? (
            <NarrativeRenderer content={narrative.content} />
          ) : (
            <p className="text-zinc-500 italic">No narrative has been published for this investigation yet.</p>
          )}
        </div>
        
        <div className="lg:col-span-4">
          <div className="sticky top-8">
            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-6 border-b border-zinc-200 dark:border-zinc-800 pb-2 flex items-center justify-between">
              <span>Evidence Board</span>
              <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 py-0.5 px-2 rounded-full text-xs">
                {evidence.length}
              </span>
            </h2>
            
            <div className="flex flex-col gap-4">
              <EvidenceBoard evidence={evidence} />
            </div>

            {event.status === 'published' && (
              <div className="mt-8">
                <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                  Engagement
                </h2>
                <TrendingBreakdown eventSlug={event.slug} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
