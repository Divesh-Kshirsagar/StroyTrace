import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { appsFeedsRoutersTopicFeed } from '@/generated';
import FeedView from '@/features/feeds/components/FeedView';
import '@/shared/lib/apiClient';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  // Try to format the slug directly for MVP (e.g. factory-fire -> Factory Fire)
  const name = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  return {
    title: `${name} Investigations - Clarity`,
    description: `Read the latest published investigations and evidence regarding ${name}.`
  };
}

export default async function TopicPage({ params }: PageProps) {
  const { slug } = await params;
  
  let initialData: any;
  try {
    const response = await appsFeedsRoutersTopicFeed({ path: { slug } } as any);
    initialData = response.data;
  } catch (error) {
    // Handled below
  }

  if (!initialData) {
    notFound();
  }
  
  async function fetchNextPage(cursor: string) {
      'use server';
      const response = await appsFeedsRoutersTopicFeed({ path: { slug }, query: { cursor } } as any);
      return response.data as any;
    }
    
    const name = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

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
}
