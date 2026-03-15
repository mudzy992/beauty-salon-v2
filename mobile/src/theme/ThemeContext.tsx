import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useColorScheme, Appearance } from 'react-native';
import { lightTheme, darkTheme, ThemeColors } from './colors';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  colors: ThemeColors;
  isDark: boolean;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  colors: lightTheme,
  isDark: false,
  mode: 'system',
  setMode: () => {},
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('system');

  const isDark =
    mode === 'system' ? systemScheme === 'dark' : mode === 'dark';

  const colors = isDark ? darkTheme : lightTheme;

  const toggle = useCallback(() => {
    setMode((prev) => {
      if (prev === 'system') return 'dark';
      if (prev === 'dark') return 'light';
      return 'system';
    });
  }, []);

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      if (mode === 'system') {
        // Re-render triggered by useColorScheme hook
      }
    });
    return () => sub.remove();
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ colors, isDark, mode, setMode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
