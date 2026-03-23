import React, { useMemo, type RefObject } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useFloatingTabBarTotalHeight } from './FloatingTabBar';

type BottomNavItem = {
  key: string;
  href: string;
  label: string;
  iconActive: string;
  iconInactive: string;
  isActive: (pathname: string) => boolean;
  badge?: number;
};

export function BottomNavMenu({
  items,
  borderTopRadius = 22,
  blurTargetRef,
}: {
  items: BottomNavItem[];
  borderTopRadius?: number;
  blurTargetRef?: RefObject<View | null>;
}) {
  const { colors, isDark } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useFloatingTabBarTotalHeight();

  const activeKey = useMemo(() => {
    const p = pathname ?? '';
    return items.find((it) => it.isActive(p))?.key ?? items[0]?.key ?? '';
  }, [items, pathname]);

  const blurIntensity = Platform.OS === 'ios' ? 40 : 28;
  // Inactive items can lose contrast on blurred backgrounds.
  // Light theme: use a darker tone for legibility over bright blur.
  const inactiveColor = isDark ? colors.textSecondary : colors.text;
  const inactiveOpacity = 1;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        {
          height: tabBarHeight,
          borderTopLeftRadius: borderTopRadius,
          borderTopRightRadius: borderTopRadius,
        },
        isDark ? styles.noShadow : styles.lightShadow,
      ]}
    >
      <BlurView
        intensity={blurIntensity}
        tint={isDark ? 'dark' : 'default'}
        blurMethod="dimezisBlurViewSdk31Plus"
        blurReductionFactor={3}
        blurTarget={blurTargetRef as any}
        style={[
          styles.background,
          {
            borderTopLeftRadius: borderTopRadius,
            borderTopRightRadius: borderTopRadius,
          },
        ]}
      />

      <View style={styles.inner} pointerEvents="box-none">
        {items.map((item) => {
          const focused = item.key === activeKey;
          const color = focused ? colors.tabActive : inactiveColor;
          return (
            <Pressable
              key={item.key}
              style={styles.item}
              onPress={() => router.push(item.href as any)}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
            >
              <View style={styles.iconWrap}>
                <Ionicons
                  name={(focused ? item.iconActive : item.iconInactive) as any}
                  color={color}
                  size={24}
                  style={!isDark && !focused ? styles.lightIconShadow : undefined}
                />
                {typeof item.badge === 'number' && item.badge > 0 ? (
                  <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.badgeText, { color: '#000' }]}>{item.badge}</Text>
                  </View>
                ) : null}
              </View>
              <Text
                style={[
                  styles.label,
                  { color, opacity: focused ? 1 : inactiveOpacity },
                  !isDark && !focused ? styles.lightLabelShadow : undefined,
                ]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 20,
  },
  noShadow: {
    elevation: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowColor: 'transparent',
  },
  lightShadow: {
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.64,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
  },
  background: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  inner: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 10,
    pointerEvents: 'box-none',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 4,
  },
  iconWrap: {
    width: 40,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    right: 0,
    top: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  label: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 92,
  },
  lightIconShadow: {
    textShadowColor: 'rgba(255,255,255,0.55)',
    textShadowRadius: 3,
    textShadowOffset: { width: 0, height: 0 },
  },
  lightLabelShadow: {
    textShadowColor: 'rgba(255,255,255,0.6)',
    textShadowRadius: 2,
    textShadowOffset: { width: 0, height: 0 },
  },
});
