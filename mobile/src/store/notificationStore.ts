import { create } from 'zustand';
import api from '../services/api';
import { useAuthStore } from './authStore';
import type { Notification } from '../types';
import { normalizeNotifications } from '../utils/apiPayload';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  fetchError: boolean;
  ownerId: string | null;

  setActiveUser: (userId: string | null) => void;
  fetch: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => {
  let requestGeneration = 0;

  return {
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    fetchError: false,
    ownerId: null,

    setActiveUser: (userId) => {
      if (get().ownerId === userId) return;
      requestGeneration += 1;
      set({
        ownerId: userId,
        notifications: [],
        unreadCount: 0,
        isLoading: false,
        fetchError: false,
      });
    },

    fetch: async () => {
      const userId = useAuthStore.getState().user?.id ?? null;
      if (!userId) {
        get().setActiveUser(null);
        set({ isLoading: false });
        return;
      }
      if (get().ownerId !== userId) get().setActiveUser(userId);
      const requestId = ++requestGeneration;
      const isCurrentRequest = () =>
        requestGeneration === requestId &&
        get().ownerId === userId &&
        useAuthStore.getState().user?.id === userId;
      set({ isLoading: true, fetchError: false });
      try {
        const { data } = await api.get<unknown>('/api/notifications');
        if (!isCurrentRequest()) return;
        const notifications = normalizeNotifications(data);
        if (!notifications) {
          set({ isLoading: false, fetchError: true });
          return;
        }
        const unreadCount = notifications.filter((notification) => !notification.isRead).length;
        set({ notifications, unreadCount, isLoading: false, fetchError: false });
      } catch {
        if (isCurrentRequest()) set({ isLoading: false, fetchError: true });
      }
    },

    markAsRead: async (id: string) => {
      const userId = useAuthStore.getState().user?.id ?? null;
      if (!userId || get().ownerId !== userId) return;
      try {
        await api.patch(`/api/notifications/${id}/read`);
        if (useAuthStore.getState().user?.id !== userId || get().ownerId !== userId) return;
        set((state) => ({
          notifications: state.notifications.map((notification) =>
            notification.id === id
              ? { ...notification, isRead: true, readAt: new Date().toISOString() }
              : notification,
          ),
          unreadCount: Math.max(0, state.unreadCount - 1),
        }));
      } catch {
        // Keep the in-memory unread state until the server confirms the mutation.
      }
    },
  };
});
