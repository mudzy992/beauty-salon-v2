import { create } from 'zustand';
import { AxiosError } from 'axios';
import api, { setStoredToken, removeStoredToken, readStoredToken, setOnUnauthorized } from '../services/api';
import type { User, LoginResponse } from '../types';
import { StoredTokenUnavailableError } from '../services/token-storage';
import { extractUserFromPayload } from './auth-user';
import { removeAuthTokenSafely } from './session-cleanup';

export type SessionBootstrapError = 'storage' | 'network' | 'profile';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  isInitializing: boolean;
  bootstrapError: SessionBootstrapError | null;
  profileRefreshError: boolean;
  isRefreshingProfile: boolean;

  initialize: () => Promise<void>;
  login: (login: string, password: string) => Promise<void>;
  replaceToken: (token: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<boolean>;
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
  let profileRefreshCount = 0;

  setOnUnauthorized(() => {
    void get().logout().catch(() => undefined);
  });

  return {
    user: null,
    token: null,
    isLoading: false,
    isInitialized: false,
    isInitializing: false,
    bootstrapError: null,
    profileRefreshError: false,
    isRefreshingProfile: false,

    initialize: async () => {
      if (get().isInitializing) return;
      set({ isInitializing: true });

      const tokenRead = await readStoredToken();
      if (tokenRead.status === 'unavailable') {
        set({ bootstrapError: 'storage', isInitialized: true, isInitializing: false });
        return;
      }

      const token = tokenRead.token;
      if (!token) {
        set({
          user: null,
          token: null,
          bootstrapError: null,
          isInitialized: true,
          isInitializing: false,
        });
        return;
      }

      try {
        const { data } = await api.get<unknown>('/api/users/profile');
        const user = extractUserFromPayload(data);
        if (!user) {
          set({ token, bootstrapError: 'profile', isInitialized: true, isInitializing: false });
          return;
        }
        set({
          user,
          token,
          bootstrapError: null,
          profileRefreshError: false,
          isInitialized: true,
          isInitializing: false,
        });
      } catch (error) {
        const status = (error as AxiosError)?.response?.status;
        if (status === 401) {
          await removeAuthTokenSafely(removeStoredToken);
          set({
            user: null,
            token: null,
            bootstrapError: null,
            isInitialized: true,
            isInitializing: false,
          });
          return;
        }

        // Storage/network/server/contract errors are not proof of logout; preserve the saved token for retry.
        set({
          token,
          bootstrapError: error instanceof StoredTokenUnavailableError
            ? 'storage'
            : status === undefined || status >= 500
              ? 'network'
              : 'profile',
          isInitialized: true,
          isInitializing: false,
        });
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
        set({ user, token, isLoading: false, bootstrapError: null, profileRefreshError: false });
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
      await removeAuthTokenSafely(removeStoredToken);
      set({ user: null, token: null, bootstrapError: null, profileRefreshError: false });
    },

    refreshProfile: async () => {
      const currentUserId = get().user?.id;
      if (!currentUserId) return false;

      profileRefreshCount += 1;
      set({ isRefreshingProfile: true });
      try {
        const { data } = await api.get<unknown>('/api/users/profile');
        const user = extractUserFromPayload(data);
        if (!user || user.id !== currentUserId || get().user?.id !== currentUserId) {
          if (get().user?.id === currentUserId) set({ profileRefreshError: true });
          return false;
        }
        set({ user, profileRefreshError: false });
        return true;
      } catch (error) {
        const status = (error as AxiosError)?.response?.status;
        if (status !== 401 && get().user?.id === currentUserId) {
          set({ profileRefreshError: true });
        }
        return false;
      } finally {
        profileRefreshCount = Math.max(0, profileRefreshCount - 1);
        set({ isRefreshingProfile: profileRefreshCount > 0 });
      }
    },
  };
});
