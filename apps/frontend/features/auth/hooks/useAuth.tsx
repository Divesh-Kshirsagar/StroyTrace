'use client';
import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { client } from '@/generated/client.gen';
import { 
  appsUsersRoutersLogin, 
  appsUsersRoutersRegister, 
  appsUsersRoutersLogout, 
  appsUsersRoutersMe 
} from '@/generated';
import type { LoginRequest, RegisterRequest, UserSchema, CreatorProfileSchema } from '@/generated/types.gen';

interface AuthContextType {
  user: UserSchema | null;
  creatorProfile: CreatorProfileSchema | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ─── Helpers ────────────────────────────────────────────────────────────────

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token') || Cookies.get('access_token') || null;
}

function storeTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('access_token', accessToken);
  Cookies.set('access_token', accessToken, { expires: 7, sameSite: 'lax' });
  Cookies.set('refresh_token', refreshToken, { expires: 7, sameSite: 'lax' });
}

function clearTokens() {
  localStorage.removeItem('access_token');
  Cookies.remove('access_token');
  Cookies.remove('refresh_token');
}

// ─── Provider ────────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserSchema | null>(null);
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfileSchema | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const interceptorSetUp = useRef(false);

  // ── Ensure the auth interceptor is set once on the client ──────────────
  useEffect(() => {
    if (interceptorSetUp.current) return;
    interceptorSetUp.current = true;

    // Use same-origin (empty baseUrl) so requests go through Next.js rewrite proxy
    client.setConfig({ baseUrl: '' });
    client.interceptors.request.clear();
    client.interceptors.request.use((req) => {
      const token = getStoredToken();
      if (token) {
        req.headers.set('Authorization', `Bearer ${token}`);
      }
      return req;
    });
  }, []);

  // ── Load user from /auth/me ────────────────────────────────────────────
  const loadUser = async (): Promise<boolean> => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setCreatorProfile(null);
      setIsLoading(false);
      return false;
    }

    try {
      const { data } = await appsUsersRoutersMe();
      if (!data) throw new Error('empty response');
      setUser(data);
      setCreatorProfile(data.creator_profile ?? null);
      return true;
    } catch {
      // Token may be expired or invalid
      clearTokens();
      setUser(null);
      setCreatorProfile(null);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Run on mount
  useEffect(() => {
    loadUser();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── login ──────────────────────────────────────────────────────────────
  const login = async (data: LoginRequest) => {
    const { data: resData, error } = await appsUsersRoutersLogin({ body: data } as any);
    if (!resData || error) {
      const msg = (error as any)?.detail ?? 'Login failed';
      throw new Error(msg);
    }

    storeTokens(resData.access_token, resData.refresh_token);

    // Immediately update state from the response — no extra /me round-trip
    setUser(resData.user);
    setCreatorProfile(resData.user.creator_profile ?? null);
    setIsLoading(false);

    router.push(`/@${resData.user.creator_profile?.handle ?? ''}`);
  };

  // ── register ──────────────────────────────────────────────────────────
  const register = async (data: RegisterRequest) => {
    const { data: resData, error } = await appsUsersRoutersRegister({ body: data } as any);
    if (!resData || error) {
      const msg = (error as any)?.detail ?? 'Registration failed';
      throw new Error(msg);
    }

    storeTokens(resData.access_token, resData.refresh_token);

    setUser(resData.user);
    setCreatorProfile(resData.user.creator_profile ?? null);
    setIsLoading(false);

    router.push(`/@${resData.user.creator_profile?.handle ?? ''}`);
  };

  // ── logout ─────────────────────────────────────────────────────────────
  const logout = async () => {
    try {
      const refreshToken = Cookies.get('refresh_token');
      if (refreshToken) {
        await appsUsersRoutersLogout({ body: { refresh_token: refreshToken } } as any);
      }
    } finally {
      clearTokens();
      setUser(null);
      setCreatorProfile(null);
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      creatorProfile,
      isAuthenticated: !!user,
      isLoading,
      login,
      register,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
