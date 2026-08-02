import { client } from '../../generated/client.gen';
import Cookies from 'js-cookie';

// ─── Base URL ────────────────────────────────────────────────────────────────
// Server-side (SSR/RSC): must use the absolute Django URL — the Next.js proxy
// rewrite isn't available outside the browser.
// Browser: empty string → same-origin → /api/v1/* goes through next.config rewrites.
const isBrowser = typeof window !== 'undefined';

const baseUrl = isBrowser
  ? ''
  : process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

client.setConfig({ baseUrl });

// ─── Token storage helpers ───────────────────────────────────────────────────
// Exported so useAuth and the interceptor share a single source of truth.

export function getAccessToken(): string | undefined {
  if (!isBrowser) return undefined;
  return localStorage.getItem('access_token') || Cookies.get('access_token') || undefined;
}

export function getRefreshToken(): string | undefined {
  if (!isBrowser) return undefined;
  return Cookies.get('refresh_token') || undefined;
}

export function storeTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('access_token', accessToken);
  Cookies.set('access_token', accessToken, { expires: 7, sameSite: 'lax', path: '/' });
  Cookies.set('refresh_token', refreshToken, { expires: 7, sameSite: 'lax', path: '/' });
}

export function storeAccessToken(accessToken: string) {
  localStorage.setItem('access_token', accessToken);
  Cookies.set('access_token', accessToken, { expires: 7, sameSite: 'lax', path: '/' });
}

export function clearTokens() {
  localStorage.removeItem('access_token');
  Cookies.remove('access_token', { path: '/' });
  Cookies.remove('refresh_token', { path: '/' });
}

// ─── Refresh state ──────────────────────────────────────────────────────────
// A single in-flight refresh promise shared across all concurrent requests that
// 401 at the same time. Without this, three simultaneous expired-token requests
// would each fire their own refresh → race condition → two get revoked tokens.
let refreshPromise: Promise<string | null> | null = null;

async function attemptTokenRefresh(): Promise<string | null> {
  if (refreshPromise) return refreshPromise; // join existing in-flight refresh

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;

    try {
      // Call the refresh endpoint directly with raw fetch to avoid triggering
      // our own error interceptor recursively.
      const res = await globalThis.fetch(`${baseUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!res.ok) return null;

      const json = await res.json() as { access_token: string };
      storeAccessToken(json.access_token);
      return json.access_token;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ─── Request interceptor ─────────────────────────────────────────────────────
client.interceptors.request.clear();
client.interceptors.request.use(async (req) => {
  let token: string | undefined;

  if (isBrowser) {
    token = getAccessToken();
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

// ─── Error interceptor: silent token refresh + retry ────────────────────────
// Only active in the browser — SSR never has an interactive session to refresh.
if (isBrowser) {
  client.interceptors.error.use(async (error, response, request) => {
    // Only handle 401s. Anything else (403, 500 …) passes straight through.
    if (!response || response.status !== 401) return error;

    // Don't retry auth endpoints themselves — that would cause infinite loops.
    const url = request?.url ?? '';
    if (url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/register')) {
      return error;
    }

    // Try to get a fresh access token via the refresh token.
    const newToken = await attemptTokenRefresh();

    if (!newToken) {
      // Refresh also failed — session is fully expired. Clear state and notify
      // the UI via a custom event so AuthProvider can show the re-login modal.
      clearTokens();
      window.dispatchEvent(new CustomEvent('session-expired'));
      return error;
    }

    // Retry the original request once with the new token.
    // We have to rebuild the Request because the consumed body / headers are immutable.
    const retried = new Request(request!, {
      headers: new Headers(request!.headers),
    });
    retried.headers.set('Authorization', `Bearer ${newToken}`);

    try {
      const retryResponse = await globalThis.fetch(retried);
      // Return the retried response so the client pipeline continues normally.
      // The client checks response.ok — if the retry also 401s, it will throw
      // again and reach the error interceptor once more, but this time the
      // refresh token is already gone so it goes straight to session-expired.
      return retryResponse;
    } catch {
      return error;
    }
  });
}

export { client };
