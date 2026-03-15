import { create } from 'zustand';
import api, { setStoredToken, removeStoredToken, getStoredToken, setOnUnauthorized } from '../services/api';
import type { User, LoginResponse } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isInitialized: boolean;

  initialize: () => Promise<void>;
  login: (login: string, password: string) => Promise<void>;
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
          const { data } = await api.get<User>('/api/users/profile');
          set({ user: data, token, isInitialized: true });
        } else {
          set({ isInitialized: true });
        }
      } catch {
        await removeStoredToken();
        set({ user: null, token: null, isInitialized: true });
      }
    },

    login: async (login: string, password: string) => {
      set({ isLoading: true });
      try {
        const { data } = await api.post<LoginResponse>('/auth/login', {
          login,
          password,
        });
        await setStoredToken(data.access_token);
        set({ user: data.user, token: data.access_token, isLoading: false });
      } catch (error) {
        set({ isLoading: false });
        throw error;
      }
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
        const { data } = await api.get<User>('/api/users/profile');
        set({ user: data });
      } catch {
        // silent fail
      }
    },
  };
});
