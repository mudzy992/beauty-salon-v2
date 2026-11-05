import { useCallback, useEffect, useRef, useState } from 'react';
import { usePublicContentSocketRefresh } from './usePublicContentSocketRefresh';
import { clearPublicSettingsCache, fetchPublicSettings } from '../services/publicSettings';

/** Public service prices are visible by default unless the public boolean setting is explicitly false. */
export function usePublicServicePricesEnabled(): boolean {
  const [enabled, setEnabled] = useState(true);
  const requestGeneration = useRef(0);

  const refresh = useCallback(async () => {
    const generation = ++requestGeneration.current;
    clearPublicSettingsCache();
    try {
      const settings = await fetchPublicSettings();
      if (generation !== requestGeneration.current) return;
      const value = settings.find((setting) => setting.key === 'public_service_prices_enabled')?.value;
      setEnabled(value?.trim().toLowerCase() !== 'false');
    } catch {
      if (generation === requestGeneration.current) setEnabled(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
    return () => {
      requestGeneration.current += 1;
    };
  }, [refresh]);

  usePublicContentSocketRefresh(refresh);
  return enabled;
}
