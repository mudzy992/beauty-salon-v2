import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import type { StylistProfile } from '../types';

function isMissingStylistProfile(error: unknown): boolean {
  if (error instanceof Error && error.message === 'STYLIST_PROFILE_NOT_FOUND') return true;
  if (!error || typeof error !== 'object' || !('response' in error)) return false;
  const response = (error as { response?: { status?: unknown } }).response;
  return response?.status === 404;
}

function extractStylistProfile(payload: unknown): StylistProfile | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;

  const direct = payload as Partial<StylistProfile>;
  if (typeof direct.id === 'string' && direct.id.trim()) return direct as StylistProfile;

  const nested = payload as {
    data?: unknown;
    item?: unknown;
    profile?: unknown;
  };

  const candidates = [nested.data, nested.item, nested.profile];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) continue;
    if (typeof (candidate as Partial<StylistProfile>).id === 'string' && (candidate as Partial<StylistProfile>).id?.trim()) {
      return candidate as StylistProfile;
    }
  }

  return null;
}

export function useStylistProfile() {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const [profile, setProfile] = useState<StylistProfile | null>(null);
  const [profileOwnerUserId, setProfileOwnerUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const requestGeneration = useRef(0);
  const requestOwnerUserId = useRef(userId);

  if (requestOwnerUserId.current !== userId) {
    requestOwnerUserId.current = userId;
    requestGeneration.current += 1;
  }

  const visibleProfile = profileOwnerUserId === userId ? profile : null;

  const fetchProfile = useCallback(async () => {
    const currentUserId = useAuthStore.getState().user?.id ?? null;
    const generation = ++requestGeneration.current;
    const isCurrentRequest = () =>
      requestGeneration.current === generation &&
      requestOwnerUserId.current === currentUserId &&
      useAuthStore.getState().user?.id === currentUserId;

    if (!currentUserId) {
      setProfile(null);
      setProfileOwnerUserId(null);
      setLoadError(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(false);
    try {
      const { data } = await api.get<unknown>('/api/stylists/me');
      if (!isCurrentRequest()) return;
      const parsed = extractStylistProfile(data);
      if (parsed) {
        setProfile(parsed);
        setProfileOwnerUserId(currentUserId);
        return;
      }

      // Fallback if the /me endpoint has an unexpected shape.
      const me = await api.get<unknown>('/api/users/profile');
      if (!isCurrentRequest()) return;
      const mePayload = me.data as {
        id?: unknown;
        user?: { id?: unknown };
        data?: { id?: unknown; user?: { id?: unknown } };
      } | null;
      const userIdFromProfile =
        (typeof mePayload?.id === 'string' && mePayload.id) ||
        (typeof mePayload?.user?.id === 'string' && mePayload.user.id) ||
        (typeof mePayload?.data?.id === 'string' && mePayload.data.id) ||
        (typeof mePayload?.data?.user?.id === 'string' && mePayload.data.user.id);
      if (!userIdFromProfile) throw new Error('USER_ID_NOT_FOUND');

      const byUser = await api.get<unknown>(`/api/stylists/user/${encodeURIComponent(userIdFromProfile)}`);
      if (!isCurrentRequest()) return;
      const parsedByUser = extractStylistProfile(byUser.data);
      if (!parsedByUser) throw new Error('STYLIST_PROFILE_NOT_FOUND');
      setProfile(parsedByUser);
      setProfileOwnerUserId(currentUserId);
    } catch (error: unknown) {
      if (isCurrentRequest()) {
        if (isMissingStylistProfile(error)) {
          setProfile(null);
          setProfileOwnerUserId(null);
          setLoadError(false);
        } else {
          setLoadError(true);
        }
      }
    } finally {
      if (isCurrentRequest()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProfile();
    return () => {
      requestGeneration.current += 1;
    };
  }, [fetchProfile, userId]);

  return {
    profile: visibleProfile,
    profileId: visibleProfile?.id ?? null,
    loading,
    loadError,
    refetch: fetchProfile,
  };
}
