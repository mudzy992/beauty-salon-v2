import { useMemo } from 'react';
import { useNavigation, useRouter } from 'expo-router';

type AppKind = 'auth' | 'client' | 'stylist';

type ClientTab =
  | 'HomeTab'
  | 'ServicesTab'
  | 'ReservationsTab'
  | 'ProfileTab';

type StylistTab =
  | 'InboxTab'
  | 'DailyLogTab'
  | 'ScheduleTab'
  | 'StatsTab'
  | 'ProfileTab';

export type ReactNavTab = ClientTab | StylistTab | null;

export type ReactNavAdapterContext = {
  appKind: AppKind;
  currentTab: ReactNavTab;
  currentScreenName: string;
  routeParams: Record<string, any>;
};

export function normalizeSearchParams(params: Record<string, string | string[] | undefined>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [key, val] of Object.entries(params)) {
    out[key] = Array.isArray(val) ? val[0] : val;
  }
  return out;
}

function getClientDefaultRootScreen(tab: ClientTab): string {
  switch (tab) {
    case 'HomeTab':
      return 'Home';
    case 'ServicesTab':
      return 'Services';
    case 'ReservationsTab':
      return 'MyReservations';
    case 'ProfileTab':
      return 'Profile';
  }
}

function getStylistDefaultRootScreen(tab: StylistTab): string {
  switch (tab) {
    case 'InboxTab':
      return 'InboxTab';
    case 'DailyLogTab':
      return 'DailyLogList';
    case 'ScheduleTab':
      return 'ScheduleList';
    case 'StatsTab':
      return 'StatsTab';
    case 'ProfileTab':
      return 'ProfileTab';
  }
}

export function useReactNavAdapter(ctx: ReactNavAdapterContext) {
  const router = useRouter();
  const expoNav = useNavigation<any>();

  return useMemo(() => {
    const goBack = () => {
      // expo-router provides a back() method.
      (router as any).back?.();
    };

    const setOptions = (opts: any) => {
      expoNav?.setOptions?.(opts);
    };

    const navigateClientInternal = (tab: Exclude<ReactNavTab, null>, screenName: string, params?: Record<string, any>) => {
      if (tab !== 'HomeTab' && tab !== 'ServicesTab' && tab !== 'ReservationsTab' && tab !== 'ProfileTab') {
        return;
      }

      const target = (() => {
        switch (tab) {
          case 'HomeTab': {
            switch (screenName) {
              case 'Home':
                return { pathname: '/home' };
              case 'BlogList':
                return { pathname: '/home/blog-list' };
              case 'BlogPost':
                return { pathname: '/home/blog-post/[slug]', params: { slug: params?.slug } };
              case 'SatisfiedClients':
                return { pathname: '/home/satisfied-clients' };
            }
            return null;
          }
          case 'ServicesTab': {
            switch (screenName) {
              case 'Services':
                return { pathname: '/services' };
              case 'ServiceDetail':
                return {
                  pathname: '/services/service-detail',
                  params: { categoryId: params?.categoryId, categoryName: params?.categoryName },
                };
              case 'ServiceSingleDetail':
                return {
                  pathname: '/services/service-single-detail',
                  params: { serviceId: params?.serviceId, serviceName: params?.serviceName },
                };
              case 'ServiceWorkGallery':
                return {
                  pathname: '/services/service-work-gallery',
                  params: { serviceId: params?.serviceId, serviceName: params?.serviceName },
                };
              case 'Reservation':
                return {
                  pathname: '/services/reservation',
                  params: {
                    serviceId: params?.serviceId,
                    serviceName: params?.serviceName,
                    startAtStep: params?.startAtStep,
                    origin: params?.origin,
                    requestId: params?.requestId,
                    originCategoryId: params?.originCategoryId,
                    originCategoryName: params?.originCategoryName,
                  },
                };
            }
            return null;
          }
          case 'ReservationsTab': {
            switch (screenName) {
              case 'MyReservations':
                return { pathname: '/reservations' };
              case 'WriteReview':
                return {
                  pathname: '/reservations/write-review',
                  params: { reservationId: params?.reservationId, serviceId: params?.serviceId },
                };
            }
            return null;
          }
          case 'ProfileTab': {
            switch (screenName) {
              case 'Profile':
                return { pathname: '/profile' };
              case 'EditProfile':
                return { pathname: '/profile/edit' };
              case 'ChangePassword':
                return { pathname: '/profile/change-password' };
              case 'Notifications':
                return { pathname: '/profile/notifications' };
              case 'Contact':
                return { pathname: '/profile/contact' };
            }
            return null;
          }
        }
      })();

      if (!target) return;
      router.push(target as any);
    };

    const navigateClientTabRoot = (tab: ClientTab, nested?: { screen?: string; params?: Record<string, any> }) => {
      const screenName = nested?.screen ?? getClientDefaultRootScreen(tab);
      navigateClientInternal(tab, screenName, nested?.params);
    };

    const navigateStylistInternal = (tab: Exclude<ReactNavTab, null>, screenName: string, params?: Record<string, any>) => {
      if (tab !== 'InboxTab' && tab !== 'DailyLogTab' && tab !== 'ScheduleTab' && tab !== 'StatsTab' && tab !== 'ProfileTab') {
        return;
      }

      const target = (() => {
        switch (tab) {
          case 'DailyLogTab': {
            switch (screenName) {
              case 'DailyLogList':
                return { pathname: '/stylist/daily-log' };
              case 'DailyLogDetail':
                return { pathname: '/stylist/daily-log/detail/[entryId]', params: { entryId: params?.entryId } };
              case 'DailyLogNewEntry':
                return { pathname: '/stylist/daily-log/new-entry' };
              case 'ReschedulePreview':
                return {
                  pathname: '/stylist/daily-log/reschedule-preview/[reservationId]',
                  params: {
                    reservationId: params?.reservationId,
                    includeBreaks: params?.includeBreaks,
                    mode: params?.mode,
                    manualShiftMinutes: params?.manualShiftMinutes,
                  },
                };
            }
            return null;
          }
          case 'ScheduleTab': {
            switch (screenName) {
              case 'ScheduleList':
                return { pathname: '/stylist/schedule' };
              case 'StylistReservationDetail':
                return {
                  pathname: '/stylist/schedule/reservation-detail/[reservationId]',
                  params: { reservationId: params?.reservationId },
                };
            }
            return null;
          }
          case 'InboxTab':
            return tab === 'InboxTab' && screenName === 'InboxTab' ? { pathname: '/stylist/inbox' } : null;
          case 'StatsTab':
            return tab === 'StatsTab' && screenName === 'StatsTab' ? { pathname: '/stylist/stats' } : null;
          case 'ProfileTab':
            return tab === 'ProfileTab' && screenName === 'ProfileTab' ? { pathname: '/stylist/profile' } : null;
        }
      })();

      if (!target) return;
      router.push(target as any);
    };

    const navigateStylistTabRoot = (tab: StylistTab, nested?: { screen?: string; params?: Record<string, any> }) => {
      const screenName = nested?.screen ?? getStylistDefaultRootScreen(tab);
      // For tab root navigation we still reuse internal mapping by temporarily mapping ctx.currentTab.
      // Instead of mutating ctx, we map directly here.
      switch (tab) {
        case 'InboxTab':
          router.push('/stylist/inbox');
          return;
        case 'StatsTab':
          router.push('/stylist/stats');
          return;
        case 'ProfileTab':
          router.push('/stylist/profile');
          return;
        case 'DailyLogTab': {
          switch (screenName) {
            case 'DailyLogList':
              router.push('/stylist/daily-log');
              return;
            case 'DailyLogDetail':
              router.push({ pathname: '/stylist/daily-log/detail/[entryId]', params: { entryId: nested?.params?.entryId } });
              return;
            case 'DailyLogNewEntry':
              router.push('/stylist/daily-log/new-entry');
              return;
            case 'ReschedulePreview':
              router.push({
                pathname: '/stylist/daily-log/reschedule-preview/[reservationId]',
                params: {
                  reservationId: nested?.params?.reservationId,
                  includeBreaks: nested?.params?.includeBreaks,
                  mode: nested?.params?.mode,
                  manualShiftMinutes: nested?.params?.manualShiftMinutes,
                },
              });
              return;
          }
          return;
        }
        case 'ScheduleTab': {
          switch (screenName) {
            case 'ScheduleList':
              router.push('/stylist/schedule');
              return;
            case 'StylistReservationDetail':
              router.push({
                pathname: '/stylist/schedule/reservation-detail/[reservationId]',
                params: { reservationId: nested?.params?.reservationId },
              });
              return;
          }
          return;
        }
      }
    };

    const navigate = (name: string, params?: any) => {
      if (ctx.appKind === 'auth') {
        if (name === 'Login') router.push('/login');
        if (name === 'Register') router.push('/register');
        return;
      }

      if (ctx.appKind === 'client') {
        if (!ctx.currentTab) return;
        navigateClientInternal(ctx.currentTab, name, params);
        return;
      }

      if (ctx.appKind === 'stylist') {
        if (!ctx.currentTab) return;
        navigateStylistInternal(ctx.currentTab, name, params);
        return;
      }
    };

    const getParent = () => {
      return {
        navigate: (tabName: string, args?: any) => {
          if (ctx.appKind === 'client') {
            const tab = tabName as ClientTab;
            if (tab === 'HomeTab' || tab === 'ServicesTab' || tab === 'ReservationsTab' || tab === 'ProfileTab') {
              navigateClientTabRoot(tab, args ? { screen: args.screen, params: args.params } : undefined);
              return;
            }
          }

          if (ctx.appKind === 'stylist') {
            const tab = tabName as StylistTab;
            if (tab === 'InboxTab' || tab === 'DailyLogTab' || tab === 'ScheduleTab' || tab === 'StatsTab' || tab === 'ProfileTab') {
              navigateStylistTabRoot(tab, args ? { screen: args.screen, params: args.params } : undefined);
              return;
            }
          }
        },
      };
    };

    const getState = () => {
      return {
        routes: [
          {
            name: ctx.currentScreenName,
            params: ctx.routeParams,
          },
        ],
      };
    };

    return {
      navigate,
      goBack,
      setOptions,
      getParent,
      getState,
    };
  }, [ctx, expoNav, router]);
}

// expo-router treats files under `app/` as potential routes; provide a default export to silence warnings.
export default function ReactNavAdapterRoute() {
  return null;
}

