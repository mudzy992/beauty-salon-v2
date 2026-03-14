import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import type { StylistProfile } from '../types';

export function useStylistProfile() {
  const [profile, setProfile] = useState<StylistProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<StylistProfile>('/api/stylists/me');
      setProfile(data);
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
