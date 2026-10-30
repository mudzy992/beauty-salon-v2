import { create } from 'zustand';
import api from '../services/api';
import type { Notification } from '../types';
import { normalizeNotifications } from '../utils/apiPayload';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  fetchError: boolean;

  fetch: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  fetchError: false,

  fetch: async () => {
    set({ isLoading: true, fetchError: false });
    try {
      const { data } = await api.get<unknown>('/api/notifications');
      const notifications = normalizeNotifications(data);
      if (!notifications) {
        set({ isLoading: false, fetchError: true });
        return;
      }
      const unreadCount = notifications.filter((notification) => !notification.isRead).length;
      set({ notifications, unreadCount, isLoading: false, fetchError: false });
    } catch {
      set({ isLoading: false, fetchError: true });
    }
  },

  markAsRead: async (id: string) => {
    try {
      await api.patch(`/api/notifications/${id}/read`);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n,
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch {
      // silent fail
    }
  },
}));
