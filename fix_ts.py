import re

files = {
    'apps/frontend/app/[handle]/[eventSlug]/page.tsx': [
        (r'\s*const canonicalUrl = `https://clarity\.com/\$\{params\.handle\}/\$\{params\.eventSlug\}`;\n', '')
    ],
    'apps/frontend/app/[handle]/page.tsx': [
        (r'import CreatorBadge from \'@/shared/components/CreatorBadge\';\n', ''),
        (r'\s*const creator = \{\n\s*handle: cleanHandle,\n\s*display_name: cleanHandle,\n\s*avatar_url: null\n\s*\};\n', '')
    ],
    'apps/frontend/features/auth/hooks/useAuth.tsx': [
        (r'import \{ OpenAPI \} from \'@/shared/lib/apiClient\';\n', '')
    ],
    'apps/frontend/features/dashboard/components/Dashboard.tsx': [
        (r'import \{ Button \} from \'@/shared/components/ui/button\';\n', '')
    ],
    'apps/frontend/features/dashboard/components/EventRow.tsx': [
        (r'const \[isUpdating, setIsUpdating\] = useState\(false\);', 'const [isUpdating] = useState(false);')
    ],
    'apps/frontend/features/events/components/AddEvidenceModal.tsx': [
        (r'import \{ useState \} from \'react\';\n', ''),
        (r'reset, watch, formState', 'reset, formState')
    ],
    'apps/frontend/features/events/components/EditorActionBar.tsx': [
        (r'isPublishing, error, narrative', 'isPublishing, narrative')
    ],
    'apps/frontend/features/events/components/EventDetailView.tsx': [
        (r'import TopicBadge from \'@/shared/components/TopicBadge\';\n', '')
    ],
    'apps/frontend/features/events/components/EventMetadataHeader.tsx': [
        (r'import \{ useState \} from \'react\';\n', '')
    ],
    'apps/frontend/features/events/components/__tests__/EventEditor.test.tsx': [
        (r'expect, vi \} from', 'expect } from')
    ]
}

for path, patterns in files.items():
    try:
        with open(path, 'r') as f:
            content = f.read()
        for pattern, repl in patterns:
            content = re.sub(pattern, repl, content)
        with open(path, 'w') as f:
            f.write(content)
        print(f"Fixed {path}")
    except Exception as e:
        print(f"Error {path}: {e}")
