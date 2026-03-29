import React, { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../src/store/authStore';
import { useAppModeStore } from '../src/store/appModeStore';
import { isClient, isStylist } from '../src/utils/roles';
import { LoadingScreen } from '../src/components/ui/LoadingScreen';

const phoneSkipStorageKey = (userId: string) => `onboarding_phone_skip_${userId}`;

export default function Index() {
  const user = useAuthStore((s) => s.user);
  const appMode = useAppModeStore((s) => s.mode);
  const [phoneSkipped, setPhoneSkipped] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id) {
        if (!cancelled) setPhoneSkipped(null);
        return;
      }
      if (user.mustChangePassword || !isClient(user)) {
        if (!cancelled) setPhoneSkipped(true);
        return;
      }
      try {
        const v = await SecureStore.getItemAsync(phoneSkipStorageKey(user.id));
        if (!cancelled) setPhoneSkipped(v === '1');
      } catch {
        if (!cancelled) setPhoneSkipped(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.mustChangePassword, user?.isEmailVerified, user?.gender]);

  if (!user) return <Redirect href="/login" />;

  if (user.mustChangePassword) {
    return <Redirect href="/onboarding/change-password" />;
  }

  const showStylistApp = isStylist(user) && (appMode === 'stylist' || !isClient(user));

  if (!isClient(user)) {
    return <Redirect href={showStylistApp ? '/stylist/inbox' : '/home'} />;
  }

  if (user.genderOnboardingCompleted !== true) {
    return <Redirect href="/onboarding/gender" />;
  }

  if (!user.email?.trim() || !user.isEmailVerified) {
    return <Redirect href="/onboarding/email" />;
  }

  if (user.phone?.trim()) {
    return <Redirect href={showStylistApp ? '/stylist/inbox' : '/home'} />;
  }

  if (phoneSkipped === null) {
    return <LoadingScreen />;
  }

  if (!phoneSkipped) {
    return <Redirect href="/onboarding/phone" />;
  }

  return <Redirect href={showStylistApp ? '/stylist/inbox' : '/home'} />;
}
