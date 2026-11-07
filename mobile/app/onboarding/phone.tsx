import React, { useRef, useState } from 'react';
import { StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { Redirect, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { OnboardingShell } from '../../src/components/onboarding/OnboardingShell';
import { useAuthStore } from '../../src/store/authStore';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import api from '../../src/services/api';
import { getApiErrorMessage } from '../../src/utils/apiError';
import { spacing } from '../../src/theme';

const phoneSkipKey = (userId: string) => `onboarding_phone_skip_${userId}`;

export default function OnboardingPhoneRoute() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user, refreshProfile } = useAuthStore();
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [loading, setLoading] = useState(false);
  const requestGeneration = useRef(0);
  const mounted = useRef(true);

  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      requestGeneration.current += 1;
    };
  }, []);

  React.useEffect(() => {
    requestGeneration.current += 1;
    setLoading(false);
    setPhone(user?.phone ?? '');
  }, [user?.id]);

  if (!user) return <Redirect href="/login" />;
  if (user.phone?.trim()) {
    return <Redirect href="/" />;
  }

  const beginRequest = () => {
    const generation = ++requestGeneration.current;
    const requestUserId = user.id;
    return () =>
      mounted.current &&
      generation === requestGeneration.current &&
      useAuthStore.getState().user?.id === requestUserId;
  };

  const handleSave = async () => {
    const trimmed = phone.trim();
    if (!trimmed) {
      Alert.alert(t('common.error'), t('auth.phone'));
      return;
    }
    const isCurrentRequest = beginRequest();
    setLoading(true);
    try {
      await api.put('/api/users/profile', {
        phone: trimmed,
      });
      if (!isCurrentRequest()) return;
      await refreshProfile();
      if (isCurrentRequest()) router.replace('/');
    } catch (error: unknown) {
      if (isCurrentRequest()) {
        Alert.alert(t('common.error'), getApiErrorMessage(error, t('common.error')));
      }
    } finally {
      if (isCurrentRequest()) setLoading(false);
    }
  };

  const handleSkip = async () => {
    const isCurrentRequest = beginRequest();
    try {
      await SecureStore.setItemAsync(phoneSkipKey(user.id), '1');
    } catch {
      // ignore optional skip persistence failures
    }
    if (isCurrentRequest()) router.replace('/');
  };

  return (
    <KeyboardAvoidingView
      style={styles.kav}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <OnboardingShell
        step={4}
        totalSteps={4}
        title={t('onboarding.phoneTitle')}
        subtitle={t('onboarding.phoneSubtitle')}
        tip={t('onboarding.phoneTip')}
        heroDecoration="phone"
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: spacing.xxl + insets.bottom }}
        >
          <Input
            label={t('auth.phone')}
            leftIcon="call-outline"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            placeholder={t('onboarding.phonePlaceholder')}
          />
          <Button title={t('onboarding.savePhone')} onPress={handleSave} loading={loading} style={styles.btn} />
          <Button
            title={t('onboarding.skipPhone')}
            onPress={handleSkip}
            variant="outline"
            disabled={loading}
          />
        </ScrollView>
      </OnboardingShell>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kav: { flex: 1, backgroundColor: 'transparent' },
  btn: {
    marginBottom: spacing.sm,
  },
});
