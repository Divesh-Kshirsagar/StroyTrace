import { Button } from '@/shared/components/ui/button';

interface LoadMoreButtonProps {
  hasNext: boolean;
  isLoading: boolean;
  onClick: () => void;
}

export default function LoadMoreButton({ hasNext, isLoading, onClick }: LoadMoreButtonProps) {
  if (!hasNext) return null;
  
  return (
    <div className="flex justify-center my-8">
      <Button 
        variant="outline" 
        onClick={onClick} 
        disabled={isLoading}
        className="w-full sm:w-auto min-w-[200px]"
      >
        {isLoading ? 'Loading...' : 'Load More'}
      </Button>
    </div>
  );
}
