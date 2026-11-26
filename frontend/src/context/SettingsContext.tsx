import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from 'react';
import { useSocketEvent } from './SocketContext';
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
  const { setGlobalTheme } = useTheme();
  const requestId = useRef(0);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    const id = ++requestId.current;
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
      if (id !== requestId.current) return;
      setSettings(settingsMap);
      setGlobalTheme(settingsMap.theme_default_mode);
    } catch (err) {
      if (id === requestId.current) console.error('Failed to load settings', err);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [setGlobalTheme]);

  useEffect(() => {
    void fetchSettings();
    return () => { requestId.current += 1; };
  }, [fetchSettings]);

  useEffect(() => {
    const root = document.documentElement;
    // Retired theme settings could leave inline brand overrides. Clear stale values
    // once so the fixed Aurum palette always comes from the theme tokens.
    const brandNames: string[] = [];
    for (let index = 0; index < root.style.length; index += 1) {
      const name = root.style.item(index);
      if (name.startsWith('--brand-')) brandNames.push(name);
    }
    brandNames.forEach((name) => root.style.removeProperty(name));
  }, []);

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
