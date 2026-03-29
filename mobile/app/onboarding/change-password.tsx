import React from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { OnboardingShell } from '../../src/components/onboarding/OnboardingShell';
import { ChangePasswordScreen } from '../../src/screens/client/ChangePasswordScreen';

export default function OnboardingChangePasswordRoute() {
  const { t } = useTranslation();

  return (
    <OnboardingShell
      step={1}
      totalSteps={4}
      title={t('onboarding.passwordTitle')}
      subtitle={t('onboarding.passwordSubtitle')}
      tip={t('onboarding.passwordTip')}
      heroDecoration="lock"
    >
      <ChangePasswordScreen
        navigation={{ goBack: () => router.replace('/') } as never}
        onSuccess={() => router.replace('/')}
        includeTabBarPadding={false}
        variant="plain"
      />
    </OnboardingShell>
  );
}
