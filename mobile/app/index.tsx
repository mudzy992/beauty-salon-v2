import React from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { useAppModeStore } from '../src/store/appModeStore';
import { isClient, isStylist } from '../src/utils/roles';

export default function Index() {
  const user = useAuthStore((s) => s.user);
  const appMode = useAppModeStore((s) => s.mode);

  if (!user) return <Redirect href="/login" />;

  const showStylistApp = isStylist(user) && (appMode === 'stylist' || !isClient(user));
  return <Redirect href={showStylistApp ? '/stylist/inbox' : '/home'} />;
}

