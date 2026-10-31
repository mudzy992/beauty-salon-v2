import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchAllNormalizedPublicServices } from '../services/catalog';
import type { Service } from '../types';

type Options = {
  enabled?: boolean;
  activeOnly?: boolean;
};

export function usePublicServiceCatalog({ enabled = true, activeOnly = true }: Options = {}) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(false);
  const requestGeneration = useRef(0);

  const load = useCallback(async () => {
    const generation = ++requestGeneration.current;
    if (!enabled) {
      setLoading(false);
      setError(false);
      return;
    }

    setLoading(true);
    setError(false);
    try {
      const result = await fetchAllNormalizedPublicServices({ activeOnly });
      if (generation !== requestGeneration.current) return;
      setServices(result);
    } catch {
      if (generation === requestGeneration.current) setError(true);
    } finally {
      if (generation === requestGeneration.current) setLoading(false);
    }
  }, [activeOnly, enabled]);

  useEffect(() => {
    void load();
    return () => {
      requestGeneration.current += 1;
    };
  }, [load]);

  return { services, loading, error, retry: load };
}
