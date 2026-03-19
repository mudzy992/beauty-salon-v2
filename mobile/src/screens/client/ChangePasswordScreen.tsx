import React, { useState } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import api from '../../services/api';
import { spacing } from '../../theme';
import type { ProfileScreenProps } from '../../navigation/types';

export function ChangePasswordScreen({ navigation }: ProfileScreenProps<'ChangePassword'>) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!currentPassword.trim()) {
      Alert.alert(t('common.error'), t('profile.changePassword.enterCurrent'));
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert(t('common.error'), t('profile.changePassword.minLength'));
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t('common.error'), t('profile.changePassword.mismatch'));
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: currentPassword.trim(),
        newPassword,
      });
      Alert.alert(t('common.ok'), t('profile.changePassword.success'), [
        { text: t('common.ok'), onPress: () => navigation.goBack() },
      ]);
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
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: spacing.xxl + insets.bottom + 8 }]}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Card style={[styles.card, { backgroundColor: colors.surface }]}>
          <Input
            label={t('profile.changePassword.currentPassword')}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          <Input
            label={t('profile.changePassword.newPassword')}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          <Input
            label={t('profile.changePassword.confirmPassword')}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          <Button
            title={t('profile.changePassword.submit')}
            onPress={handleSubmit}
            loading={loading}
            style={styles.button}
          />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.md, paddingBottom: spacing.xxl },
  card: { padding: spacing.lg },
  button: { marginTop: spacing.md },
});
