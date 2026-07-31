'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserSchema | null>(null);
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfileSchema | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const loadUser = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) throw new Error("No token");
      
      const { data } = await appsUsersRoutersMe();
      if (!data) throw new Error("Failed to load user");
      
      setUser(data);
      setCreatorProfile(data.creator_profile || null);
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
    try {
      const { data: resData } = await appsUsersRoutersLogin({ body: data } as any);
      if (!resData) throw new Error("Login failed");
      localStorage.setItem('access_token', resData.access_token);
      Cookies.set('access_token', resData.access_token, { expires: 7 });
      Cookies.set('refresh_token', resData.refresh_token, { expires: 7 });
      await loadUser();
      router.push(`/@${resData.user.creator_profile.handle}`);
    } catch (error: any) {
      const errMessage = error?.body?.detail || "Login failed";
      throw new Error(errMessage);
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      const { data: resData } = await appsUsersRoutersRegister({ body: data } as any);
      if (!resData) throw new Error("Registration failed");
      localStorage.setItem('access_token', resData.access_token);
      Cookies.set('access_token', resData.access_token, { expires: 7 });
      Cookies.set('refresh_token', resData.refresh_token, { expires: 7 });
      await loadUser();
      router.push(`/@${resData.user.creator_profile.handle}`);
    } catch (error: any) {
      const errMessage = error?.body?.detail || "Registration failed";
      throw new Error(errMessage);
    }
  };

  const logout = async () => {
    try {
      const refreshToken = Cookies.get('refresh_token');
      if (refreshToken) {
        await appsUsersRoutersLogout({ body: { refresh_token: refreshToken } } as any);
      }
    } finally {
      localStorage.removeItem('access_token');
      Cookies.remove('access_token');
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
