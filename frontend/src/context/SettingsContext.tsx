import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useSocketEvent } from './SocketContext';
import { buildBrandColorVariables } from '../utils/brand-colors.mjs';
import { useTheme } from '../features/shell/theme/theme-context';

export interface AppSetting {
  key: string;
  value: string;
}

interface SettingsContextValue {
  settings: Record<string, string>;
  getSetting: (key: string, defaultValue: string) => string;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function SettingsSocketSync({ onRefresh }: { onRefresh: () => void }) {
  useSocketEvent(
    'settings:updated',
    useCallback(() => {
      onRefresh();
    }, [onRefresh]),
  );
  return null;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { skin } = useTheme();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const baseURL = import.meta.env.VITE_API_URL || '';
      const url = baseURL
        ? `${baseURL.replace(/\/$/, '')}/api/settings/public`
        : '/api/settings/public';

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: AppSetting[] = await response.json();
      const settingsMap: Record<string, string> = {};
      data.forEach((s) => {
        settingsMap[s.key] = s.value;
      });
      setSettings(settingsMap);
    } catch (err) {
      console.error('Failed to load settings', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    const root = document.documentElement;
    // Q9 / NEJRA §10 — Aurum fiksira paletu. Runtime `theme_primary`/`theme_accent`
    // override se NE primjenjuje, a inline --brand-* varijable koje je klasična
    // tema ranije postavila moraju se ukloniti da ne pobjede CSS (inline > blok).
    // Sama `buildBrandColorVariables` i `test:brand-colors` ostaju netaknuti; pri
    // povratku na `classic` iste korisničke boje se ponovo primjenjuju.
    if (skin !== 'classic') {
      const brandNames: string[] = [];
      for (let index = 0; index < root.style.length; index += 1) {
        const name = root.style.item(index);
        if (name.startsWith('--brand-')) brandNames.push(name);
      }
      brandNames.forEach((name) => root.style.removeProperty(name));
      return;
    }
    const variables = buildBrandColorVariables(settings.theme_primary, settings.theme_accent);
    Object.entries(variables).forEach(([name, value]) => root.style.setProperty(name, value));
  }, [settings, skin]);

  const getSetting = (key: string, defaultValue: string) => {
    return settings[key] !== undefined && settings[key] !== '' ? settings[key] : defaultValue;
  };

  return (
    <SettingsContext.Provider value={{ settings, getSetting, loading, refreshSettings: fetchSettings }}>
      <SettingsSocketSync onRefresh={fetchSettings} />
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
