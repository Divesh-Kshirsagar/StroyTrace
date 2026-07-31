import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EventSummarySchema } from '@/generated';
import { MoreVertical, Edit, ExternalLink, Trash, Archive, CheckCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { appsEventsRoutersUpdateEventStatus, appsEventsRoutersDeleteEvent } from '@/generated';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/shared/components/ui/dialog';

interface EventRowProps {
  event: EventSummarySchema;
  onUpdate: () => void;
}

export default function EventRow({ event, onUpdate }: EventRowProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    try {
      setIsUpdating(true);
      await appsEventsRoutersUpdateEventStatus({
        slug: event.slug,
        requestBody: { status: newStatus }
      });
      onUpdate();
    } catch (e) {
      console.error(e);
      alert('Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await appsEventsRoutersDeleteEvent({ slug: event.slug });
      setShowDeleteModal(false);
      onUpdate();
    } catch (e) {
      console.error(e);
      alert('Failed to delete event');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = () => {
    switch (event.status) {
      case 'published':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 border-none">Published</Badge>;
      case 'draft':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 border-none">Draft</Badge>;
      case 'archived':
        return <Badge className="bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border-none">Archived</Badge>;
      default:
        return <Badge>{event.status}</Badge>;
    }
  };

  const formattedDate = new Date(event.created_at).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric'
  });

  return (
    <>
      <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
        <div className="flex flex-col gap-1 min-w-0">
          <div 
            onClick={() => router.push(`/editor/${event.slug}`)} 
            className="font-semibold text-lg hover:underline truncate cursor-pointer"
          >
            {event.title}
          </div>
          <div className="flex items-center gap-3 text-sm text-zinc-500">
            <span>{formattedDate}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4 flex-shrink-0 ml-4">
          {getStatusBadge()}
          
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 w-9">
                <MoreVertical className="w-4 h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => router.push(`/editor/${event.slug}`)} className="flex items-center cursor-pointer">
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              
              <DropdownMenuItem disabled={event.status !== 'published'} onClick={() => {
                if (event.status === 'published') window.open(`/@${event.lead_investigator.handle}/${event.slug}`, '_blank');
              }} className="flex items-center cursor-pointer">
                <ExternalLink className="w-4 h-4 mr-2" />
                View Public
              </DropdownMenuItem>
              
              {event.status !== 'published' && (
                <DropdownMenuItem onClick={() => handleStatusChange('published')} className="flex items-center cursor-pointer">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Publish
                </DropdownMenuItem>
              )}
              
              {event.status !== 'draft' && (
                <DropdownMenuItem onClick={() => handleStatusChange('draft')} className="flex items-center cursor-pointer">
                  <Edit className="w-4 h-4 mr-2" />
                  Move to Drafts
                </DropdownMenuItem>
              )}
              
              {event.status !== 'archived' && (
                <DropdownMenuItem onClick={() => handleStatusChange('archived')} className="flex items-center cursor-pointer">
                  <Archive className="w-4 h-4 mr-2" />
                  Archive
                </DropdownMenuItem>
              )}
              
              <DropdownMenuItem 
                onClick={() => setShowDeleteModal(true)} 
                className="flex items-center cursor-pointer text-red-600 focus:text-red-700 dark:text-red-400 dark:focus:text-red-300"
              >
                <Trash className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Event?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the event "{event.title}", including its narrative and all evidence.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete Permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
