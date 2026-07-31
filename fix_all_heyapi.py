import re
import os

def replace_in_file(filepath, replacements):
    try:
        with open(filepath, 'r') as f:
            content = f.read()
        for old, new in replacements:
            if callable(old):
                content = old(content)
            else:
                content = re.sub(old, new, content)
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Fixed {filepath}")
    except Exception as e:
        print(f"Error {filepath}: {e}")

replace_in_file('apps/frontend/shared/lib/apiClient.ts', [
    (r"import \{ client \} from '../../generated';", "import { client } from '../../generated/client.gen';"),
    (r"fn: \(req\) => \{", "fn: (req: any) => {")
])

replace_in_file('apps/frontend/app/[handle]/[eventSlug]/page.tsx', [
    (r"const data = await appsEventsRoutersGetEvent\(\{ slug: params.eventSlug \} as any\);", 
     "const { data } = await appsEventsRoutersGetEvent({ path: { slug: params.eventSlug } } as any);\n    if (!data) throw new Error('Not found');")
])

replace_in_file('apps/frontend/app/editor/[slug]/page.tsx', [
    (r"const data = await appsEventsRoutersGetEvent\(\{ slug: params.slug \} as any\);",
     "const { data } = await appsEventsRoutersGetEvent({ path: { slug: params.slug } } as any);\n    if (!data) throw new Error('Not found');")
])

replace_in_file('apps/frontend/app/[handle]/page.tsx', [
    (r"const profile = await appsUsersRoutersGetChannel\(\{ handle: cleanHandle \} as any\);",
     "const { data: profile } = await appsUsersRoutersGetChannel({ path: { handle: cleanHandle } } as any);\n    if (!profile) throw new Error('Not found');"),
    (r"const initialData = await appsFeedsRoutersChannelFeed\(\{ handle: cleanHandle \} as any\);",
     "const { data: initialData } = await appsFeedsRoutersChannelFeed({ path: { handle: cleanHandle } } as any);"),
    (r"const response = await appsFeedsRoutersChannelFeed\(\{ handle: cleanHandle, query: \{ cursor \} \} as any\);\n\s*return response;",
     "const response = await appsFeedsRoutersChannelFeed({ path: { handle: cleanHandle }, query: { cursor } } as any);\n      return response.data!;")
])

replace_in_file('apps/frontend/app/page.tsx', [
    (r"const response = await appsFeedsRoutersHomeFeed\(\{ cursor \} as any\);\n\s*return response;",
     "const response = await appsFeedsRoutersHomeFeed({ query: { cursor } } as any);\n  return response.data!;"),
    (r"const initialData = await appsFeedsRoutersHomeFeed\(\{\}\);",
     "const { data: initialData } = await appsFeedsRoutersHomeFeed({});")
])

replace_in_file('apps/frontend/app/search/page.tsx', [
    (r"const initialData = await appsEventsRoutersSearchEvents\(\{ query: searchQuery \} as any\);",
     "const { data: initialData } = await appsEventsRoutersSearchEvents({ query: { query: searchQuery } } as any);"),
    (r"const result = await appsEventsRoutersSearchEvents\(\{ query: queryTerm, cursor \} as any\);",
     "const { data: result } = await appsEventsRoutersSearchEvents({ query: { query: queryTerm, cursor } } as any);"),
    (r"setEvents\(result.items\);", "if (result) setEvents(result.items);"),
    (r"setEvents\(prev => \[\.\.\.prev, \.\.\.result.items\]\);", "if (result) setEvents(prev => [...prev, ...result.items]);"),
    (r"setNextCursor\(result.next_cursor \|\| null\);", "if (result) setNextCursor(result.next_cursor || null);"),
    (r"setHasNext\(result.has_next\);", "if (result) setHasNext(result.has_next);")
])

replace_in_file('apps/frontend/app/sitemap.ts', [
    (r"const response = await appsFeedsRoutersHomeFeed\(\{\}\);",
     "const { data: response } = await appsFeedsRoutersHomeFeed({});"),
    (r"response\.items\.map", "response?.items.map"),
    (r"\(\(event\)", "((event: any)")
])

replace_in_file('apps/frontend/app/topic/[slug]/page.tsx', [
    (r"const initialData = await appsFeedsRoutersTopicFeed\(\{ slug: params\.slug \} as any\);",
     "const { data: initialData } = await appsFeedsRoutersTopicFeed({ path: { slug: params.slug } } as any);"),
    (r"const response = await appsFeedsRoutersTopicFeed\(\{ slug: params\.slug, query: \{ cursor \} \} as any\);\n\s*return response;",
     "const response = await appsFeedsRoutersTopicFeed({ path: { slug: params.slug }, query: { cursor } } as any);\n      return response.data!;")
])

replace_in_file('apps/frontend/app/topics/page.tsx', [
    (r"const topics = await appsTopicsRoutersListTopics\(\);",
     "const { data: topics } = await appsTopicsRoutersListTopics();"),
    (r"\{topics\.map\(topic => \(", "{topics?.map((topic: any) => (")
])

replace_in_file('apps/frontend/features/auth/hooks/useAuth.tsx', [
    (r"@/generated/services\.gen", "@/generated"),
    (r"const response = await appsUsersRoutersLogin\(\{ requestBody: \{ username: email, password \} \}\);",
     "const response = await appsUsersRoutersLogin({ body: { username: email, password } } as any);"),
    (r"localStorage\.setItem\('access_token', response\.access_token\);",
     "localStorage.setItem('access_token', response.data!.access_token);"),
    (r"const meResponse = await appsUsersRoutersMe\(\);",
     "const { data: meResponse } = await appsUsersRoutersMe();"),
    (r"setUser\(meResponse\);", "setUser(meResponse!);")
])

replace_in_file('apps/frontend/features/channels/components/TopicCurationSection.tsx', [
    (r"const fetchedTopics = await appsUsersRoutersGetMyTopics\(\);",
     "const { data: fetchedTopics } = await appsUsersRoutersGetMyTopics();"),
    (r"setAllTopics\(fetchedTopics\);", "if (fetchedTopics) setAllTopics(fetchedTopics);"),
    (r"await appsUsersRoutersSetMyTopics\(\{ requestBody: \{ topic_slugs: slugsArray \} \}\);",
     "await appsUsersRoutersSetMyTopics({ body: { topic_slugs: slugsArray } });")
])

replace_in_file('apps/frontend/features/dashboard/components/Dashboard.tsx', [
    (r"const result = await appsEventsCreatorRoutersListCreatorEvents\(\{([^}]*)\}\);",
     "const { data: result } = await appsEventsCreatorRoutersListCreatorEvents({ query: {\\1} } as any);"),
    (r"setEvents\(result\.items\);", "if (result) setEvents(result.items);"),
    (r"setEvents\(prev => \[\.\.\.prev, \.\.\.result\.items\]\);", "if (result) setEvents(prev => [...prev, ...result.items]);"),
    (r"setNextCursor\(result\.next_cursor \|\| null\);", "if (result) setNextCursor(result.next_cursor || null);"),
    (r"setHasNext\(result\.has_next\);", "if (result) setHasNext(result.has_next);"),
    (r"const res = await appsEventsCreatorRoutersGetDraftsCount\(\);",
     "const { data: res } = await appsEventsCreatorRoutersGetDraftsCount();"),
    (r"setDraftCount\(res\.count\);", "if (res) setDraftCount(res.count);")
])

replace_in_file('apps/frontend/features/dashboard/components/EventRow.tsx', [
    (r"await appsEventsRoutersUpdateEventStatus\(\{ slug: event\.slug, requestBody: \{ status: newStatus \} \}\);",
     "await appsEventsRoutersUpdateEventStatus({ path: { slug: event.slug }, body: { status: newStatus } } as any);"),
    (r"await appsEventsRoutersDeleteEvent\(\{ slug: event\.slug \}\);",
     "await appsEventsRoutersDeleteEvent({ path: { slug: event.slug } } as any);")
])

replace_in_file('apps/frontend/features/events/context/EditorContext.tsx', [
    (r"@/generated/services\.gen", "@/generated"),
    (r"await appsEventsRoutersCreateEvent\(\{ requestBody: \{ title: newTitle \} \}\);",
     "await appsEventsRoutersCreateEvent({ body: { title: newTitle } } as any);"),
    (r"await appsEventsRoutersUpdateEvent\(\{ slug: narrative\.event_slug, requestBody: updates \}\);",
     "await appsEventsRoutersUpdateEvent({ path: { slug: narrative.event_slug }, body: updates } as any);"),
    (r"await appsEventsRoutersUpdateNarrative\(\{ eventSlug: narrative\.event_slug, requestBody: narrative \}\);",
     "await appsEventsRoutersUpdateNarrative({ path: { eventSlug: narrative.event_slug }, body: narrative } as any);"),
    (r"await appsEventsRoutersCreateEvidence\(\{ eventSlug: narrative\.event_slug, requestBody: item \}\);",
     "await appsEventsRoutersCreateEvidence({ path: { eventSlug: narrative.event_slug }, body: item } as any);"),
    (r"await appsEventsRoutersUpdateEvidence\(\{ eventSlug: narrative\.event_slug, evidenceId: item\.id, requestBody: item \}\);",
     "await appsEventsRoutersUpdateEvidence({ path: { eventSlug: narrative.event_slug, evidenceId: item.id }, body: item } as any);"),
    (r"await appsEventsRoutersDeleteEvidence\(\{ eventSlug: narrative\.event_slug, evidenceId: id \}\);",
     "await appsEventsRoutersDeleteEvidence({ path: { eventSlug: narrative.event_slug, evidenceId: id } } as any);"),
    (r"await appsEventsRoutersReorderEvidence\(\{ eventSlug: narrative\.event_slug, requestBody: \{ evidence_ids: orderedIds \} \}\);",
     "await appsEventsRoutersReorderEvidence({ path: { eventSlug: narrative.event_slug }, body: { evidence_ids: orderedIds } } as any);")
])
