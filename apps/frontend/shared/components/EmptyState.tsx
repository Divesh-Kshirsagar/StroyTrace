import { Card } from '@/shared/components/ui/card';

interface EmptyStateProps {
  title: string;
  description: string;
}

export default function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed border-2 bg-transparent">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-zinc-500 text-sm max-w-sm">{description}</p>
    </Card>
  );
}
