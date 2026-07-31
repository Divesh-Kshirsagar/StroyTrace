import EventEditorPage from '@/features/events/components/EventEditorPage';
import { appsEventsRoutersGetEvent } from '@/generated/services.gen';
import { notFound } from 'next/navigation';

export default async function EditEventPage({ params }: { params: { slug: string } }) {
  try {
    const event = await appsEventsRoutersGetEvent({ slug: params.slug });
    return <EventEditorPage initialEvent={event} />;
  } catch (error) {
    notFound();
  }
}
