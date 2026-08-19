import React from 'react';
import { View } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { BottomNavMenu } from '../../../src/navigation/BottomNavMenu';
import { useAuthStore } from '../../../src/store/authStore';
import { isStylist } from '../../../src/utils/roles';

export default function StylistTabsLayout() {
  const { user, isInitialized } = useAuthStore();

  if (!isInitialized) return null;
  if (!user || !isStylist(user)) return <Redirect href="/login" />;

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={
          {
            headerShown: false,
            tabBarStyle: { display: 'none' },
          } as any
        }
      >
        <Tabs.Screen name="inbox" options={{ headerShown: false }} />
        <Tabs.Screen name="daily-log" options={{ headerShown: false }} />
        <Tabs.Screen name="schedule" options={{ headerShown: false }} />
        <Tabs.Screen name="stats" options={{ headerShown: false }} />
        <Tabs.Screen name="profile" options={{ headerShown: false }} />
      </Tabs>

      <BottomNavMenu
        borderTopRadius={22}
        items={[
          {
            key: 'inbox',
            href: '/stylist/inbox',
            label: 'Inbox',
            iconActive: 'mail-unread',
            iconInactive: 'mail-unread-outline',
            isActive: (p) => p.startsWith('/stylist/inbox'),
          },
          {
            key: 'daily-log',
            href: '/stylist/daily-log',
            label: 'Dnevnik',
            iconActive: 'document-text',
            iconInactive: 'document-text-outline',
            isActive: (p) => p.startsWith('/stylist/daily-log'),
          },
          {
            key: 'schedule',
            href: '/stylist/schedule',
            label: 'Raspored',
            iconActive: 'calendar',
            iconInactive: 'calendar-outline',
            isActive: (p) => p.startsWith('/stylist/schedule'),
          },
          {
            key: 'stats',
            href: '/stylist/stats',
            label: 'Statistika',
            iconActive: 'stats-chart',
            iconInactive: 'stats-chart-outline',
            isActive: (p) => p.startsWith('/stylist/stats'),
          },
          {
            key: 'profile',
            href: '/stylist/profile',
            label: 'Profil',
            iconActive: 'person',
            iconInactive: 'person-outline',
            isActive: (p) => p.startsWith('/stylist/profile'),
          },
        ]}
      />
    </View>
  );
}
