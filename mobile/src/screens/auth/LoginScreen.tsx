import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MediaImage } from '../../components/MediaImage';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/authStore';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import api, { getImageUrl } from '../../services/api';
import { spacing, borderRadius } from '../../theme';
import { fontFamily } from '../../theme/fonts';
import type { AuthScreenProps } from '../../navigation/types';
import { AxiosError } from 'axios';

function resolveLoginImageUrl(value: string): string {
  if (!value?.trim()) return '';
  const v = value.trim();
  if (v.startsWith('http')) return v;
  return getImageUrl(v) || '';
}

interface PublicSetting {
  key: string;
  value: string;
}

function isPublicSetting(value: unknown): value is PublicSetting {
  if (!value || typeof value !== 'object') return false;
  const setting = value as Record<string, unknown>;
  return typeof setting.key === 'string' && typeof setting.value === 'string';
}

function normalizeSettings(input: unknown): PublicSetting[] {
  if (Array.isArray(input)) return input.filter(isPublicSetting);
  if (input && typeof input === 'object') {
    const payload = input as { items?: unknown; settings?: unknown };
    if (Array.isArray(payload.items)) return payload.items.filter(isPublicSetting);
    if (Array.isArray(payload.settings)) return payload.settings.filter(isPublicSetting);
  }
  return [];
}

function getSettingValue(settings: PublicSetting[] | null | undefined, key: string, fallback: string): string {
  if (!Array.isArray(settings)) return fallback;
  const item = settings.find((s) => s.key === key);
  return item?.value?.trim() || fallback;
}

function getLoginErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<{ message?: string | string[] }>;
  if (!axiosError.response) {
    return (
      'Nema konekcije s serverom. Na emulatoru/uređaju u .env postavite EXPO_PUBLIC_API_URL na IP računala (npr. http://192.168.1.100:3000).'
    );
  }
  const msg = axiosError.response.data?.message;
  if (Array.isArray(msg)) return msg.join('\n');
  if (typeof msg === 'string') return msg;
  if (axiosError.response.status === 401) return 'Pogrešno korisničko ime ili lozinka.';
  if (axiosError.response.status >= 500) return 'Greška na serveru. Pokušajte ponovo.';
  return 'Greška pri prijavi.';
}

export function LoginScreen({ navigation }: AuthScreenProps<'Login'>) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { login, isLoading } = useAuthStore();

  const [settings, setSettings] = useState<PublicSetting[] | null>(null);
  const [loginValue, setLoginValue] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ login?: string; password?: string }>({});

  useEffect(() => {
    api.get<unknown>('/api/settings/public').then(({ data }) => setSettings(normalizeSettings(data))).catch(() => {});
  }, []);

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!loginValue.trim()) newErrors.login = 'Obavezno polje';
    if (!password) newErrors.password = 'Obavezno polje';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    try {
      await login(loginValue.trim(), password);
      router.replace('/');
    } catch (error) {
      const message = getLoginErrorMessage(error);
      Alert.alert(t('common.error'), message);
    }
  };

  const loginImageUrl = resolveLoginImageUrl(getSettingValue(settings, 'public_login_image', ''));
  const loginTitle = getSettingValue(settings, 'public_login_title', t('auth.loginTitle'));
  const loginSubtitle = getSettingValue(settings, 'public_login_subtitle', t('auth.loginSubtitle'));

  return (
    <View style={styles.container}>
      <MediaImage
        uri={settings !== null ? loginImageUrl : undefined}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.88)']}
        locations={[0, 0.25, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safe} edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={[styles.scroll, { paddingBottom: spacing.xxl + insets.bottom + 16 }]}
            contentInsetAdjustmentBehavior="automatic"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.white }]}>
                {loginTitle}
              </Text>
              <Text style={[styles.subtitle, { color: colors.champagne }]}>
                {loginSubtitle}
              </Text>
            </View>

            {/* Form card */}
            <View style={[styles.formCard, { borderColor: 'rgba(212,168,67,0.30)' }]}>
              <Input
                label={t('auth.loginOrUsername')}
                value={loginValue}
                onChangeText={setLoginValue}
                leftIcon="mail-outline"
                autoCapitalize="none"
                keyboardType="email-address"
                error={errors.login}
                labelStyle={styles.inputLabel}
              />

              <Input
                label={t('auth.password')}
                value={password}
                onChangeText={setPassword}
                leftIcon="lock-closed-outline"
                isPassword
                error={errors.password}
                labelStyle={styles.inputLabel}
              />

                <Button
                  title={t('auth.loginButton')}
                  onPress={handleLogin}
                  loading={isLoading}
                  fullWidth
                  size="lg"
                  style={styles.loginButton}
                />
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {t('auth.noAccount')}{' '}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={[styles.footerLink, { color: colors.primary }]}>
                  {t('auth.registerButton')}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    padding: spacing.lg,
    paddingTop: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 34,
    fontFamily: fontFamily.heading,
    letterSpacing: 0.8,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: fontFamily.body,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    opacity: 0.8,
  },
  formCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginBottom: spacing.xl,
  },
  loginButton: {
    marginTop: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  inputLabel: {
    color: 'rgba(255,255,255,0.75)',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 15,
    fontFamily: fontFamily.body,
    color: 'rgba(255,255,255,0.60)',
  },
  footerLink: {
    fontSize: 15,
    fontFamily: fontFamily.bodySemiBold,
  },
});
