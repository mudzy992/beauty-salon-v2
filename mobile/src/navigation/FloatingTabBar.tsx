import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const FLOATING_TAB_BAR_CONTENT_MIN_HEIGHT = 56;
export const FLOATING_TAB_BAR_VERTICAL_CHROME = 4 + 8;

export function useFloatingTabBarTotalHeight(): number {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 6);
  return FLOATING_TAB_BAR_VERTICAL_CHROME + FLOATING_TAB_BAR_CONTENT_MIN_HEIGHT + bottomPad;
}
