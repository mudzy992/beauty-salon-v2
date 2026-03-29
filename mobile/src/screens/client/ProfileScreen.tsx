import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFloatingTabBarTotalHeight } from '../../navigation/FloatingTabBar';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/authStore';
import { useAppModeStore } from '../../store/appModeStore';
import { isStylist } from '../../utils/roles';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import api, { getImageUrl } from '../../services/api';
import { spacing } from '../../theme';
import { fontFamily } from '../../theme/fonts';
import type { ProfileScreenProps } from '../../navigation/types';

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  rightText?: string;
  danger?: boolean;
}

function MenuItem({ icon, label, onPress, rightText, danger }: MenuItemProps) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity onPress={onPress} style={styles.menuItem} activeOpacity={0.65}>
      <View style={[styles.menuIconContainer, { backgroundColor: danger ? colors.errorLight : colors.accent }]}>
        <Ionicons name={icon} size={20} color={danger ? colors.error : colors.primary} />
      </View>
      <Text style={[styles.menuLabel, { color: danger ? colors.error : colors.text }]}>{label}</Text>
      {rightText && (
        <Text style={[styles.menuRight, { color: colors.textSecondary }]}>{rightText}</Text>
      )}
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

function hasGender(user: { gender?: string | null } | null): boolean {
  return user?.gender === 'MALE' || user?.gender === 'FEMALE';
}

export function ProfileScreen({ navigation }: ProfileScreenProps<'Profile'>) {
  const { t } = useTranslation();
  const { colors, mode, toggle } = useTheme();
  const tabBarBottom = useFloatingTabBarTotalHeight();
  const { user, logout, refreshProfile } = useAuthStore();
  const setMode = useAppModeStore((s) => s.setMode);
  const canSwitchToStylist = user && isStylist(user);
  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifySending, setVerifySending] = useState(false);
  const [verifySubmitting, setVerifySubmitting] = useState(false);

  const themeLabel =
    mode === 'light'
      ? t('profile.themeLight')
      : mode === 'dark'
        ? t('profile.themeDark')
        : t('profile.themeSystem');

  const handleLogout = () => {
    Alert.alert(t('auth.logout'), t('auth.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('auth.logout'), style: 'destructive', onPress: logout },
    ]);
  };

  const handleSendVerificationCode = useCallback(async () => {
    setVerifySending(true);
    try {
      await api.post('/auth/send-verification-email');
      Alert.alert(t('common.ok'), t('profile.verifyEmailCodeSent'));
      setVerifyModalVisible(true);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
          : t('common.error');
      Alert.alert(t('common.error'), Array.isArray(msg) ? msg[0] : String(msg ?? t('common.error')));
    } finally {
      setVerifySending(false);
    }
  }, [t]);

  const handleVerifyCode = useCallback(async () => {
    const code = verifyCode.trim();
    if (!code || code.length !== 6) {
      Alert.alert(t('common.error'), t('profile.verifyEmailEnterCode'));
      return;
    }
    setVerifySubmitting(true);
    try {
      await api.post('/auth/verify-email', { token: code });
      setVerifyModalVisible(false);
      setVerifyCode('');
      await refreshProfile();
      Alert.alert(t('common.ok'), t('profile.verifyEmailSuccess'));
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
          : t('common.error');
      Alert.alert(t('common.error'), Array.isArray(msg) ? msg[0] : String(msg ?? t('common.error')));
    } finally {
      setVerifySubmitting(false);
    }
  }, [verifyCode, refreshProfile, t]);

  const onboardingBasicsDone =
    user &&
    !user.mustChangePassword &&
    hasGender(user) &&
    !!user.email?.trim() &&
    user.isEmailVerified;

  const showPhoneOptionalCard =
    onboardingBasicsDone && !user?.phone?.trim();

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: spacing.xl + tabBarBottom }]}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.heroOuter, { shadowColor: colors.text }]}>
        <LinearGradient
          colors={[colors.accentLight, colors.surface]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroGradient}
        >
          <TouchableOpacity
            onPress={() => navigation.navigate('EditProfile')}
            style={[styles.avatarWrap, { backgroundColor: colors.accent }]}
            activeOpacity={0.85}
          >
            {user?.avatar && getImageUrl(user.avatar) ? (
              <Image source={{ uri: getImageUrl(user.avatar)! }} style={styles.avatarImage} />
            ) : (
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {user?.firstName?.[0]}
                {user?.lastName?.[0]}
              </Text>
            )}
            <View
              style={[
                styles.avatarEditBadge,
                { backgroundColor: colors.primary, borderColor: colors.surface },
              ]}
            >
              <Ionicons name="camera-outline" size={14} color={colors.primaryText} />
            </View>
          </TouchableOpacity>
          <Text style={[styles.heroName, { color: colors.text }]}>
            {user?.firstName} {user?.lastName}
          </Text>
          <View style={styles.emailRow}>
            <Text style={[styles.heroEmail, { color: colors.textSecondary }]} numberOfLines={1}>
              {user?.email ?? '—'}
            </Text>
            {user?.isEmailVerified ? (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={[styles.verifiedText, { color: colors.success }]}>
                  {t('profile.verifyEmailVerified')}
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleSendVerificationCode}
                disabled={verifySending}
                style={styles.verifyBtn}
              >
                <Text style={[styles.verifyBtnText, { color: colors.primary }]}>
                  {verifySending ? '...' : t('profile.verifyEmailSendCode')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {user?.phone ? (
            <View style={styles.phoneRow}>
              <Ionicons name="call-outline" size={16} color={colors.textMuted} />
              <Text style={[styles.heroPhone, { color: colors.textSecondary }]}>{user.phone}</Text>
            </View>
          ) : null}
        </LinearGradient>
      </View>

      {showPhoneOptionalCard ? (
        <Card style={[styles.phoneNudge, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <View style={styles.phoneNudgeRow}>
            <Ionicons name="phone-portrait-outline" size={22} color={colors.primary} />
            <Text style={[styles.phoneNudgeText, { color: colors.text }]}>{t('profile.phoneOptionalHint')}</Text>
          </View>
          <Button
            title={t('profile.phoneOptionalCta')}
            onPress={() => navigation.navigate('EditProfile')}
            variant="outline"
            style={styles.phoneNudgeBtn}
          />
        </Card>
      ) : null}

      {canSwitchToStylist && (
        <Card style={styles.menuCard}>
          <MenuItem
            icon="person-outline"
            label="Prebaci na Stylist app"
            onPress={() => {
              setMode('stylist');
              router.replace('/');
            }}
            rightText="Inbox, profil"
          />
        </Card>
      )}

      <Card style={styles.menuCard}>
        <MenuItem
          icon="create-outline"
          label={t('profile.editProfile')}
          rightText={t('profile.editProfileSubtitle')}
          onPress={() => navigation.navigate('EditProfile')}
        />
        <View style={[styles.separator, { backgroundColor: colors.borderLight }]} />
        <MenuItem
          icon="lock-closed-outline"
          label={t('profile.changePasswordLabel')}
          onPress={() => navigation.navigate('ChangePassword')}
        />
        <View style={[styles.separator, { backgroundColor: colors.borderLight }]} />
        <MenuItem
          icon="notifications-outline"
          label={t('profile.notifications')}
          onPress={() => navigation.navigate('Notifications')}
        />
        <View style={[styles.separator, { backgroundColor: colors.borderLight }]} />
        <MenuItem
          icon="moon-outline"
          label={t('profile.theme')}
          rightText={themeLabel}
          onPress={toggle}
        />
        <View style={[styles.separator, { backgroundColor: colors.borderLight }]} />
        <MenuItem
          icon="information-circle-outline"
          label={t('profile.about')}
          rightText={t('profile.version') + ' 1.0.0'}
          onPress={() => {}}
        />
      </Card>

      <Card style={styles.menuCard}>
        <MenuItem icon="log-out-outline" label={t('auth.logout')} onPress={handleLogout} danger />
      </Card>

      <Modal visible={verifyModalVisible} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContent}>
            <Card style={[styles.modalCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('profile.verifyEmail')}</Text>
              <Input
                label={t('profile.verifyEmailEnterCode')}
                value={verifyCode}
                onChangeText={setVerifyCode}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="000000"
              />
              <View style={styles.modalActions}>
                <Button
                  title={t('common.cancel')}
                  onPress={() => {
                    setVerifyModalVisible(false);
                    setVerifyCode('');
                  }}
                  variant="outline"
                  style={styles.modalBtn}
                />
                <Button
                  title={t('profile.verifyEmailVerify')}
                  onPress={handleVerifyCode}
                  loading={verifySubmitting}
                  style={styles.modalBtn}
                />
              </View>
            </Card>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  heroOuter: {
    marginBottom: spacing.md,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  heroGradient: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  avatarWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    overflow: 'visible',
  },
  avatarImage: { width: 88, height: 88, borderRadius: 44 },
  avatarText: { fontSize: 32, fontWeight: '700', fontFamily: fontFamily.heading },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  heroName: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.xs,
    fontFamily: fontFamily.heading,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    maxWidth: '100%',
  },
  heroEmail: { fontSize: 14, flexShrink: 1 },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
  },
  heroPhone: { fontSize: 14 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedText: { fontSize: 12, fontWeight: '600' },
  verifyBtn: { paddingVertical: 2 },
  verifyBtnText: { fontSize: 12, fontWeight: '600' },
  phoneNudge: {
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderRadius: 16,
  },
  phoneNudgeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.md },
  phoneNudgeText: { flex: 1, fontSize: 14, lineHeight: 20 },
  phoneNudgeBtn: { alignSelf: 'stretch' },
  modalOverlay: { flex: 1, justifyContent: 'center', padding: spacing.md },
  modalContent: { maxHeight: '80%' },
  modalCard: { padding: spacing.lg },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.md },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: spacing.md },
  modalBtn: { flex: 1 },
  menuCard: { marginBottom: spacing.md, paddingVertical: spacing.xs },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  menuLabel: { flex: 1, fontSize: 16, fontWeight: '500' },
  menuRight: { fontSize: 12, marginRight: spacing.sm, maxWidth: '42%' },
  separator: { height: 1, marginLeft: 52 },
});
