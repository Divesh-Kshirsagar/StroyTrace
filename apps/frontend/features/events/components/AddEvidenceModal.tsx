'use client';
import { useState } from 'react';
import { useEditor } from '../context/EditorContext';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';

export default function AddEvidenceModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { addEvidenceToQueue } = useEditor();
  
  const [mediaType, setMediaType] = useState('youtube');
  const [sourceUrl, setSourceUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Basic validation based on spec
    if (mediaType === 'youtube' && !sourceUrl.includes('youtube.com') && !sourceUrl.includes('youtu.be')) {
      setError('Must be a valid YouTube URL');
      return;
    }
    if (mediaType === 'instagram' && !sourceUrl.includes('instagram.com')) {
      setError('Must be a valid Instagram URL');
      return;
    }

    let thumbnailUrl = null;
    if (mediaType === 'youtube') {
      // Very basic youtube thumbnail extraction for MVP
      const videoId = sourceUrl.split('v=')[1]?.split('&')[0] || sourceUrl.split('youtu.be/')[1]?.split('?')[0];
      if (videoId) {
        thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      }
    }

    addEvidenceToQueue({
      media_type: mediaType,
      source_url: sourceUrl,
      thumbnail_url: thumbnailUrl,
      caption
    });

    setSourceUrl('');
    setCaption('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-lg max-w-md w-full p-6 shadow-xl">
        <h2 className="text-xl font-bold mb-4">Add Evidence</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Media Type</label>
            <select 
              className="w-full rounded-md border border-zinc-300 p-2 dark:bg-zinc-800 dark:border-zinc-700"
              value={mediaType} 
              onChange={e => setMediaType(e.target.value)}
            >
              <option value="youtube">YouTube Video</option>
              <option value="instagram">Instagram Post</option>
              <option value="image">Image (URL)</option>
              <option value="document">Document (URL)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Source URL</label>
            <Input 
              value={sourceUrl} 
              onChange={e => setSourceUrl(e.target.value)} 
              placeholder="https://..." 
              required 
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Caption (Optional)</label>
            <Input 
              value={caption} 
              onChange={e => setCaption(e.target.value)} 
              placeholder="What does this show?" 
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Add to Board</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
