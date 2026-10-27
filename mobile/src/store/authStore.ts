import { create } from 'zustand';
import { AxiosError } from 'axios';
import api, { setStoredToken, removeStoredToken, getStoredToken, setOnUnauthorized } from '../services/api';
import type { User, LoginResponse } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isInitialized: boolean;

  initialize: () => Promise<void>;
  login: (login: string, password: string) => Promise<void>;
  replaceToken: (token: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

function extractUserFromPayload(payload: unknown): User | null {
  if (!payload || typeof payload !== 'object') return null;

  const direct = payload as Partial<User>;
  if (typeof direct.id === 'string') return direct as User;

  const nested = payload as { user?: unknown; data?: { user?: unknown } };
  const nestedUser = nested.user ?? nested.data?.user;
  if (nestedUser && typeof nestedUser === 'object' && typeof (nestedUser as Partial<User>).id === 'string') {
    return nestedUser as User;
  }

  return null;
}

export const useAuthStore = create<AuthState>((set, get) => {
  setOnUnauthorized(() => {
    get().logout();
  });

  return {
    user: null,
    token: null,
    isLoading: false,
    isInitialized: false,

    initialize: async () => {
      try {
        const token = await getStoredToken();
        if (token) {
          const { data } = await api.get<unknown>('/api/users/profile');
          const user = extractUserFromPayload(data);
          if (user) {
            set({ user, token, isInitialized: true });
            return;
          }
          // Ako payload nije validan user, ne brišemo token odmah; samo završimo init.
          set({ token, isInitialized: true });
        } else {
          set({ isInitialized: true });
        }
      } catch (error) {
        const status = (error as AxiosError)?.response?.status;
        if (status === 401) {
          await removeStoredToken();
          set({ user: null, token: null, isInitialized: true });
          return;
        }
        // Za mrežne/privremene greške ne brišemo token da se sesija ne izgubi nakon reload-a.
        set({ isInitialized: true });
      }
    },

    login: async (login: string, password: string) => {
      set({ isLoading: true });
      try {
        const { data } = await api.post<LoginResponse | unknown>('/auth/login', {
          login,
          password,
        });
        const response = data as LoginResponse;
        const token = response?.access_token;
        const user = extractUserFromPayload(response?.user) ?? extractUserFromPayload(data);
        if (!token || !user) {
          throw new Error('Neispravan odgovor servera pri prijavi.');
        }
        await setStoredToken(token);
        set({ user, token, isLoading: false });
        await get().refreshProfile();
      } catch (error) {
        set({ isLoading: false });
        throw error;
      }
    },

    replaceToken: async (token: string) => {
      await setStoredToken(token);
      set({ token });
    },

    register: async (registerData: RegisterData) => {
      set({ isLoading: true });
      try {
        await api.post('/auth/register', registerData);
        await get().login(registerData.email, registerData.password);
      } catch (error) {
        set({ isLoading: false });
        throw error;
      }
    },

    logout: async () => {
      await removeStoredToken();
      set({ user: null, token: null });
    },

    refreshProfile: async () => {
      try {
        const { data } = await api.get<unknown>('/api/users/profile');
        const user = extractUserFromPayload(data);
        if (user) set({ user });
      } catch {
        // silent fail
      }
    },
  };
});
