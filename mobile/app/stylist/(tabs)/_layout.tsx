import React, { useRef } from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { BlurTargetView } from 'expo-blur';
import { BottomNavMenu } from '../../../src/navigation/BottomNavMenu';

export default function StylistTabsLayout() {
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
          <Tabs.Screen name="inbox" options={{ headerShown: false }} />
          <Tabs.Screen name="daily-log" options={{ headerShown: false }} />
          <Tabs.Screen name="schedule" options={{ headerShown: false }} />
          <Tabs.Screen name="stats" options={{ headerShown: false }} />
          <Tabs.Screen name="profile" options={{ headerShown: false }} />
        </Tabs>
      </BlurTargetView>

      <BottomNavMenu
        borderTopRadius={22}
        blurTargetRef={blurTargetRef}
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

