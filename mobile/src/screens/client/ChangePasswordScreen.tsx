import React, { useState } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFloatingTabBarTotalHeight } from '../../navigation/FloatingTabBar';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { spacing } from '../../theme';
import type { ProfileScreenProps } from '../../navigation/types';

type ChangePasswordProps = Omit<ProfileScreenProps<'ChangePassword'>, 'route'> & {
  route?: ProfileScreenProps<'ChangePassword'>['route'];
  onSuccess?: () => void;
  includeTabBarPadding?: boolean;
  /** `plain` = no elevated card; for onboarding / full-bleed layouts */
  variant?: 'card' | 'plain';
};

export function ChangePasswordScreen({
  navigation,
  onSuccess,
  includeTabBarPadding = true,
  variant = 'card',
}: ChangePasswordProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const tabBarBottom = useFloatingTabBarTotalHeight();
  const bottomInset = includeTabBarPadding ? tabBarBottom : Math.max(insets.bottom, 12) + spacing.md;
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
      await refreshProfile();
      const goNext = () => {
        if (onSuccess) onSuccess();
        else navigation.goBack();
      };
      Alert.alert(t('common.ok'), t('profile.changePassword.success'), [{ text: t('common.ok'), onPress: goNext }]);
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

  const formFields = (
    <>
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
    </>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: variant === 'plain' ? 'transparent' : colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          variant === 'plain' && styles.scrollPlain,
          { paddingBottom: spacing.xxl + bottomInset },
        ]}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {variant === 'plain' ? (
          <View style={styles.plainForm}>{formFields}</View>
        ) : (
          <Card style={[styles.card, { backgroundColor: colors.surface }]}>{formFields}</Card>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.md, paddingBottom: spacing.xxl },
  scrollPlain: { paddingHorizontal: 0, paddingTop: 0 },
  plainForm: { gap: 0 },
  card: { padding: spacing.lg },
  button: { marginTop: spacing.md },
});
