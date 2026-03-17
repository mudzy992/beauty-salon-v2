import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
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

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.headerBg },
        headerTintColor: colors.headerText,
        headerTitleStyle: { fontWeight: '600' },
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          paddingBottom: 4,
          height: 60,
        },
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
      }}
    >
      <Tab.Screen
        name="InboxTab"
        component={StylistInboxScreen}
        options={{
          title: 'Zahtjevi',
          tabBarLabel: 'Inbox',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="mail-unread-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="DailyLogTab"
        component={StylistDailyLogNavigator}
        options={{
          headerShown: false,
          tabBarLabel: 'Dnevnik',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ScheduleTab"
        component={StylistScheduleNavigator}
        options={{
          headerShown: false,
          tabBarLabel: 'Raspored',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="StatsTab"
        component={StylistStatsScreen}
        options={{
          title: 'Statistika',
          tabBarLabel: 'Statistika',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={StylistProfileScreen}
        options={{
          title: 'Profil',
          tabBarLabel: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
