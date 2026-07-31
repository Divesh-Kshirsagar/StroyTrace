import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { appsEventsRoutersGetEvent } from '@/generated';
import EventEditorPage from '@/features/events/components/EventEditorPage';
import '@/shared/lib/apiClient';

export const metadata: Metadata = {
  title: 'Edit Event - Clarity',
};

interface PageProps {
  params: {
    slug: string;
  };
}

export default async function EditEventPage({ params }: PageProps) {
  try {
    const data = await appsEventsRoutersGetEvent({ slug: params.slug } as any);
    return <EventEditorPage initialEvent={data} />;
  } catch (error) {
    notFound();
  }
}
