import { appsEventsRoutersSearchEvents } from "@/generated";
import type { MetadataRoute } from "next";
import "@/shared/lib/apiClient";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://clarity.com";

  // Base Routes
  const routes = ["", "/search", "/topics"].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 1,
  }));

  // Fetch recent events for sitemap
  try {
    const { data } = await appsEventsRoutersSearchEvents({
      query: { q: "" },
    } as any);
    const eventRoutes = data?.items.map((event: any) => ({
      url: `${baseUrl}/${event.lead_investigator.handle}/${event.slug}`,
      lastModified: new Date(event.created_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
    return [...routes, ...(eventRoutes || [])];
  } catch (e) {
    return routes;
  }
}
