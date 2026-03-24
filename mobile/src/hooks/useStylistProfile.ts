import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import type { StylistProfile } from '../types';

function extractStylistProfile(payload: unknown): StylistProfile | null {
  if (!payload || typeof payload !== 'object') return null;

  const direct = payload as Partial<StylistProfile>;
  if (typeof direct.id === 'string') return direct as StylistProfile;

  const nested = payload as {
    data?: unknown;
    item?: unknown;
    profile?: unknown;
  };

  const candidates = [nested.data, nested.item, nested.profile];
  for (const c of candidates) {
    if (!c || typeof c !== 'object') continue;
    if (typeof (c as Partial<StylistProfile>).id === 'string') {
      return c as StylistProfile;
    }
  }

  return null;
}

export function useStylistProfile() {
  const [profile, setProfile] = useState<StylistProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<unknown>('/api/stylists/me');
      const parsed = extractStylistProfile(data);
      if (parsed) {
        setProfile(parsed);
        return;
      }

      // Fallback: ako "me" endpoint vrati neočekivan shape, pokušaj preko user profila.
      const me = await api.get<unknown>('/api/users/profile');
      const mePayload = me.data as { id?: string; user?: { id?: string }; data?: { id?: string; user?: { id?: string } } };
      const userId =
        mePayload?.id ??
        mePayload?.user?.id ??
        mePayload?.data?.id ??
        mePayload?.data?.user?.id;
      if (!userId) throw new Error('USER_ID_NOT_FOUND');

      const byUser = await api.get<unknown>(`/api/stylists/user/${userId}`);
      const parsedByUser = extractStylistProfile(byUser.data);
      if (!parsedByUser) throw new Error('STYLIST_PROFILE_NOT_FOUND');
      setProfile(parsedByUser);
    } catch (e: unknown) {
      setProfile(null);
      const msg = e && typeof e === 'object' && 'response' in e && (e as any).response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : msg ?? 'Profil stilista nije pronađen.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    profileId: profile?.id ?? null,
    loading,
    error,
    refetch: fetchProfile,
  };
}
