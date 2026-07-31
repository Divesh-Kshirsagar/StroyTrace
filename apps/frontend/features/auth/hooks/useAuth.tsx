'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { postApiV1AuthLogin, postApiV1AuthRegister, postApiV1AuthLogout, getApiV1AuthMe } from '@/generated/services.gen';
import type { LoginRequest, RegisterRequest, UserSchema, CreatorProfileSchema } from '@/generated/types.gen';
import { OpenAPI } from '@/shared/lib/apiClient';

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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserSchema | null>(null);
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfileSchema | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const loadUser = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) throw new Error("No token");
      
      const { data, error } = await getApiV1AuthMe();
      if (error || !data) throw new Error("Failed to load user");
      
      setUser(data);
      setCreatorProfile(data.creator_profile);
    } catch (err) {
      setUser(null);
      setCreatorProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const login = async (data: LoginRequest) => {
    const { data: resData, error } = await postApiV1AuthLogin({ body: data });
    if (error || !resData) {
        const errMessage = (error as any)?.detail || "Login failed";
        throw new Error(errMessage);
    }
    
    localStorage.setItem('access_token', resData.access_token);
    Cookies.set('refresh_token', resData.refresh_token, { expires: 7 });
    await loadUser();
    router.push(`/@${resData.user.creator_profile.handle}`);
  };

  const register = async (data: RegisterRequest) => {
    const { data: resData, error } = await postApiV1AuthRegister({ body: data });
    if (error || !resData) {
        const errMessage = (error as any)?.detail || "Registration failed";
        throw new Error(errMessage);
    }
    
    localStorage.setItem('access_token', resData.access_token);
    Cookies.set('refresh_token', resData.refresh_token, { expires: 7 });
    await loadUser();
    router.push(`/@${resData.user.creator_profile.handle}`);
  };

  const logout = async () => {
    try {
      const refreshToken = Cookies.get('refresh_token');
      if (refreshToken) {
        await postApiV1AuthLogout({ body: { refresh_token: refreshToken } });
      }
    } finally {
      localStorage.removeItem('access_token');
      Cookies.remove('refresh_token');
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
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
