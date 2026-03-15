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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/authStore';
import { useAppModeStore } from '../../store/appModeStore';
import { isStylist } from '../../utils/roles';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import api, { getImageUrl } from '../../services/api';
import { spacing } from '../../theme';
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
    <TouchableOpacity onPress={onPress} style={styles.menuItem}>
      <View style={[styles.menuIconContainer, { backgroundColor: danger ? colors.errorLight : colors.accent }]}>
        <Ionicons name={icon} size={20} color={danger ? colors.error : colors.primary} />
      </View>
      <Text style={[styles.menuLabel, { color: danger ? colors.error : colors.text }]}>
        {label}
      </Text>
      {rightText && (
        <Text style={[styles.menuRight, { color: colors.textSecondary }]}>{rightText}</Text>
      )}
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

export function ProfileScreen({ navigation }: ProfileScreenProps<'Profile'>) {
  const { t } = useTranslation();
  const { colors, mode, toggle } = useTheme();
  const { user, logout, refreshProfile } = useAuthStore();
  const setMode = useAppModeStore((s) => s.setMode);
  const canSwitchToStylist = user && isStylist(user);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifySending, setVerifySending] = useState(false);
  const [verifySubmitting, setVerifySubmitting] = useState(false);

  const themeLabel = mode === 'light'
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

  const pickAndUploadAvatar = useCallback(async () => {
    if (!user?.id) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.error'), 'Dozvola za pristup galeriji je potrebna.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    setAvatarLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: result.assets[0].uri,
        name: 'avatar.jpg',
        type: 'image/jpeg',
      } as any);
      formData.append('entity', 'avatars');
      const { data: uploadRes } = await api.post<{ pathThumb?: string; pathSmall?: string; pathOriginal: string }>(
        '/api/uploads',
        formData,
      );
      const avatarPath = uploadRes.pathThumb || uploadRes.pathSmall || uploadRes.pathOriginal;
      await api.patch(`/api/users/${user.id}`, { avatar: avatarPath });
      await refreshProfile();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
          : t('common.error');
      Alert.alert(t('common.error'), Array.isArray(msg) ? msg[0] : String(msg ?? t('common.error')));
    } finally {
      setAvatarLoading(false);
    }
  }, [user?.id, refreshProfile, t]);

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

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      {/* User Info */}
      <Card style={styles.userCard}>
        <TouchableOpacity
          onPress={pickAndUploadAvatar}
          disabled={avatarLoading}
          style={[styles.avatarWrap, { backgroundColor: colors.accent }]}
        >
          {user?.avatar && getImageUrl(user.avatar) ? (
            <Image
              source={{ uri: getImageUrl(user.avatar)! }}
              style={styles.avatarImage}
            />
          ) : (
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </Text>
          )}
          {avatarLoading && (
            <View style={styles.avatarOverlay}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}
        </TouchableOpacity>
        <Text style={[styles.avatarHint, { color: colors.textMuted }]}>
          {t('profile.avatarChange')}
        </Text>
        <Text style={[styles.userName, { color: colors.text }]}>
          {user?.firstName} {user?.lastName}
        </Text>
        <View style={styles.emailRow}>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
            {user?.email}
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
        {user?.phone && (
          <Text style={[styles.userPhone, { color: colors.textSecondary }]}>
            {user.phone}
          </Text>
        )}
      </Card>

      {/* Verify email modal */}
      <Modal visible={verifyModalVisible} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContent}
          >
            <Card style={[styles.modalCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t('profile.verifyEmail')}
              </Text>
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
                  onPress={() => { setVerifyModalVisible(false); setVerifyCode(''); }}
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

      {/* Switch to Stylist app (ako ima STYLIST rolu) */}
      {canSwitchToStylist && (
        <Card style={styles.menuCard}>
          <MenuItem
            icon="person-outline"
            label="Prebaci na Stylist app"
            onPress={() => setMode('stylist')}
            rightText="Inbox, profil"
          />
        </Card>
      )}

      {/* Menu */}
      <Card style={styles.menuCard}>
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
        <MenuItem
          icon="log-out-outline"
          label={t('auth.logout')}
          onPress={handleLogout}
          danger
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  userCard: { alignItems: 'center', marginBottom: spacing.md },
  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    overflow: 'hidden',
  },
  avatarImage: { width: 72, height: 72, borderRadius: 36 },
  avatarText: { fontSize: 28, fontWeight: '700' },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarHint: { fontSize: 11, marginBottom: spacing.sm },
  userName: { fontSize: 20, fontWeight: '700' },
  emailRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  userEmail: { fontSize: 14 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedText: { fontSize: 12, fontWeight: '600' },
  verifyBtn: { paddingVertical: 2 },
  verifyBtnText: { fontSize: 12, fontWeight: '600' },
  userPhone: { fontSize: 14, marginTop: 2 },
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
  menuRight: { fontSize: 13, marginRight: spacing.sm },
  separator: { height: 1, marginLeft: 52 },
});
