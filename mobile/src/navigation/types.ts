import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
  StylistMain: NavigatorScreenParams<StylistTabParamList>;
};

export type StylistTabParamList = {
  InboxTab: undefined;
  DailyLogTab: NavigatorScreenParams<StylistDailyLogStackParamList>;
  ScheduleTab: NavigatorScreenParams<StylistScheduleStackParamList>;
  StatsTab: undefined;
  ProfileTab: undefined;
};

export type StylistDailyLogStackParamList = {
  DailyLogList: undefined;
  DailyLogDetail: { entryId: string };
  DailyLogNewEntry: undefined;
  ReschedulePreview: {
    reservationId: string;
    includeBreaks?: boolean;
    mode?: 'actual_overrun' | 'manual_minutes' | 'use_break_only';
    manualShiftMinutes?: number;
  };
};

export type StylistScheduleStackParamList = {
  ScheduleList: undefined;
  StylistReservationDetail: { reservationId: string };
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  ServicesTab: NavigatorScreenParams<ServicesStackParamList>;
  ReservationsTab: NavigatorScreenParams<ReservationsStackParamList>;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
};

export type HomeStackParamList = {
  Home: undefined;
  BlogList: undefined;
  BlogPost: { slug: string };
  Gallery: undefined;
  SatisfiedClients: undefined;
};

export type ServicesStackParamList = {
  Services: undefined;
  ServiceDetail: { categoryId: string; categoryName: string };
  ServiceSingleDetail: { serviceId: string; serviceName?: string };
  ServiceWorkGallery: { serviceId: string; serviceName?: string };
  Reservation: {
    serviceId?: string;
    serviceName?: string;
    startAtStep?: 1 | 2;
    origin?: 'home' | 'services-list' | 'service-detail' | 'service-single' | 'reservations' | 'other';
    requestId?: string;
    originCategoryId?: string;
    originCategoryName?: string;
  };
};

export type ReservationsStackParamList = {
  MyReservations: { focusReservationId?: string } | undefined;
  ReservationDetail: { reservationId: string };
  WriteReview: { reservationId?: string; serviceId?: string };
};

export type ProfileStackParamList = {
  Profile: undefined;
  EditProfile: undefined;
  ChangePassword: undefined;
  Notifications: undefined;
  NotificationPreferences: undefined;
  Contact: undefined;
};

export type AuthScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<AuthStackParamList, T>;
export type HomeScreenProps<T extends keyof HomeStackParamList> = NativeStackScreenProps<HomeStackParamList, T>;
export type ServicesScreenProps<T extends keyof ServicesStackParamList> = NativeStackScreenProps<ServicesStackParamList, T>;
export type ReservationsScreenProps<T extends keyof ReservationsStackParamList> = NativeStackScreenProps<ReservationsStackParamList, T>;
export type ProfileScreenProps<T extends keyof ProfileStackParamList> = NativeStackScreenProps<ProfileStackParamList, T>;
