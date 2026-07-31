import { z } from 'zod';

export const eventMetadataSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200, "Title is too long"),
  summary: z.string().max(1000, "Summary is too long").optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a valid date format (YYYY-MM-DD)"),
});

export const evidenceSchema = z.object({
  mediaType: z.enum(['youtube', 'instagram', 'image', 'document']),
  sourceUrl: z.string().url('Must be a valid URL'),
  caption: z.string().optional()
}).superRefine((data, ctx) => {
  if (data.mediaType === 'youtube' && !data.sourceUrl.includes('youtube.com') && !data.sourceUrl.includes('youtu.be')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Must be a valid YouTube URL',
      path: ['sourceUrl']
    });
  }
  if (data.mediaType === 'instagram' && !data.sourceUrl.includes('instagram.com')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Must be a valid Instagram URL',
      path: ['sourceUrl']
    });
  }
});
