import React, { useMemo } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useReactNavAdapter, normalizeSearchParams, type ReactNavTab } from './reactNavAdapter';

type Props = {
  ScreenComponent: React.ComponentType<any>;
  appKind: 'auth' | 'client' | 'stylist';
  currentTab: ReactNavTab;
  currentScreenName: string;
  parseRouteParams?: (params: Record<string, any>) => Record<string, any>;
};

export function ReactNavScreenWrapper({
  ScreenComponent,
  appKind,
  currentTab,
  currentScreenName,
  parseRouteParams,
}: Props) {
  const rawParams = useLocalSearchParams();

  const routeParams = useMemo(() => {
    const normalized = normalizeSearchParams(rawParams as any);
    return parseRouteParams ? parseRouteParams(normalized) : normalized;
  }, [rawParams, parseRouteParams]);

  const navigation = useReactNavAdapter({
    appKind,
    currentTab,
    currentScreenName,
    routeParams,
  });

  return <ScreenComponent navigation={navigation} route={{ params: routeParams }} />;
}

// expo-router treats files under `app/` as potential routes; provide a default export to silence warnings.
export default function ReactNavScreenWrapperRoute() {
  return null;
}

