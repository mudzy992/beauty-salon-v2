import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
}: {
  items: BottomNavItem[];
  borderTopRadius?: number;
  blurTargetRef?: React.RefObject<View | null>;
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

  const inactiveColor = isDark ? colors.textSecondary : colors.textMuted;

  const bgColor = isDark ? 'rgba(18,18,20,0.96)' : 'rgba(252,252,253,0.96)';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.09)';

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        {
          height: tabBarHeight,
          borderTopLeftRadius: borderTopRadius,
          borderTopRightRadius: borderTopRadius,
          backgroundColor: bgColor,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: borderColor,
          borderLeftWidth: StyleSheet.hairlineWidth,
          borderLeftColor: borderColor,
          borderRightWidth: StyleSheet.hairlineWidth,
          borderRightColor: borderColor,
        },
        isDark ? styles.shadowDark : styles.shadowLight,
      ]}
    >
      <View style={styles.inner} pointerEvents="box-none">
        {items.map((item) => {
          const focused = item.key === activeKey;
          const color = focused ? colors.tabActive : inactiveColor;
          return (
            <Pressable
              key={item.key}
              style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
              onPress={() => router.push(item.href as any)}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
            >
              <View style={styles.iconWrap}>
                <Ionicons
                  name={(focused ? item.iconActive : item.iconInactive) as any}
                  color={color}
                  size={24}
                />
                {typeof item.badge === 'number' && item.badge > 0 ? (
                  <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.badgeText, { color: colors.primaryText }]}>{item.badge}</Text>
                  </View>
                ) : null}
              </View>
              <Text
                style={[styles.label, { color }]}
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
    zIndex: 20,
    overflow: 'hidden',
  },
  shadowDark: {
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  shadowLight: {
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
    elevation: 6,
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
  itemPressed: {
    opacity: 0.7,
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
});
