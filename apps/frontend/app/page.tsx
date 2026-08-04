import FeedView from "@/features/feeds/components/FeedView";
import SortToggle from "@/features/feeds/components/SortToggle";
import { appsFeedsRoutersHomeFeed } from "@/generated";
import "@/shared/lib/apiClient";

export const dynamic = "force-dynamic";

interface HomePageProps {
  searchParams: Promise<{ sort?: string }>;
}

async function fetchNextPage(cursor: string, sort: string) {
  "use server";
  const response = await appsFeedsRoutersHomeFeed({
    query: { cursor, sort } as any,
  });
  return response.data as any;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { sort = "trending" } = await searchParams;
  const validSort = sort === "latest" ? "latest" : "trending";

  const { data: initialData, error } = await appsFeedsRoutersHomeFeed({
    query: { sort: validSort } as any,
  });

  if (error) {
    console.error("HOME FEED ERROR:", error);
  }

  const nextPageFetcher = async (cursor: string) => {
    "use server";
    return fetchNextPage(cursor, validSort);
  };

  return (
    <main>
      <FeedView
        initialData={initialData}
        fetchNextPage={nextPageFetcher}
        header={
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h1 className="text-3xl font-bold">
              {validSort === "trending"
                ? "Trending Investigations"
                : "Latest Investigations"}
            </h1>
            <SortToggle currentSort={validSort} />
          </div>
        }
        emptyTitle="No investigations yet"
        emptyDescription="There are no published events on the platform yet."
      />
    </main>
  );
}
