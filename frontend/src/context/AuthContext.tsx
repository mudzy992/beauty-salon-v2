import { createContext, useCallback, useContext, ReactNode } from 'react'
import { useAuthStore } from '../stores/auth.store'

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user) as User | null
  const isReady = useAuthStore((s) => s.isReady)
  const logout = useAuthStore((s) => s.logout)
  const refreshProfileStore = useAuthStore((s) => s.refreshProfile)
  const loginStore = useAuthStore((s) => s.login)

  const refreshProfile = useCallback(async (): Promise<User> => {
    return (await refreshProfileStore()) as User
  }, [refreshProfileStore])

  const loginFn = useCallback(
    async (username: string, password: string): Promise<User> => {
      return (await loginStore(username, password)) as User
    },
    [loginStore],
  )

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
