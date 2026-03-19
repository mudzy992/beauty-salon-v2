import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useNotificationStore } from '../store/notificationStore';
import { View, Text, StyleSheet, Platform } from 'react-native';

import { HomeScreen } from '../screens/client/HomeScreen';
import { BlogListScreen } from '../screens/client/BlogListScreen';
import { BlogPostScreen } from '../screens/client/BlogPostScreen';
import { SatisfiedClientsScreen } from '../screens/client/SatisfiedClientsScreen';
import { ServicesScreen } from '../screens/client/ServicesScreen';
import { ServiceDetailScreen } from '../screens/client/ServiceDetailScreen';
import { ServiceSingleDetailScreen } from '../screens/client/ServiceSingleDetailScreen';
import { ReservationScreen } from '../screens/client/ReservationScreen';
import { MyReservationsScreen } from '../screens/client/MyReservationsScreen';
import { ProfileScreen } from '../screens/client/ProfileScreen';
import { ChangePasswordScreen } from '../screens/client/ChangePasswordScreen';
import { NotificationsScreen } from '../screens/client/NotificationsScreen';
import { ReviewsScreen } from '../screens/client/ReviewsScreen';

import type {
  MainTabParamList,
  HomeStackParamList,
  ServicesStackParamList,
  ReservationsStackParamList,
  ProfileStackParamList,
} from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const ServicesStack = createNativeStackNavigator<ServicesStackParamList>();
const ReservationsStack = createNativeStackNavigator<ReservationsStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

function useStackScreenOptions() {
  const { colors } = useTheme();
  return {
    headerStyle: { backgroundColor: colors.headerBg },
    headerTintColor: colors.headerText,
    headerTitleStyle: { fontWeight: '600' as const },
    contentStyle: { backgroundColor: colors.background },
  };
}

function HomeStackNavigator() {
  const options = useStackScreenOptions();
  return (
    <HomeStack.Navigator screenOptions={options}>
      <HomeStack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <HomeStack.Screen name="BlogList" component={BlogListScreen} options={{ title: 'Blog' }} />
      <HomeStack.Screen name="BlogPost" component={BlogPostScreen} options={{ title: '' }} />
      <HomeStack.Screen name="SatisfiedClients" component={SatisfiedClientsScreen} options={{ title: 'Zadovoljni klijenti' }} />
    </HomeStack.Navigator>
  );
}

function ServicesStackNavigator() {
  const { t } = useTranslation();
  const options = useStackScreenOptions();
  return (
    <ServicesStack.Navigator screenOptions={options}>
      <ServicesStack.Screen
        name="Services"
        component={ServicesScreen}
        options={{ title: t('services.title') }}
      />
      <ServicesStack.Screen name="ServiceDetail" component={ServiceDetailScreen} />
      <ServicesStack.Screen name="ServiceSingleDetail" component={ServiceSingleDetailScreen} />
      <ServicesStack.Screen
        name="Reservation"
        component={ReservationScreen}
        options={{ title: t('reservation.title') }}
      />
    </ServicesStack.Navigator>
  );
}

function ReservationsStackNavigator() {
  const { t } = useTranslation();
  const options = useStackScreenOptions();
  return (
    <ReservationsStack.Navigator screenOptions={options}>
      <ReservationsStack.Screen
        name="MyReservations"
        component={MyReservationsScreen}
        options={{ title: t('myReservations.title') }}
      />
      <ReservationsStack.Screen
        name="WriteReview"
        component={ReviewsScreen}
        options={{ title: t('reviews.writeReview') }}
      />
    </ReservationsStack.Navigator>
  );
}

function ProfileStackNavigator() {
  const { t } = useTranslation();
  const options = useStackScreenOptions();
  return (
    <ProfileStack.Navigator screenOptions={options}>
      <ProfileStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: t('profile.title') }}
      />
      <ProfileStack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{ title: t('profile.changePasswordLabel') }}
      />
      <ProfileStack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: t('notifications.title') }}
      />
    </ProfileStack.Navigator>
  );
}

function TabBarBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

export function MainNavigator() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  const bottomPad = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 6);
  const tabBarHeight = 52 + bottomPad;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingTop: 8,
          paddingBottom: bottomPad,
          height: tabBarHeight,
        },
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarItemStyle: { paddingTop: 2 },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          tabBarLabel: t('tabs.home'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ServicesTab"
        component={ServicesStackNavigator}
        options={{
          tabBarLabel: t('tabs.services'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'cut' : 'cut-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ReservationsTab"
        component={ReservationsStackNavigator}
        options={{
          tabBarLabel: t('tabs.reservations'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{
          tabBarLabel: t('tabs.profile'),
          tabBarIcon: ({ color, size, focused }) => (
            <View>
              <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
              <TabBarBadge count={unreadCount} />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: '#F44336',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});
