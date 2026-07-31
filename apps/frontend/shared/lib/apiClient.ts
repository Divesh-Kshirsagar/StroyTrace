import { client } from '../../generated/client.gen';
import Cookies from 'js-cookie';

client.setConfig({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
});

client.interceptors.request.use((req) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      req.headers.set('Authorization', `Bearer ${token}`);
    }
  }
  return req;
});

const originalFetch = globalThis.fetch;
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

globalThis.fetch = async (input, init) => {
  let response = await originalFetch(input, init);

  if (response.status === 401 && typeof window !== 'undefined') {
    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : input.toString();
    
    if (url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/register')) {
      return response;
    }

    const refreshToken = Cookies.get('refresh_token');
    if (!refreshToken) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
      return response;
    }

    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshResponse = await originalFetch(`${client.getConfig().baseUrl}/api/v1/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken })
        });

        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          const newAccessToken = data.access_token;
          
          localStorage.setItem('access_token', newAccessToken);
          isRefreshing = false;
          onRefreshed(newAccessToken);

          const newHeaders = new Headers(init?.headers);
          newHeaders.set('Authorization', `Bearer ${newAccessToken}`);
          return originalFetch(input, { ...init, headers: newHeaders });
        } else {
          Cookies.remove('refresh_token');
          localStorage.removeItem('access_token');
          window.location.href = '/login';
        }
      } catch (error) {
        Cookies.remove('refresh_token');
        localStorage.removeItem('access_token');
        window.location.href = '/login';
      } finally {
        isRefreshing = false;
      }
    } else {
      return new Promise((resolve) => {
        subscribeTokenRefresh((newAccessToken) => {
          const newHeaders = new Headers(init?.headers);
          newHeaders.set('Authorization', `Bearer ${newAccessToken}`);
          resolve(originalFetch(input, { ...init, headers: newHeaders }));
        });
      });
    }
  }

  return response;
};

export { client };
