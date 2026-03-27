import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import api from '../api/client';

interface User {
  sub: string;
  username: string;
  email: string | null;
  phone: string | null;
  gender: 'MALE' | 'FEMALE' | null;
  isEmailVerified: boolean;
  mustChangePassword: boolean;
  roles: string[];
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<User>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  isReady: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    window.dispatchEvent(new Event('auth-change'));
  }, []);

  const mapProfileToUser = (profile: {
    id: string;
    username: string;
    email: string | null;
    phone?: string | null;
    gender?: 'MALE' | 'FEMALE' | null;
    isEmailVerified?: boolean;
    mustChangePassword?: boolean;
    userRoles?: { role: { name: string } }[];
    roles?: string[];
  }): User => {
    const roles = profile.roles ?? profile.userRoles?.map((r) => r.role.name) ?? [];
    return {
      sub: profile.id,
      username: profile.username,
      email: profile.email ?? null,
      phone: profile.phone ?? null,
      gender: profile.gender ?? null,
      isEmailVerified: profile.isEmailVerified ?? false,
      mustChangePassword: profile.mustChangePassword ?? false,
      roles,
    };
  };

  const refreshProfile = useCallback(async () => {
    const profile = await api.get<{
      id: string;
      username: string;
      email: string | null;
      phone?: string | null;
      gender?: 'MALE' | 'FEMALE' | null;
      isEmailVerified?: boolean;
      mustChangePassword?: boolean;
      userRoles?: { role: { name: string } }[];
      roles?: string[];
    }>('/api/users/profile');
    setUser(mapProfileToUser(profile.data));
  }, []);

  const loginFn = useCallback(
    async (username: string, password: string): Promise<User> => {
      const { data } = await api.post<{ access_token: string }>('/auth/login', {
        login: username,
        password,
      });
      const newToken = data.access_token;
      localStorage.setItem(TOKEN_KEY, newToken);
      api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
      const profile = await api.get<{
        id: string;
        username: string;
        email: string | null;
        phone?: string | null;
        gender?: 'MALE' | 'FEMALE' | null;
        isEmailVerified?: boolean;
        mustChangePassword?: boolean;
        userRoles?: { role: { name: string } }[];
        roles?: string[];
      }>('/api/users/profile');
      const userData = mapProfileToUser(profile.data);
      setUser(userData);
      setToken(newToken);
      window.dispatchEvent(new Event('auth-change'));
      return userData;
    },
    []
  );

  useEffect(() => {
    if (!token) {
      setIsReady(true);
      return;
    }
    api
      .get<{
        id: string;
        username: string;
        email: string | null;
        phone?: string | null;
        gender?: 'MALE' | 'FEMALE' | null;
        isEmailVerified?: boolean;
        mustChangePassword?: boolean;
        userRoles?: { role: { name: string } }[];
        roles?: string[];
      }>('/api/users/profile')
      .then((r) => {
        setUser(mapProfileToUser(r.data));
      })
      .catch(() => logout())
      .finally(() => setIsReady(true));
  }, [token, logout]);

  const value: AuthContextValue = {
    user,
    token,
    login: loginFn,
    logout,
    refreshProfile,
    isReady,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
