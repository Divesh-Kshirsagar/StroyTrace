'use client';
import { useState } from 'react';
import { useEditor } from '../context/EditorContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';

export default function EventMetadataHeader() {
  const { event, createEventShell, isCreating } = useEditor();
  
  const [title, setTitle] = useState(event?.title || '');
  const [summary, setSummary] = useState(event?.summary || '');
  const [startDate, setStartDate] = useState(event?.start_date || new Date().toISOString().split('T')[0]);

  const handleCreate = async () => {
    if (!title || !startDate) return;
    await createEventShell(title, summary, startDate, []);
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
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Event Title</label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. The FTX Collapse" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Start Date</label>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Summary</label>
          <Input value={summary} onChange={e => setSummary(e.target.value)} placeholder="Brief description..." />
        </div>
        <Button onClick={handleCreate} disabled={isCreating || !title || !startDate}>
          {isCreating ? 'Creating...' : 'Create Event Shell'}
        </Button>
      </CardContent>
    </Card>
  );
}
