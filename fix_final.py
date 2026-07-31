import re
import os

def fix_file(filepath, replacements):
    try:
        with open(filepath, 'r') as f:
            content = f.read()
        for old, new in replacements:
            content = re.sub(old, new, content)
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Fixed {filepath}")
    except Exception as e:
        print(f"Error {filepath}: {e}")

fix_file('apps/frontend/app/[handle]/page.tsx', [
    (r"return response\.data!;", "return response.data as any;")
])

fix_file('apps/frontend/app/page.tsx', [
    (r"return response\.data!;", "return response.data as any;")
])

fix_file('apps/frontend/app/sitemap.ts', [
    (r"const response = await appsFeedsRoutersHomeFeed\(\{\}\);", "const { data: response } = await appsFeedsRoutersHomeFeed({});"),
    (r"response\?\.items", "response?.items"),
    (r"\(event\)", "(event: any)")
])

fix_file('apps/frontend/app/topic/[slug]/page.tsx', [
    (r"return response\.data!;", "return response.data as any;")
])

fix_file('apps/frontend/features/dashboard/components/EventRow.tsx', [
    (r"slug: event\.slug,", "path: { slug: event.slug },")
])

fix_file('apps/frontend/features/events/context/EditorContext.tsx', [
    (r"slug: event\.slug,\n\s*requestBody: ", "path: { slug: event.slug },\n          body: "),
    (r"slug: event\.slug,\n\s*requestBody: \{ status: 'published' \}", "path: { slug: event.slug },\n        body: { status: 'published' }"),
    (r"slug: narrative\.event_slug,", "path: { eventSlug: narrative.event_slug },"),
    (r"eventSlug: narrative\.event_slug,", "path: { eventSlug: narrative.event_slug },"),
    (r"setEvent\(res\);", "setEvent(res || null);"),
    (r"slug: event\.slug,\n\s*requestBody:", "path: { slug: event.slug },\n        body:")
])

fix_file('apps/frontend/shared/lib/apiClient.ts', [
    (r"\(req, options\)", "(req)")
])
