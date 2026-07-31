import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { appsEventsRoutersGetEvent } from '@/generated';
import EventDetailView from '@/features/events/components/EventDetailView';
import '@/shared/lib/apiClient';

interface PageProps {
  params: Promise<{
    handle: string;
    eventSlug: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const { handle, eventSlug } = await params;
    const { data } = await appsEventsRoutersGetEvent({ path: { slug: eventSlug } } as any);
    if (!data) throw new Error('Not found');
    
    // In next v15 / heyapi v0.52.8 we might need to just pass `{ slug: params.eventSlug }` directly
    // Wait, let's fix it if it's incorrect. I'll change it to `{ slug: params.eventSlug }` instead of `{ query: ... }` based on my earlier fix for the edit page.
    
    const event = data.event;
    const title = `${event.title} - Clarity`;
    const description = event.summary?.substring(0, 160) || `A detailed investigation into ${event.title}...`;
    
    // Find primary thumbnail
    const canonicalUrl = `https://clarity.com/${handle}/${eventSlug}`;

    const firstEvidenceWithThumbnail = data.evidence?.find(e => e.thumbnail_url);
    const ogImage = firstEvidenceWithThumbnail?.thumbnail_url || '/og-default.png';
    return {
      title,
      description,
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title,
        description,
        type: 'article',
        url: `https://clarity.com/${handle}/${eventSlug}`,
        images: [{ url: ogImage }],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImage],
      }
    };
  } catch (error) {
    return {
      title: 'Event Not Found - Clarity',
    };
  }
}

export default async function EventPage({ params }: PageProps) {
  const { handle, eventSlug } = await params;
  
  let data: any;
  try {
    const response = await appsEventsRoutersGetEvent({ path: { slug: eventSlug } } as any);
    data = response.data;
  } catch (error) {
    // We will handle the error below by checking if data exists
  }

  if (!data) {
    notFound();
  }

  const jsonLd = {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      "headline": data.event.title,
      "datePublished": data.event.start_date,
      "dateModified": data.event.updated_at,
      "author": [{
          "@type": "Person",
          "name": handle,
          "url": `https://clarity.com/${handle}`
      }],
      "description": data.event.summary || data.event.title,
    };

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <EventDetailView data={data} />
      </>
    );
}
