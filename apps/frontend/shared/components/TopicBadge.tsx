import Link from 'next/link';
import { Badge } from '@/shared/components/ui/badge';

interface TopicBadgeProps {
  topic: { slug: string; name: string };
  className?: string;
}

export default function TopicBadge({ topic, className }: TopicBadgeProps) {
  return (
    <Link href={`/topic/${topic.slug}`} onClick={e => e.stopPropagation()}>
      <Badge variant="secondary" className={`hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors ${className || ''}`}>
        {topic.name}
      </Badge>
    </Link>
  );
}
