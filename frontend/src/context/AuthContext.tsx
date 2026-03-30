import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import api from '../api/client';

interface User {
  sub: string;
  username: string;
  email: string | null;
  phone: string | null;
  gender: 'MALE' | 'FEMALE' | null;
  genderOnboardingCompleted?: boolean;
  isEmailVerified: boolean;
  mustChangePassword: boolean;
  roles: string[];
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<User>;
  logout: () => void;
  refreshProfile: () => Promise<User>;
  isReady: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'token';

function parseRolesFromJwt(token: string | null): string[] {
  if (!token) return [];
  try {
    const parts = token.split('.');
    if (parts.length < 2) return [];
    const payload = JSON.parse(atob(parts[1])) as { roles?: unknown };
    const r = payload.roles;
    if (!Array.isArray(r)) return [];
    return r.map((x) => String(x).trim().toUpperCase()).filter(Boolean);
  } catch {
    return [];
  }
}

type ProfilePayload = {
  id: string;
  username: string;
  email: string | null;
  phone?: string | null;
  gender?: 'MALE' | 'FEMALE' | null;
  genderOnboardingCompleted?: boolean;
  isEmailVerified?: boolean;
  mustChangePassword?: boolean;
  userRoles?: { role: { name: string } }[];
  roles?: string[];
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    delete api.defaults.headers.common.Authorization;
    setToken(null);
    setUser(null);
    window.dispatchEvent(new Event('auth-change'));
    window.location.assign('/');
  }, []);

  const mapProfileToUser = (profile: ProfilePayload, jwtFallbackToken: string | null = null): User => {
    const raw =
      profile.roles ??
      profile.userRoles?.map((r) => r.role?.name).filter((n): n is string => Boolean(n)) ??
      [];
    let roles = raw.map((r) => String(r).trim().toUpperCase()).filter(Boolean);
    if (roles.length === 0 && jwtFallbackToken) {
      roles = parseRolesFromJwt(jwtFallbackToken);
    }
    const asBool = (v: unknown, fallback = false): boolean => {
      if (v === true || v === 1) return true;
      if (v === false || v === 0 || v == null) return false;
      if (typeof v === 'string') {
        const s = v.trim().toLowerCase();
        if (s === '1' || s === 'true' || s === 'yes') return true;
        if (s === '0' || s === 'false' || s === '') return false;
      }
      return fallback;
    };
    return {
      sub: profile.id,
      username: profile.username,
      email: profile.email ?? null,
      phone: profile.phone ?? null,
      gender: profile.gender ?? null,
      genderOnboardingCompleted: asBool(profile.genderOnboardingCompleted),
      isEmailVerified: asBool(profile.isEmailVerified),
      mustChangePassword: asBool(profile.mustChangePassword),
      roles,
    };
  };

  const refreshProfile = useCallback(async (): Promise<User> => {
    const profile = await api.get<{
      id: string;
      username: string;
      email: string | null;
      phone?: string | null;
      gender?: 'MALE' | 'FEMALE' | null;
      genderOnboardingCompleted?: boolean;
      isEmailVerified?: boolean;
      mustChangePassword?: boolean;
      userRoles?: { role: { name: string } }[];
      roles?: string[];
    }>('/api/users/profile');
    const mapped = mapProfileToUser(profile.data);
    setUser(mapped);
    return mapped;
  }, []);

  const loginFn = useCallback(
    async (username: string, password: string): Promise<User> => {
      const { data } = await api.post<{
        access_token: string;
        user?: ProfilePayload;
      }>('/auth/login', {
        login: username,
        password,
      });
      const newToken = data.access_token;
      localStorage.setItem(TOKEN_KEY, newToken);
      api.defaults.headers.common.Authorization = `Bearer ${newToken}`;

      let userData: User;
      if (data.user?.id) {
        userData = mapProfileToUser(data.user, newToken);
      } else {
        const profile = await api.get<ProfilePayload>('/api/users/profile');
        userData = mapProfileToUser(profile.data, newToken);
      }
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
      .get<ProfilePayload>('/api/users/profile')
      .then((r) => {
        setUser(mapProfileToUser(r.data, token));
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
