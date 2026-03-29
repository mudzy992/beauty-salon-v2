import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Redirect, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { OnboardingShell } from '../../src/components/onboarding/OnboardingShell';
import { useAuthStore } from '../../src/store/authStore';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import api from '../../src/services/api';
import { spacing } from '../../src/theme';
import { fontFamily } from '../../src/theme/fonts';

export default function OnboardingEmailRoute() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user, refreshProfile } = useAuthStore();
  const [email, setEmail] = useState(user?.email ?? '');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(
    () => !!user?.email?.trim() && !user.isEmailVerified,
  );
  const [loading, setLoading] = useState(false);

  if (!user) return <Redirect href="/login" />;
  if (user.isEmailVerified && user.email?.trim()) {
    if (user.phone?.trim()) {
      return <Redirect href="/" />;
    }
    return <Redirect href="/onboarding/phone" />;
  }

  const handleSaveAndSendCode = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert(t('common.error'), t('auth.email'));
      return;
    }
    setLoading(true);
    try {
      await api.put('/api/users/profile', {
        email: trimmed,
      });
      await refreshProfile();
      await api.post('/auth/send-verification-email');
      setCodeSent(true);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
          : t('common.error');
      Alert.alert(t('common.error'), Array.isArray(msg) ? msg[0] : String(msg ?? t('common.error')));
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    try {
      await api.post('/auth/send-verification-email');
      Alert.alert(t('common.ok'), t('profile.verifyEmailCodeSent'));
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
          : t('common.error');
      Alert.alert(t('common.error'), Array.isArray(msg) ? msg[0] : String(msg ?? t('common.error')));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    const trimmed = code.trim();
    if (trimmed.length !== 6) {
      Alert.alert(t('common.error'), t('profile.verifyEmailEnterCode'));
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/verify-email', { token: trimmed });
      await refreshProfile();
      router.replace('/onboarding/phone');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
          : t('common.error');
      Alert.alert(t('common.error'), Array.isArray(msg) ? msg[0] : String(msg ?? t('common.error')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.kav}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <OnboardingShell
        step={3}
        totalSteps={4}
        title={t('onboarding.emailTitle')}
        subtitle={t('onboarding.emailSubtitle')}
        tip={t('onboarding.emailTip')}
        heroDecoration="mail"
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: spacing.xxl + insets.bottom }}
        >
          <Input
            label={t('auth.email')}
            leftIcon="mail-outline"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={t('onboarding.emailPlaceholder')}
            editable={!codeSent}
          />

          {!codeSent ? (
            <Button
              title={t('onboarding.saveEmail')}
              onPress={handleSaveAndSendCode}
              loading={loading}
              style={styles.btn}
            />
          ) : null}

          {codeSent ? (
            <View style={styles.codeBlock}>
              <Input
                label={t('profile.verifyEmailEnterCode')}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
                placeholder={t('onboarding.codePlaceholder')}
                style={styles.codeInput}
              />
              <Button title={t('onboarding.verifyEmail')} onPress={handleVerify} loading={loading} style={styles.btn} />
              <Button
                title={t('onboarding.sendCode')}
                onPress={handleResendCode}
                loading={loading}
                style={styles.btnSecondary}
              />
            </View>
          ) : null}
        </ScrollView>
      </OnboardingShell>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kav: { flex: 1, backgroundColor: 'transparent' },
  codeInput: {
    letterSpacing: 4,
    textAlign: 'center',
    fontSize: 22,
    fontFamily: fontFamily.heading,
  },
  codeBlock: {
    marginTop: spacing.md,
  },
  btn: {
    marginTop: spacing.sm,
  },
  btnSecondary: {
    marginTop: spacing.sm,
    opacity: 0.85,
  },
});
