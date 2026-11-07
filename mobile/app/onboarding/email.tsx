import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Redirect, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../src/hooks/useTheme';
import { OnboardingShell } from '../../src/components/onboarding/OnboardingShell';
import { useAuthStore } from '../../src/store/authStore';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import api from '../../src/services/api';
import { getApiErrorMessage } from '../../src/utils/apiError';
import { spacing } from '../../src/theme';
import { fontFamily } from '../../src/theme/fonts';

export default function OnboardingEmailRoute() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, refreshProfile } = useAuthStore();
  const [email, setEmail] = useState(user?.email ?? '');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(
    () => !!user?.email?.trim() && !user.isEmailVerified,
  );
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
    setEmail(user?.email ?? '');
    setCode('');
    setCodeSent(!!user?.email?.trim() && !user.isEmailVerified);
  }, [user?.id]);

  if (!user) return <Redirect href="/login" />;
  if (user.isEmailVerified && user.email?.trim()) {
    if (user.phone?.trim()) {
      return <Redirect href="/" />;
    }
    return <Redirect href="/onboarding/phone" />;
  }

  const beginRequest = () => {
    const generation = ++requestGeneration.current;
    const requestUserId = user.id;
    return () =>
      mounted.current &&
      generation === requestGeneration.current &&
      useAuthStore.getState().user?.id === requestUserId;
  };

  const handleSaveAndSendCode = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert(t('common.error'), t('auth.email'));
      return;
    }
    const isCurrentRequest = beginRequest();
    setLoading(true);
    try {
      await api.put('/api/users/profile', {
        email: trimmed,
      });
      if (!isCurrentRequest()) return;
      await refreshProfile();
      if (!isCurrentRequest()) return;
      await api.post('/auth/send-verification-email');
      if (isCurrentRequest()) setCodeSent(true);
    } catch (error: unknown) {
      if (isCurrentRequest()) {
        Alert.alert(t('common.error'), getApiErrorMessage(error, t('common.error')));
      }
    } finally {
      if (isCurrentRequest()) setLoading(false);
    }
  };

  const handleResendCode = async () => {
    const isCurrentRequest = beginRequest();
    setLoading(true);
    try {
      await api.post('/auth/send-verification-email');
      if (isCurrentRequest()) Alert.alert(t('common.ok'), t('profile.verifyEmailCodeSent'));
    } catch (error: unknown) {
      if (isCurrentRequest()) {
        Alert.alert(t('common.error'), getApiErrorMessage(error, t('common.error')));
      }
    } finally {
      if (isCurrentRequest()) setLoading(false);
    }
  };

  const handleVerify = async () => {
    const trimmed = code.trim();
    if (trimmed.length !== 6) {
      Alert.alert(t('common.error'), t('profile.verifyEmailEnterCode'));
      return;
    }
    const isCurrentRequest = beginRequest();
    setLoading(true);
    try {
      await api.post('/auth/verify-email', { token: trimmed });
      if (!isCurrentRequest()) return;
      await refreshProfile();
      if (isCurrentRequest()) router.replace('/onboarding/phone');
    } catch (error: unknown) {
      if (isCurrentRequest()) {
        Alert.alert(t('common.error'), getApiErrorMessage(error, t('common.error')));
      }
    } finally {
      if (isCurrentRequest()) setLoading(false);
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
              <Text
                accessibilityRole="text"
                accessibilityLiveRegion="polite"
                style={[styles.codeSentMessage, { color: colors.textSecondary }]}
              >
                {t('profile.verifyEmailCodeSent')}
              </Text>
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
  codeSentMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  btn: {
    marginTop: spacing.sm,
  },
  btnSecondary: {
    marginTop: spacing.sm,
    opacity: 0.85,
  },
});
