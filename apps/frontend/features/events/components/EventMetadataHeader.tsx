'use client';
import { useEditor } from '../context/EditorContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { eventMetadataSchema } from '../schemas';
import { z } from 'zod';
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@/shared/components/ui/field';

type FormValues = z.infer<typeof eventMetadataSchema>;

export default function EventMetadataHeader() {
  const { event, createEventShell, isCreating } = useEditor();
  
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(eventMetadataSchema),
    defaultValues: {
      title: event?.title || '',
      summary: event?.summary || '',
      start_date: event?.start_date || new Date().toISOString().split('T')[0]
    }
  });

  const onSubmit = async (data: FormValues) => {
    await createEventShell(data.title, data.summary || '', data.start_date, []);
  };

  if (event) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold">{event.title}</CardTitle>
          <p className="text-zinc-500">{new Date(event.start_date).toLocaleDateString()}</p>
        </CardHeader>
        <CardContent>
          <p>{event.summary}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Event</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <FieldGroup>
            <Field data-invalid={!!errors.title ? '' : undefined}>
              <FieldLabel>Event Title</FieldLabel>
              <Input {...register('title')} placeholder="e.g. The FTX Collapse" aria-invalid={!!errors.title} />
              {errors.title && <FieldDescription className="text-destructive">{errors.title.message}</FieldDescription>}
            </Field>

            <Field data-invalid={!!errors.start_date ? '' : undefined}>
              <FieldLabel>Start Date</FieldLabel>
              <Input type="date" {...register('start_date')} aria-invalid={!!errors.start_date} />
              {errors.start_date && <FieldDescription className="text-destructive">{errors.start_date.message}</FieldDescription>}
            </Field>

            <Field data-invalid={!!errors.summary ? '' : undefined}>
              <FieldLabel>Summary</FieldLabel>
              <Input {...register('summary')} placeholder="Brief description..." aria-invalid={!!errors.summary} />
              {errors.summary && <FieldDescription className="text-destructive">{errors.summary.message}</FieldDescription>}
            </Field>
          </FieldGroup>
          <Button type="submit" disabled={isCreating || Object.keys(errors).length > 0}>
            {isCreating ? 'Creating...' : 'Create Event Shell'}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}
