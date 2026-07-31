import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { appsFeedsRoutersTopicFeed } from '@/generated';
import FeedView from '@/features/feeds/components/FeedView';

interface PageProps {
  params: {
    slug: string;
  };
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  // Try to format the slug directly for MVP (e.g. factory-fire -> Factory Fire)
  const name = params.slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  return {
    title: `${name} Investigations - Clarity`,
    description: `Read the latest published investigations and evidence regarding ${name}.`
  };
}

export default async function TopicPage({ params }: PageProps) {
  try {
    const initialData = await appsFeedsRoutersTopicFeed({ slug: params.slug } as any);
    
    async function fetchNextPage(cursor: string) {
      'use server';
      return appsFeedsRoutersTopicFeed({ slug: params.slug, query: { cursor } } as any);
    }
    
    const name = params.slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    return (
      <main>
        <FeedView 
          initialData={initialData} 
          fetchNextPage={fetchNextPage} 
          header={<h1 className="text-3xl font-bold mb-2">Topic: {name}</h1>}
          emptyTitle={`No events for ${name}`}
          emptyDescription={`There are currently no published events tagged with ${name}.`}
        />
      </main>
    );
  } catch (error) {
    notFound();
  }
}
