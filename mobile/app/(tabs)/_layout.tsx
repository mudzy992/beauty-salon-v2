import React, { useRef } from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useNotificationStore } from '../../src/store/notificationStore';
import { BottomNavMenu } from '../../src/navigation/BottomNavMenu';
import { BlurTargetView } from 'expo-blur';

export default function TabsLayout() {
  const { t } = useTranslation();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const blurTargetRef = useRef<View | null>(null);

  return (
    <View style={{ flex: 1 }}>
      <BlurTargetView ref={blurTargetRef} style={{ flex: 1 }}>
        <Tabs
          screenOptions={
            {
              headerShown: false,
              // Hide Expo Router built-in tab bar; we render our own.
              tabBarStyle: { display: 'none' },
            } as any
          }
        >
          <Tabs.Screen name="home" options={{ headerShown: false }} />
          <Tabs.Screen name="services" options={{ headerShown: false }} />
          <Tabs.Screen name="reservations" options={{ headerShown: false }} />
          <Tabs.Screen name="profile" options={{ headerShown: false }} />
        </Tabs>
      </BlurTargetView>

      <BottomNavMenu
        borderTopRadius={22}
        blurTargetRef={blurTargetRef}
        items={[
          {
            key: 'home',
            href: '/home',
            label: t('tabs.home'),
            iconActive: 'home',
            iconInactive: 'home-outline',
            isActive: (p) => p.startsWith('/home'),
          },
          {
            key: 'services',
            href: '/services',
            label: t('tabs.services'),
            iconActive: 'cut',
            iconInactive: 'cut-outline',
            isActive: (p) => p.startsWith('/services'),
          },
          {
            key: 'reservations',
            href: '/reservations',
            label: t('tabs.reservations'),
            iconActive: 'calendar',
            iconInactive: 'calendar-outline',
            isActive: (p) => p.startsWith('/reservations'),
          },
          {
            key: 'profile',
            href: '/profile',
            label: t('tabs.profile'),
            iconActive: 'person',
            iconInactive: 'person-outline',
            isActive: (p) => p.startsWith('/profile'),
            badge: unreadCount > 0 ? unreadCount : undefined,
          },
        ]}
      />
    </View>
  );
}

