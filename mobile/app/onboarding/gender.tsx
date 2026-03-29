import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Redirect, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { OnboardingShell } from '../../src/components/onboarding/OnboardingShell';
import { useAuthStore } from '../../src/store/authStore';
import { isClient } from '../../src/utils/roles';
import { useTheme } from '../../src/hooks/useTheme';
import { Button } from '../../src/components/ui/Button';
import api from '../../src/services/api';
import { spacing } from '../../src/theme';
import { fontFamily } from '../../src/theme/fonts';

export default function OnboardingGenderRoute() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, refreshProfile } = useAuthStore();
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | null>(
    user?.gender === 'MALE' || user?.gender === 'FEMALE' ? user.gender : null,
  );
  const [loading, setLoading] = useState(false);

  if (!user) return <Redirect href="/login" />;
  if (!isClient(user)) return <Redirect href="/" />;
  if (user.genderOnboardingCompleted === true) {
    return <Redirect href="/" />;
  }

  const handleContinue = async () => {
    if (!gender) {
      Alert.alert(t('common.error'), t('onboarding.genderPickError'));
      return;
    }
    setLoading(true);
    try {
      await api.put('/api/users/profile', { gender });
      await refreshProfile();
      router.replace('/');
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
        step={2}
        totalSteps={4}
        title={t('onboarding.genderTitle')}
        subtitle={t('onboarding.genderSubtitle')}
        tip={t('onboarding.genderTip')}
        heroDecoration="gender"
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: spacing.xxl + insets.bottom }}
        >
          <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('onboarding.genderLabel')}</Text>
          <View style={styles.genderBtns}>
            <Pressable
              onPress={() => setGender('MALE')}
              style={[
                styles.genderChip,
                {
                  borderColor: gender === 'MALE' ? colors.primary : colors.border,
                  backgroundColor: gender === 'MALE' ? colors.accent : colors.inputBg,
                },
              ]}
            >
              <Text style={{ color: colors.text, fontFamily: fontFamily.bodySemiBold }}>{t('onboarding.genderMale')}</Text>
            </Pressable>
            <Pressable
              onPress={() => setGender('FEMALE')}
              style={[
                styles.genderChip,
                {
                  borderColor: gender === 'FEMALE' ? colors.primary : colors.border,
                  backgroundColor: gender === 'FEMALE' ? colors.accent : colors.inputBg,
                },
              ]}
            >
              <Text style={{ color: colors.text, fontFamily: fontFamily.bodySemiBold }}>{t('onboarding.genderFemale')}</Text>
            </Pressable>
          </View>
          <Button
            title={t('onboarding.genderContinue')}
            onPress={handleContinue}
            loading={loading}
            style={styles.btn}
          />
        </ScrollView>
      </OnboardingShell>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kav: { flex: 1, backgroundColor: 'transparent' },
  hint: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: spacing.sm,
    fontFamily: fontFamily.bodyMedium,
  },
  genderBtns: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  genderChip: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  btn: {
    marginTop: spacing.sm,
  },
});
