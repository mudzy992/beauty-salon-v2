import type { ViewStyle } from 'react-native';

/** Prefer boxShadow over legacy shadow* / elevation (RN modern). */
export function cardElevationStyle(isDark: boolean): Pick<ViewStyle, 'boxShadow'> {
  return {
    boxShadow: isDark
      ? '0 4px 16px rgba(0, 0, 0, 0.45)'
      : '0 2px 12px rgba(0, 0, 0, 0.07)',
  };
}

export function subtleShadow(): Pick<ViewStyle, 'boxShadow'> {
  return { boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' };
}
