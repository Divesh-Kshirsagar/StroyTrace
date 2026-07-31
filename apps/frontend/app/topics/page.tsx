import { appsTopicsRoutersListTopics } from '@/generated';
import Link from 'next/link';
import '@/shared/lib/apiClient';
import { Card } from '@/shared/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function TopicsPage() {
  const topics = await appsTopicsRoutersListTopics();
  
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-4">All Topics</h1>
      <p className="text-zinc-500 mb-8">Browse investigations across all domains.</p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {topics.map(topic => (
          <Link key={topic.slug} href={`/topic/${topic.slug}`}>
            <Card className="p-6 hover:shadow-md transition-shadow h-full flex flex-col">
              <h3 className="font-bold text-lg mb-2">{topic.name}</h3>
              {topic.description && (
                <p className="text-sm text-zinc-500 line-clamp-3 mb-4">{topic.description}</p>
              )}
              <div className="mt-auto">
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-full">
                  Explore topic →
                </span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
