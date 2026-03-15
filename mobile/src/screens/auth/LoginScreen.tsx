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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
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

const DEFAULT_LOGIN_IMAGE = 'https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&q=80&w=1200';

function getSettingValue(settings: { key: string; value: string }[] | null, key: string, fallback: string): string {
  if (!settings) return fallback;
  const item = settings.find((s) => s.key === key);
  return item?.value?.trim() || fallback;
}

function resolveLoginImageUrl(value: string): string {
  if (!value?.trim()) return DEFAULT_LOGIN_IMAGE;
  const v = value.trim();
  if (v.startsWith('http')) return v;
  return getImageUrl(v) || DEFAULT_LOGIN_IMAGE;
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
  const { login, isLoading } = useAuthStore();

  const [settings, setSettings] = useState<{ key: string; value: string }[] | null>(null);
  const [loginValue, setLoginValue] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ login?: string; password?: string }>({});

  useEffect(() => {
    api.get<{ key: string; value: string }[]>('/api/settings').then(({ data }) => setSettings(data)).catch(() => {});
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
      <Image source={{ uri: loginImageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
      <LinearGradient
        colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.85)']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safe} edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Title block */}
            <View style={styles.header}>
              <View style={styles.titleDecoration}>
                <Ionicons name="sparkles" size={18} color={colors.primary} />
                <View style={[styles.titleLine, { backgroundColor: colors.primary }]} />
                <Ionicons name="sparkles" size={18} color={colors.primary} style={{ transform: [{ scaleX: -1 }] }} />
              </View>
              <Text style={[styles.title, { color: colors.primary }]}>
                {loginTitle}
              </Text>
              <Text style={[styles.subtitle, { color: colors.champagne }]}>
                {loginSubtitle}
              </Text>
            </View>

            {/* Form card */}
            <View style={[styles.formCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
                {t('auth.login')}
              </Text>

              <Input
                label={t('auth.loginOrUsername')}
                value={loginValue}
                onChangeText={setLoginValue}
                leftIcon="mail-outline"
                autoCapitalize="none"
                keyboardType="email-address"
                error={errors.login}
              />

              <Input
                label={t('auth.password')}
                value={password}
                onChangeText={setPassword}
                leftIcon="lock-closed-outline"
                isPassword
                error={errors.password}
              />

              <Button
                title={t('auth.loginButton')}
                onPress={handleLogin}
                loading={isLoading}
                fullWidth
                style={{ marginTop: spacing.sm }}
              />
            </View>

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.champagne }]}>
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
    justifyContent: 'center',
    padding: spacing.lg,
    paddingVertical: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  titleDecoration: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  titleLine: {
    width: 32,
    height: 2,
    marginHorizontal: spacing.xs,
  },
  title: {
    fontSize: 28,
    fontFamily: fontFamily.heading,
    letterSpacing: 0.5,
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
    opacity: 0.95,
  },
  formCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.xl,
    overflow: 'hidden',
  },
  formLabel: {
    fontSize: 13,
    fontFamily: fontFamily.body,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 15,
    fontFamily: fontFamily.body,
  },
  footerLink: {
    fontSize: 15,
    fontFamily: fontFamily.bodySemiBold,
  },
});
