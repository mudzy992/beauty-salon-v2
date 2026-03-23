import type { ViewStyle } from 'react-native';

/** Multi-layer boxShadow reads more natural than a single hard drop (Apple-style depth). */
export function cardElevationStyle(isDark: boolean): Pick<ViewStyle, 'boxShadow'> {
  return {
    boxShadow: isDark
      ? '0 1px 0 rgba(255,255,255,0.06), 0 8px 24px rgba(0,0,0,0.55), 0 24px 48px rgba(0,0,0,0.35)'
      : '0 1px 0 rgba(255,255,255,0.9), 0 2px 8px rgba(0,0,0,0.04), 0 12px 32px rgba(0,0,0,0.08), 0 24px 48px rgba(0,0,0,0.04)',
  };
}

export function subtleShadow(): Pick<ViewStyle, 'boxShadow'> {
  return { boxShadow: '0 1px 2px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.06)' };
}

/** Horizontal media tiles — softer lift on the card itself (parent stays flat). */
export function serviceTileShadow(isDark: boolean): Pick<ViewStyle, 'boxShadow'> {
  return {
    boxShadow: isDark
      ? '0 4px 14px rgba(0,0,0,0.4), 0 10px 28px rgba(0,0,0,0.22)'
      : '0 2px 8px rgba(0,0,0,0.06), 0 8px 20px rgba(0,0,0,0.07)',
  };
}
