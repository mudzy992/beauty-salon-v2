import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useFloatingTabBarTotalHeight } from '../../navigation/FloatingTabBar';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/authStore';
import { Card } from '../../components/ui/Card';
import { MediaImage } from '../../components/MediaImage';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import api, { getImageUrl } from '../../services/api';
import { spacing } from '../../theme';
import { fontFamily } from '../../theme/fonts';
import type { ProfileScreenProps } from '../../navigation/types';

export function EditProfileScreen(_props: ProfileScreenProps<'EditProfile'>) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const tabBarBottom = useFloatingTabBarTotalHeight();
  const { user, refreshProfile } = useAuthStore();
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifySending, setVerifySending] = useState(false);
  const [verifySubmitting, setVerifySubmitting] = useState(false);
  const [emailInput, setEmailInput] = useState(user?.email ?? '');
  const [phoneInput, setPhoneInput] = useState(user?.phone ?? '');
  const [genderInput, setGenderInput] = useState<'MALE' | 'FEMALE' | ''>(
    user?.gender === 'MALE' || user?.gender === 'FEMALE' ? user.gender : '',
  );
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    setEmailInput(user?.email ?? '');
    setPhoneInput(user?.phone ?? '');
    setGenderInput(
      user?.gender === 'MALE' || user?.gender === 'FEMALE' ? user.gender : '',
    );
  }, [user?.email, user?.phone, user?.gender]);

  const pickAndUploadAvatar = useCallback(async () => {
    if (!user?.id) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.error'), t('profile.galleryPermission'));
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
      formData.append(
        'file',
        { uri: result.assets[0].uri, name: 'avatar.jpg', type: 'image/jpeg' } as unknown as Blob,
      );
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

  const handleSaveProfile = useCallback(async () => {
    if (!genderInput) {
      Alert.alert(t('common.error'), t('profile.genderRequiredReservations'));
      return;
    }
    setProfileSaving(true);
    try {
      await api.put('/api/users/profile', {
        email: emailInput,
        phone: phoneInput,
        gender: genderInput,
      });
      await refreshProfile();
      Alert.alert(t('common.ok'), t('profile.contactUpdated'));
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
          : t('common.error');
      Alert.alert(t('common.error'), Array.isArray(msg) ? msg[0] : String(msg ?? t('common.error')));
    } finally {
      setProfileSaving(false);
    }
  }, [emailInput, phoneInput, genderInput, refreshProfile, t]);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: spacing.xl + tabBarBottom }]}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Card style={[styles.avatarCard, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          onPress={pickAndUploadAvatar}
          disabled={avatarLoading}
          style={[styles.avatarWrap, { backgroundColor: colors.accent }]}
        >
          <MediaImage uri={getImageUrl(user?.avatar)} style={styles.avatarImage} />
          {avatarLoading && (
            <View style={styles.avatarOverlay}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}
        </TouchableOpacity>
        <Text style={[styles.avatarHint, { color: colors.textMuted }]}>{t('profile.avatarChange')}</Text>
        <Text style={[styles.nameLine, { color: colors.text }]}>
          {user?.firstName} {user?.lastName}
        </Text>
      </Card>

      <Card style={styles.formCard}>
        <Input
          label={t('auth.email')}
          leftIcon="mail-outline"
          value={emailInput}
          onChangeText={setEmailInput}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <View style={styles.verifyRow}>
          {user?.isEmailVerified ? (
            <View style={styles.verifiedInline}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={[styles.verifiedInlineText, { color: colors.success }]}>
                {t('profile.verifyEmailVerified')}
              </Text>
            </View>
          ) : (
            <Button
              title={verifySending ? '...' : t('profile.verifyEmailSendCode')}
              onPress={handleSendVerificationCode}
              disabled={verifySending}
              variant="outline"
              style={styles.verifyBtn}
            />
          )}
        </View>

        <Input
          label={t('auth.phone')}
          leftIcon="call-outline"
          value={phoneInput}
          onChangeText={setPhoneInput}
          keyboardType="phone-pad"
          placeholder={t('onboarding.phonePlaceholder')}
        />

        <Text style={[styles.genderLabel, { color: colors.textSecondary }]}>{t('onboarding.genderLabel')}</Text>
        <View style={styles.genderRow}>
          <Pressable
            onPress={() => setGenderInput('FEMALE')}
            style={[
              styles.genderOption,
              {
                borderColor: genderInput === 'FEMALE' ? colors.primary : colors.border,
                backgroundColor: genderInput === 'FEMALE' ? colors.accent : colors.inputBg,
              },
            ]}
          >
            <Text style={{ color: colors.text, fontFamily: fontFamily.bodySemiBold }}>{t('onboarding.genderFemale')}</Text>
          </Pressable>
          <Pressable
            onPress={() => setGenderInput('MALE')}
            style={[
              styles.genderOption,
              {
                borderColor: genderInput === 'MALE' ? colors.primary : colors.border,
                backgroundColor: genderInput === 'MALE' ? colors.accent : colors.inputBg,
              },
            ]}
          >
            <Text style={{ color: colors.text, fontFamily: fontFamily.bodySemiBold }}>{t('onboarding.genderMale')}</Text>
          </Pressable>
        </View>

        <Button title={t('profile.saveContact')} onPress={handleSaveProfile} loading={profileSaving} style={styles.saveBtn} />
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
  content: { padding: spacing.md },
  avatarCard: { alignItems: 'center', marginBottom: spacing.md, paddingVertical: spacing.lg },
  avatarWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
    overflow: 'hidden',
  },
  avatarImage: { width: 96, height: 96, borderRadius: 48 },
  avatarText: { fontSize: 32, fontWeight: '700' },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarHint: { fontSize: 12, marginBottom: spacing.sm },
  nameLine: { fontSize: 17, fontFamily: fontFamily.heading },
  formCard: { padding: spacing.lg, marginBottom: spacing.md },
  verifyRow: { marginTop: -spacing.sm, marginBottom: spacing.md },
  verifiedInline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  verifiedInlineText: { fontSize: 13, fontWeight: '600' },
  verifyBtn: { alignSelf: 'flex-start' },
  genderLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  genderRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  genderOption: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtn: { marginTop: spacing.sm },
  modalOverlay: { flex: 1, justifyContent: 'center', padding: spacing.md },
  modalContent: { maxHeight: '80%' },
  modalCard: { padding: spacing.lg },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.md },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: spacing.md },
  modalBtn: { flex: 1 },
});
