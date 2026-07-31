import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { appsFeedsRoutersChannelFeed, appsUsersRoutersGetChannel } from '@/generated';
import FeedView from '@/features/feeds/components/FeedView';
import CreatorBadge from '@/shared/components/CreatorBadge';
import TopicCurationSection from '@/features/channels/components/TopicCurationSection';
import SubscribeForm from '@/features/channels/components/SubscribeForm';

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
    
    // Fetch creator profile + topics
    const profile = await appsUsersRoutersGetChannel({ handle: cleanHandle } as any);
    
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
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-medium text-zinc-500">{cleanHandle.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <h1 className="text-3xl font-bold flex items-center gap-2">
                {profile.display_name}
                {profile.is_verified && (
                  <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </h1>
              <p className="text-zinc-500 font-medium">@{cleanHandle}</p>
              {profile.bio && <p className="text-zinc-700 dark:text-zinc-300 mt-2 max-w-2xl">{profile.bio}</p>}
            </div>
          </div>
          <div className="mt-6">
            <TopicCurationSection channelHandle={cleanHandle} initialTopics={profile.topics || []} />
          </div>
          <div className="mt-8">
            <SubscribeForm channelHandle={cleanHandle} />
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
