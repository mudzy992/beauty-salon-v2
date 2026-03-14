import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';

export interface AppSetting {
  key: string;
  value: string | null;
}

interface SettingsContextValue {
  settings: Record<string, string>;
  getSetting: (key: string, defaultValue: string) => string;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const baseURL = import.meta.env.VITE_API_URL || '';
      const url = baseURL ? `${baseURL.replace(/\/$/, '')}/api/settings` : '/api/settings';
      
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
        if (s.value !== null) settingsMap[s.key] = s.value;
      });
      setSettings(settingsMap);
    } catch (err) {
      console.error('Failed to load settings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const getSetting = (key: string, defaultValue: string) => {
    return settings[key] !== undefined && settings[key] !== '' ? settings[key] : defaultValue;
  };

  return (
    <SettingsContext.Provider value={{ settings, getSetting, loading, refreshSettings: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
