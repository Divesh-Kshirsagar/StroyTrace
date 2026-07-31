'use client';
import { useState } from 'react';
import { useEditor } from '../context/EditorContext';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { evidenceSchema } from '../schemas';
import { z } from 'zod';
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@/shared/components/ui/field';

type FormValues = z.infer<typeof evidenceSchema>;

export default function AddEvidenceModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { addEvidenceToQueue } = useEditor();
  
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(evidenceSchema),
    defaultValues: {
      mediaType: 'youtube',
      sourceUrl: '',
      caption: ''
    }
  });

  if (!isOpen) return null;

  const onSubmit = (data: FormValues) => {
    let thumbnailUrl = null;
    if (data.mediaType === 'youtube') {
      const videoId = data.sourceUrl.split('v=')[1]?.split('&')[0] || data.sourceUrl.split('youtu.be/')[1]?.split('?')[0];
      if (videoId) {
        thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      }
    }

    addEvidenceToQueue({
      media_type: data.mediaType,
      source_url: data.sourceUrl,
      thumbnail_url: thumbnailUrl,
      caption: data.caption || ''
    });

    reset();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-lg max-w-md w-full p-6 shadow-xl">
        <h2 className="text-xl font-bold mb-4">Add Evidence</h2>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FieldGroup>
            <Field data-invalid={!!errors.mediaType ? '' : undefined}>
              <FieldLabel>Media Type</FieldLabel>
              <select 
                {...register('mediaType')}
                className="w-full rounded-md border border-zinc-300 p-2 dark:bg-zinc-800 dark:border-zinc-700"
                aria-invalid={!!errors.mediaType}
              >
                <option value="youtube">YouTube Video</option>
                <option value="instagram">Instagram Post</option>
                <option value="image">Image (URL)</option>
                <option value="document">Document (URL)</option>
              </select>
              {errors.mediaType && <FieldDescription className="text-destructive">{errors.mediaType.message}</FieldDescription>}
            </Field>
            
            <Field data-invalid={!!errors.sourceUrl ? '' : undefined}>
              <FieldLabel>Source URL</FieldLabel>
              <Input 
                {...register('sourceUrl')}
                placeholder="https://..." 
                aria-invalid={!!errors.sourceUrl}
              />
              {errors.sourceUrl && <FieldDescription className="text-destructive">{errors.sourceUrl.message}</FieldDescription>}
            </Field>
            
            <Field data-invalid={!!errors.caption ? '' : undefined}>
              <FieldLabel>Caption (Optional)</FieldLabel>
              <Input 
                {...register('caption')}
                placeholder="What does this show?" 
                aria-invalid={!!errors.caption}
              />
              {errors.caption && <FieldDescription className="text-destructive">{errors.caption.message}</FieldDescription>}
            </Field>
          </FieldGroup>

          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
            <Button type="submit" disabled={Object.keys(errors).length > 0}>Add to Board</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
