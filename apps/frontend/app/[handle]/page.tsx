import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { appsFeedsRoutersChannelFeed } from '@/generated';
import FeedView from '@/features/feeds/components/FeedView';
import CreatorBadge from '@/shared/components/CreatorBadge';

interface PageProps {
  params: {
    handle: string;
  };
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const cleanHandle = params.handle.replace('%40', '').replace('@', '');
  return {
    title: `@${cleanHandle}'s Investigations - Clarity`,
    description: `Read the latest published investigations by @${cleanHandle}.`
  };
}

export default async function ChannelPage({ params }: PageProps) {
  try {
    // URL may contain @ symbol (e.g. /@investigator), so strip it
    const cleanHandle = params.handle.replace('%40', '').replace('@', '');
    
    const initialData = await appsFeedsRoutersChannelFeed({ handle: cleanHandle } as any);
    
    async function fetchNextPage(cursor: string) {
      'use server';
      return appsFeedsRoutersChannelFeed({ handle: cleanHandle, query: { cursor } } as any);
    }
    
    const creator = {
      handle: cleanHandle,
      display_name: cleanHandle,
      avatar_url: null
    };

    return (
      <main>
        <div className="max-w-7xl mx-auto px-4 py-8 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0">
              <span className="text-3xl font-medium text-zinc-500">{cleanHandle.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold">{cleanHandle}</h1>
              <p className="text-zinc-500">@{cleanHandle}</p>
            </div>
          </div>
        </div>

        <FeedView 
          initialData={initialData} 
          fetchNextPage={fetchNextPage} 
          header={<h2 className="text-xl font-semibold mb-2">Published Events</h2>}
          emptyTitle={`No events from ${cleanHandle}`}
          emptyDescription={`This creator hasn't published any events yet.`}
        />
      </main>
    );
  } catch (error) {
    notFound();
  }
}
