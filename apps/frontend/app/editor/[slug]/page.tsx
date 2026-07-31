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
    const { slug } = await params;
    const { data } = await appsEventsRoutersGetEvent({ path: { slug } } as any);
    if (!data) throw new Error('Not found');
    return <EventEditorPage initialEvent={data} />;
  } catch (error) {
    notFound();
  }
}
