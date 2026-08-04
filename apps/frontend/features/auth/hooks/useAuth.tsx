"use client";
import {
  appsUsersRoutersLogin,
  appsUsersRoutersLogout,
  appsUsersRoutersMe,
  appsUsersRoutersRefresh,
  appsUsersRoutersRegister,
} from "@/generated";
import { client } from "@/generated/client.gen";
import type {
  CreatorProfileSchema,
  LoginRequest,
  RegisterRequest,
  UserSchema,
} from "@/generated/types.gen";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  storeAccessToken,
  storeTokens,
} from "@/shared/lib/apiClient";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

interface AuthContextType {
  user: UserSchema | null;
  creatorProfile: CreatorProfileSchema | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** True when the session has fully expired (refresh token gone) — show re-login modal */
  sessionExpired: boolean;
  dismissSessionExpired: () => void;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserSchema | null>(null);
  const [creatorProfile, setCreatorProfile] =
    useState<CreatorProfileSchema | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const router = useRouter();
  const interceptorSetUp = useRef(false);

  // ── Ensure the auth interceptor is set once on the client ──────────────
  useEffect(() => {
    if (interceptorSetUp.current) return;
    interceptorSetUp.current = true;

    client.setConfig({ baseUrl: "" });
    client.interceptors.request.clear();
    client.interceptors.request.use((req) => {
      const token = getAccessToken();
      if (token) {
        req.headers.set("Authorization", `Bearer ${token}`);
      }
      return req;
    });
  }, []);

  // ── Listen for session-expired events from the error interceptor ───────
  useEffect(() => {
    const handleExpired = () => {
      setUser(null);
      setCreatorProfile(null);
      setSessionExpired(true);
    };
    window.addEventListener("session-expired", handleExpired);
    return () => window.removeEventListener("session-expired", handleExpired);
  }, []);

  // ── Load user on mount ─────────────────────────────────────────────────
  // Strategy:
  //   1. Try /auth/me with the stored access token.
  //   2. If that 401s, try to refresh the access token silently.
  //   3. If refresh succeeds, retry /auth/me with the new token.
  //   4. If refresh also fails, the session is gone — user stays logged out.
  //      (No modal on cold load — the user just sees the logged-out state.)
  const loadUser = async () => {
    const token = getAccessToken();
    if (!token) {
      // No token at all — check if we have a refresh token and can bootstrap
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        await tryRefreshAndLoadUser();
      } else {
        setIsLoading(false);
      }
      return;
    }

    try {
      const { data } = await appsUsersRoutersMe();
      if (!data) throw new Error("empty response");
      setUser(data);
      setCreatorProfile(data.creator_profile ?? null);
    } catch {
      // Access token likely expired — try refreshing silently
      const refreshed = await tryRefreshAndLoadUser();
      if (!refreshed) {
        clearTokens();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const tryRefreshAndLoadUser = async (): Promise<boolean> => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    try {
      const { data: refreshData } = await appsUsersRoutersRefresh({
        body: { refresh_token: refreshToken },
      });
      if (!refreshData?.access_token) return false;

      storeAccessToken(refreshData.access_token);

      // Now load the user with the fresh token
      const { data } = await appsUsersRoutersMe();
      if (!data) return false;
      setUser(data);
      setCreatorProfile(data.creator_profile ?? null);
      return true;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── login ──────────────────────────────────────────────────────────────
  const login = async (data: LoginRequest) => {
    const { data: resData, error } = await appsUsersRoutersLogin({
      body: data,
    } as any);
    if (!resData || error) {
      const msg = (error as any)?.detail ?? "Login failed";
      throw new Error(msg);
    }

    storeTokens(resData.access_token, resData.refresh_token);
    setUser(resData.user);
    setCreatorProfile(resData.user.creator_profile ?? null);
    setSessionExpired(false);
    setIsLoading(false);

    router.push(`/@${resData.user.creator_profile?.handle ?? ""}`);
  };

  // ── register ──────────────────────────────────────────────────────────
  const register = async (data: RegisterRequest) => {
    const { data: resData, error } = await appsUsersRoutersRegister({
      body: data,
    } as any);
    if (!resData || error) {
      const msg = (error as any)?.detail ?? "Registration failed";
      throw new Error(msg);
    }

    storeTokens(resData.access_token, resData.refresh_token);
    setUser(resData.user);
    setCreatorProfile(resData.user.creator_profile ?? null);
    setSessionExpired(false);
    setIsLoading(false);

    router.push(`/@${resData.user.creator_profile?.handle ?? ""}`);
  };

  // ── logout ─────────────────────────────────────────────────────────────
  const logout = async () => {
    try {
      const refreshToken = Cookies.get("refresh_token");
      if (refreshToken) {
        await appsUsersRoutersLogout({
          body: { refresh_token: refreshToken },
        } as any);
      }
    } finally {
      clearTokens();
      setUser(null);
      setCreatorProfile(null);
      setSessionExpired(false);
      router.push("/login");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        creatorProfile,
        isAuthenticated: !!user,
        isLoading,
        sessionExpired,
        dismissSessionExpired: () => setSessionExpired(false),
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
