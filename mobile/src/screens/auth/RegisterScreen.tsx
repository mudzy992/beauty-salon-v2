import React, { useState } from 'react';
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
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/authStore';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { spacing } from '../../theme';
import type { AuthScreenProps } from '../../navigation/types';
import { AxiosError } from 'axios';

export function RegisterScreen({ navigation }: AuthScreenProps<'Register'>) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { register, isLoading } = useAuthStore();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = 'Obavezno polje';
    if (!form.lastName.trim()) e.lastName = 'Obavezno polje';
    if (!form.username.trim()) e.username = 'Obavezno polje';
    if (!form.email.trim()) e.email = 'Obavezno polje';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Nevažeći email';
    if (!form.password) e.password = 'Obavezno polje';
    else if (form.password.length < 6) e.password = 'Minimalno 6 karaktera';
    if (form.password !== form.confirmPassword)
      e.confirmPassword = 'Lozinke se ne poklapaju';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    try {
      await register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim() || undefined,
      });
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string | string[] }>;
      const msg = axiosError.response?.data?.message;
      const message = Array.isArray(msg) ? msg.join('\n') : msg || 'Greška pri registraciji';
      Alert.alert(t('common.error'), message);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: spacing.xl + insets.bottom + 8 }]}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.title, { color: colors.text }]} selectable>
            {t('auth.registerTitle')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]} selectable>
            {t('auth.registerSubtitle')}
          </Text>

          <View>
            <Card style={{ marginBottom: spacing.md }}>
          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Input
                label={t('auth.firstName')}
                value={form.firstName}
                onChangeText={(v) => update('firstName', v)}
                leftIcon="person-outline"
                error={errors.firstName}
              />
            </View>
            <View style={styles.halfInput}>
              <Input
                label={t('auth.lastName')}
                value={form.lastName}
                onChangeText={(v) => update('lastName', v)}
                error={errors.lastName}
              />
            </View>
          </View>

          <Input
            label={t('auth.username')}
            value={form.username}
            onChangeText={(v) => update('username', v)}
            leftIcon="at-outline"
            autoCapitalize="none"
            error={errors.username}
          />

          <Input
            label={t('auth.email')}
            value={form.email}
            onChangeText={(v) => update('email', v)}
            leftIcon="mail-outline"
            autoCapitalize="none"
            keyboardType="email-address"
            error={errors.email}
          />

          <Input
            label={t('auth.phone')}
            value={form.phone}
            onChangeText={(v) => update('phone', v)}
            leftIcon="call-outline"
            keyboardType="phone-pad"
          />

          <Input
            label={t('auth.password')}
            value={form.password}
            onChangeText={(v) => update('password', v)}
            leftIcon="lock-closed-outline"
            isPassword
            error={errors.password}
          />

          <Input
            label="Potvrdite lozinku"
            value={form.confirmPassword}
            onChangeText={(v) => update('confirmPassword', v)}
            leftIcon="lock-closed-outline"
            isPassword
            error={errors.confirmPassword}
          />

          <Button
            title={t('auth.registerButton')}
            onPress={handleRegister}
            loading={isLoading}
            fullWidth
            style={{ marginTop: spacing.sm }}
          />
            </Card>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              {t('auth.hasAccount')}{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={[styles.footerLink, { color: colors.primary }]}>
                {t('auth.loginButton')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  halfInput: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  footerText: { fontSize: 15 },
  footerLink: { fontSize: 15, fontWeight: '600' },
});
