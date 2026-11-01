import React, { useRef, useState } from 'react';
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
import { getApiErrorMessage } from '../../src/utils/apiError';
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
    setGender(user?.gender === 'MALE' || user?.gender === 'FEMALE' ? user.gender : null);
  }, [user?.id]);

  if (!user) return <Redirect href="/login" />;
  if (!isClient(user)) return <Redirect href="/" />;
  if (user.genderOnboardingCompleted === true) {
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

  const handleContinue = async () => {
    if (!gender) {
      Alert.alert(t('common.error'), t('onboarding.genderPickError'));
      return;
    }
    const isCurrentRequest = beginRequest();
    setLoading(true);
    try {
      await api.put('/api/users/profile', { gender });
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
