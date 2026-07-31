import { appsFeedsRoutersHomeFeed } from '@/generated';
import FeedView from '@/features/feeds/components/FeedView';

// Revalidate occasionally, or keep it dynamic depending on Next.js setup
export const dynamic = 'force-dynamic';

async function fetchNextPage(cursor: string) {
  'use server';
  return appsFeedsRoutersHomeFeed({ cursor } as any);
}

export default async function HomePage() {
  const initialData = await appsFeedsRoutersHomeFeed({});
  
  return (
    <main>
      <FeedView 
        initialData={initialData} 
        fetchNextPage={fetchNextPage} 
        header={<h1 className="text-3xl font-bold">Latest Investigations</h1>}
        emptyTitle="No investigations yet"
        emptyDescription="There are no published events on the platform yet."
      />
    </main>
  );
}
