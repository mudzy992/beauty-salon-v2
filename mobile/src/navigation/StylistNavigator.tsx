import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { StylistInboxScreen } from '../screens/stylist/StylistInboxScreen';
import { StylistProfileScreen } from '../screens/stylist/StylistProfileScreen';
import { StylistStatsScreen } from '../screens/stylist/StylistStatsScreen';
import { StylistDailyLogNavigator } from './StylistDailyLogNavigator';
import { StylistScheduleNavigator } from './StylistScheduleNavigator';
import type { StylistTabParamList } from './types';

const Tab = createBottomTabNavigator<StylistTabParamList>();

export function StylistNavigator() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 6);
  const tabBarHeight = 52 + bottomPad;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.headerBg },
        headerTintColor: colors.headerText,
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingTop: 6,
          paddingBottom: bottomPad,
          height: tabBarHeight,
        },
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarItemStyle: { paddingTop: 2 },
      }}
    >
      <Tab.Screen
        name="InboxTab"
        component={StylistInboxScreen}
        options={{
          title: 'Zahtjevi',
          tabBarLabel: 'Inbox',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'mail-unread' : 'mail-unread-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="DailyLogTab"
        component={StylistDailyLogNavigator}
        options={{
          headerShown: false,
          tabBarLabel: 'Dnevnik',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'document-text' : 'document-text-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ScheduleTab"
        component={StylistScheduleNavigator}
        options={{
          headerShown: false,
          tabBarLabel: 'Raspored',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="StatsTab"
        component={StylistStatsScreen}
        options={{
          title: 'Statistika',
          tabBarLabel: 'Statistika',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'stats-chart' : 'stats-chart-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={StylistProfileScreen}
        options={{
          title: 'Profil',
          tabBarLabel: 'Profil',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
