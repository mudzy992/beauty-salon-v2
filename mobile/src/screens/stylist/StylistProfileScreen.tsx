import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { useFloatingTabBarTotalHeight } from '../../navigation/FloatingTabBar';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/authStore';
import { useAppModeStore } from '../../store/appModeStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { isClient } from '../../utils/roles';
import { spacing } from '../../theme';
import { useApkUpdateCheck } from '../../features/app-update/use-apk-update-check';
import { ApkForceUpdateModal } from '../../features/app-update/apk-force-update-modal';
import { useTranslation } from 'react-i18next';

export function StylistProfileScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const tabBarBottom = useFloatingTabBarTotalHeight();
  const { user, logout } = useAuthStore();
  const setMode = useAppModeStore((s) => s.setMode);
  const canSwitchToClient = user && isClient(user);
  const apkUpdate = useApkUpdateCheck({ auto: false });

  const handleSwitchToClient = () => {
    setMode('client');
    router.replace('/');
  };

  const handleLogout = () => {
    Alert.alert(t('auth.logout'), t('stylist.profile.logoutConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('stylist.profile.logoutConfirmButton'),
        style: 'destructive',
        onPress: logout,
      },
    ]);
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: spacing.xxl + tabBarBottom }]}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      <Card style={styles.userCard}>
        <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>
            {user?.firstName?.[0]}
            {user?.lastName?.[0]}
          </Text>
        </View>
        <Text style={[styles.userName, { color: colors.text }]}>
          {user?.firstName} {user?.lastName}
        </Text>
        <Text style={[styles.roleLabel, { color: colors.primary }]}>{t('stylist.profile.role')}</Text>
      </Card>

      {canSwitchToClient && (
        <Card style={styles.menuCard}>
          <Button
            title={t('stylist.profile.switchToClient')}
            onPress={handleSwitchToClient}
            variant="outline"
            fullWidth
          />
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            {t('stylist.profile.switchToClientHint')}
          </Text>
        </Card>
      )}

      <Card style={styles.menuCard}>
        <Button
          title={t('appUpdate.check')}
          onPress={() => {
            void apkUpdate.checkNow({ manual: true });
          }}
          variant="outline"
          fullWidth
        />
      </Card>

      <Card style={styles.menuCard}>
        <Button
          title={t('stylist.profile.logoutButton')}
          onPress={handleLogout}
          variant="ghost"
          textStyle={{ color: colors.error }}
          fullWidth
        />
      </Card>

      <ApkForceUpdateModal
        release={apkUpdate.release}
        isForce={apkUpdate.isForce}
        downloading={apkUpdate.downloading}
        progress={apkUpdate.progress}
        phase={apkUpdate.phase}
        error={apkUpdate.error}
        onUpdate={() => {
          if (apkUpdate.release) void apkUpdate.startDownload(apkUpdate.release);
        }}
        onLater={apkUpdate.dismissSoft}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md },
  userCard: { alignItems: 'center', marginBottom: spacing.md },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: { fontSize: 28, fontWeight: '700' },
  userName: { fontSize: 20, fontWeight: '700' },
  roleLabel: { fontSize: 14, marginTop: 2, fontWeight: '600' },
  menuCard: { marginBottom: spacing.md },
  hint: { fontSize: 12, marginTop: spacing.sm, textAlign: 'center' },
});
