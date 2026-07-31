import { client } from '../../generated/client.gen';
import Cookies from 'js-cookie';

// ─── Base URL ────────────────────────────────────────────────────────────────
// On the server (SSR/RSC) we must use the full Django URL because the Next.js
// proxy rewrite isn't available server-side.
// On the browser, use the Next.js rewrite proxy (/api/v1 → Django) so that:
//   1. CORS is never an issue (same-origin request).
//   2. The Django URL is never exposed to the client bundle.
const isBrowser = typeof window !== 'undefined';

const baseUrl = isBrowser
  ? '' // empty = same-origin → /api/v1/* goes through next.config rewrites
  : process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

client.setConfig({ baseUrl });

// ─── Request interceptor (sets Authorization header) ─────────────────────────
// NOTE: This module is imported on the server (layout.tsx side-effect) where
// it configures the SSR base URL above. The auth interceptor below is also
// registered here for SSR token injection.
// The client-side interceptor is additionally registered inside useAuth's
// useEffect to ensure the latest localStorage token is always used.
client.interceptors.request.clear();
client.interceptors.request.use(async (req) => {
  let token: string | undefined;

  if (isBrowser) {
    token = localStorage.getItem('access_token') || Cookies.get('access_token') || undefined;
  } else {
    try {
      const { cookies } = await import('next/headers');
      const cookieStore = await cookies();
      token = cookieStore.get('access_token')?.value;
    } catch {
      // Server Component outside a request context — no token available
    }
  }

  if (token) {
    req.headers.set('Authorization', `Bearer ${token}`);
  }
  return req;
});

export { client };
