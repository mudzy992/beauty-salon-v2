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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MediaImage } from '../../components/MediaImage';
import { useFloatingTabBarTotalHeight } from '../../navigation/FloatingTabBar';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/authStore';
import { useAppModeStore } from '../../store/appModeStore';
import { isClient as userIsClient, isStylist } from '../../utils/roles';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import api, { getImageUrl } from '../../services/api';
import { spacing } from '../../theme';
import { fontFamily } from '../../theme/fonts';
import { formatDate } from '../../utils/date';
import { getApiErrorMessage } from '../../utils/apiError';
import {
  formatProfileAmount,
  formatProfileDate,
  normalizeConsentPayload,
  normalizeProfileDebts,
  type ConsentItem,
  type ConsentPayload,
  type ProfileDebt,
} from './profile-data';
import type { ProfileScreenProps } from '../../navigation/types';
import { useApkUpdateCheck } from '../../features/app-update/use-apk-update-check';
import { ApkForceUpdateModal } from '../../features/app-update/apk-force-update-modal';

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
  const apkUpdate = useApkUpdateCheck({ auto: false });
  const { colors, mode, toggle } = useTheme();
  const tabBarBottom = useFloatingTabBarTotalHeight();
  const { user, logout, refreshProfile } = useAuthStore();
  const setMode = useAppModeStore((s) => s.setMode);
  const canSwitchToStylist = user && isStylist(user);
  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifySending, setVerifySending] = useState(false);
  const [verifySubmitting, setVerifySubmitting] = useState(false);
  const [openDebts, setOpenDebts] = useState<ProfileDebt[]>([]);
  const [openDebtsError, setOpenDebtsError] = useState(false);
  const [openDebtsRetryCount, setOpenDebtsRetryCount] = useState(0);
  const [mediaConsent, setMediaConsent] = useState<ConsentPayload | null>(null);
  const [mediaConsentLoading, setMediaConsentLoading] = useState(false);
  const [mediaConsentSavingId, setMediaConsentSavingId] = useState<string | null>(null);
  const [mediaConsentAccepted, setMediaConsentAccepted] = useState<Record<string, boolean>>({});
  const [mediaConsentMessage, setMediaConsentMessage] = useState('');
  const isClient = userIsClient(user);

  const loadMediaConsent = useCallback(async () => {
    if (!isClient) {
      setMediaConsent(null);
      setMediaConsentAccepted({});
      setMediaConsentMessage('');
      setMediaConsentLoading(false);
      return false;
    }
    setMediaConsentLoading(true);
    try {
      const { data } = await api.get<unknown>('/api/media/consents/me');
      const payload = normalizeConsentPayload(data);
      if (!payload) throw new Error('INVALID_MEDIA_CONSENT_RESPONSE');
      setMediaConsent(payload);
      setMediaConsentAccepted({});
      setMediaConsentMessage('');
      return true;
    } catch {
      setMediaConsent(null);
      setMediaConsentMessage(t('profile.mediaConsent.loadError'));
      return false;
    } finally {
      setMediaConsentLoading(false);
    }
  }, [isClient, t]);

  useEffect(() => {
    void loadMediaConsent();
  }, [loadMediaConsent]);

  useEffect(() => {
    if (!isClient) {
      setOpenDebts([]);
      setOpenDebtsError(false);
      return;
    }
    let mounted = true;
    setOpenDebtsError(false);
    api
      .get<unknown>('/api/client-debts/me')
      .then((r) => {
        const debts = normalizeProfileDebts(r.data);
        if (!debts) throw new Error('INVALID_CLIENT_DEBTS_RESPONSE');
        if (mounted) setOpenDebts(debts);
      })
      .catch(() => {
        if (mounted) {
          setOpenDebts([]);
          setOpenDebtsError(true);
        }
      });
    return () => {
      mounted = false;
    };
  }, [isClient, openDebtsRetryCount]);

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
      Alert.alert(t('common.error'), getApiErrorMessage(err, t('common.error')));
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
      Alert.alert(t('common.error'), getApiErrorMessage(err, t('common.error')));
    } finally {
      setVerifySubmitting(false);
    }
  }, [verifyCode, refreshProfile, t]);

  const grantMediaConsent = useCallback(async (item: ConsentItem) => {
    if (!mediaConsent || !mediaConsentAccepted[item.imageId]) return;
    setMediaConsentSavingId(item.imageId);
    setMediaConsentMessage('');
    try {
      await api.post(`/api/media/consents/${encodeURIComponent(item.imageId)}/grant`, {
        policyVersion: mediaConsent.policyVersion,
      });
      const refreshed = await loadMediaConsent();
      setMediaConsentMessage(
        t(refreshed ? 'profile.mediaConsent.saveSuccess' : 'profile.mediaConsent.saveRefreshError'),
      );
    } catch (error: unknown) {
      setMediaConsentMessage(getApiErrorMessage(error, t('profile.mediaConsent.saveError')));
    } finally {
      setMediaConsentSavingId(null);
    }
  }, [loadMediaConsent, mediaConsent, mediaConsentAccepted, t]);

  const revokeMediaConsent = useCallback((item: ConsentItem) => {
    Alert.alert(
      t('profile.mediaConsent.revokeTitle'),
      t('profile.mediaConsent.revokeDescription'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.mediaConsent.revokeAction'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setMediaConsentSavingId(item.imageId);
              setMediaConsentMessage('');
              try {
                await api.delete(`/api/media/consents/${encodeURIComponent(item.imageId)}`);
                const refreshed = await loadMediaConsent();
                setMediaConsentMessage(
                  t(refreshed ? 'profile.mediaConsent.revokeSuccess' : 'profile.mediaConsent.revokeRefreshError'),
                );
              } catch {
                setMediaConsentMessage(t('profile.mediaConsent.revokeError'));
              } finally {
                setMediaConsentSavingId(null);
              }
            })();
          },
        },
      ],
    );
  }, [loadMediaConsent, t]);

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
            <MediaImage uri={getImageUrl(user?.avatar)} style={styles.avatarImage} />
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
              {user?.email ?? t('profile.noEmail')}
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
                  {verifySending ? t('profile.sending') : t('profile.verifyEmailSendCode')}
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

      {isClient ? (
        <Card style={[styles.menuCard, { borderColor: colors.border, padding: spacing.md }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
            <Ionicons name="shield-checkmark-outline" size={22} color={colors.primary} />
            <Text style={[styles.menuLabel, { color: colors.text, fontWeight: '700' }]}>{t('profile.mediaConsent.title')}</Text>
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginBottom: spacing.md }}>
            {t('profile.mediaConsent.intro')}
          </Text>
          {mediaConsentLoading ? (
            <Text style={{ color: colors.textSecondary, marginBottom: spacing.sm }}>{t('common.loading')}</Text>
          ) : null}
          {!mediaConsentLoading && mediaConsent?.pending.length ? (
            <View style={{ gap: spacing.md }}>
              <View style={{ backgroundColor: colors.accentLight, borderRadius: 12, padding: spacing.md }}>
                <Text style={{ color: colors.text, fontSize: 13, lineHeight: 20 }}>{mediaConsent.consentText}</Text>
              </View>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{t('profile.mediaConsent.pendingTitle')}</Text>
              {mediaConsent.pending.map((item) => {
                const label = item.isBefore ? t('profile.mediaConsent.beforeTreatment') : t('profile.mediaConsent.afterTreatment');
                const checked = Boolean(mediaConsentAccepted[item.imageId]);
                return (
                  <View key={item.imageId} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: spacing.sm }}>
                    <MediaImage
                      uri={getImageUrl(item.previewUrl)}
                      style={{ width: '100%', height: 190, borderRadius: 8, backgroundColor: colors.accent }}
                    />
                    <Text style={{ color: colors.text, fontWeight: '700', marginTop: spacing.sm }}>{label}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                      {item.serviceName || t('profile.serviceFallback')} · {formatProfileDate(item.serviceDate, formatDate) || t('common.notAvailable')}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setMediaConsentAccepted((current) => ({ ...current, [item.imageId]: !checked }))}
                      style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: spacing.md }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={20} color={colors.primary} />
                      <Text style={{ color: colors.text, flex: 1, fontSize: 13, lineHeight: 19 }}>
                        {t('profile.mediaConsent.checkbox')}
                      </Text>
                    </TouchableOpacity>
                    <Button
                      title={mediaConsentSavingId === item.imageId ? t('profile.sending') : t('profile.mediaConsent.grantAction')}
                      onPress={() => void grantMediaConsent(item)}
                      disabled={!checked || mediaConsentSavingId === item.imageId}
                      size="sm"
                    />
                  </View>
                );
              })}
            </View>
          ) : null}
          {!mediaConsentLoading && mediaConsent?.active.length ? (
            <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{t('profile.mediaConsent.activeHeading')}</Text>
              {mediaConsent.active.map((item) => (
                <View key={item.imageId} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: spacing.sm }}>
                  <MediaImage
                    uri={getImageUrl(item.previewUrl)}
                    style={{ width: 64, height: 64, borderRadius: 8, backgroundColor: colors.accent }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: '600' }} numberOfLines={2}>
                      {item.isBefore ? t('profile.mediaConsent.beforeTreatment') : t('profile.mediaConsent.afterTreatment')} · {item.serviceName || t('profile.serviceFallback')}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                      {formatProfileDate(item.serviceDate, formatDate) || t('common.notAvailable')}
                    </Text>
                    <Text style={{ color: item.isPublished ? colors.success : colors.textSecondary, fontSize: 11, marginTop: 2 }}>
                      {item.isPublished
                        ? t('profile.mediaConsent.publishedCategories', { categories: item.publishedCategories.map((category) => category.name).join(', ') })
                        : t('profile.mediaConsent.notPublished')}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => revokeMediaConsent(item)}
                    disabled={mediaConsentSavingId === item.imageId}
                    style={{ padding: spacing.xs }}
                    accessibilityRole="button"
                    accessibilityLabel={t('profile.mediaConsent.revokeAction')}
                  >
                    <Ionicons name="close-circle-outline" size={24} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : null}
          {!mediaConsentLoading && mediaConsent && mediaConsent.pending.length === 0 && mediaConsent.active.length === 0 ? (
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{t('profile.mediaConsent.empty')}</Text>
          ) : null}
          {mediaConsentMessage ? (
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: spacing.sm }}>{mediaConsentMessage}</Text>
          ) : null}
          <Text style={{ color: colors.textMuted, fontSize: 11, lineHeight: 16, marginTop: spacing.md }}>
            {t('profile.mediaConsent.privacyNote')}
          </Text>
        </Card>
      ) : null}

      {isClient && openDebtsError ? (
        <Card style={[styles.menuCard, { borderColor: colors.border }]}>
          <Text style={[styles.menuLabel, { color: colors.text, marginBottom: spacing.sm }]}>
            {t('profile.debtLoadError')}
          </Text>
          <Button
            title={t('common.retry')}
            onPress={() => setOpenDebtsRetryCount((count) => count + 1)}
            variant="outline"
            size="sm"
          />
        </Card>
      ) : null}

      {openDebts.length > 0 ? (
        <Card style={[styles.menuCard, { borderColor: colors.border }]}>
          <Text style={[styles.menuLabel, { color: colors.text, paddingHorizontal: 16, paddingTop: 14, fontWeight: '700' }]}>
            {t('profile.openDebtsTitle')}
          </Text>
          {openDebts.map((d, idx) => (
            <View key={d.id}>
              {idx > 0 ? <View style={[styles.separator, { backgroundColor: colors.borderLight }]} /> : null}
              <View style={styles.menuItem}>
                <View style={[styles.menuIconContainer, { backgroundColor: colors.accent }]}>
                  <Ionicons name="wallet-outline" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.menuLabel, { color: colors.text }]}>
                    {t('profile.debtAmount', { service: d.service?.name || t('profile.serviceFallback'), amount: formatProfileAmount(d.amount) ?? t('profile.unavailableValue') })}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    {formatProfileDate(d.createdAt, formatDate) || t('common.notAvailable')}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </Card>
      ) : null}

      {canSwitchToStylist && (
        <Card style={styles.menuCard}>
          <MenuItem
            icon="person-outline"
            label={t('profile.switchToStylistTitle')}
            onPress={() => {
              setMode('stylist');
              router.replace('/');
            }}
            rightText={t('profile.switchToStylistSubtitle')}
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
          icon="call-outline"
          label={t('profile.contact.title')}
          onPress={() => navigation.navigate('Contact')}
        />
        <View style={[styles.separator, { backgroundColor: colors.borderLight }]} />
        <MenuItem
          icon="cloud-download-outline"
          label={t('appUpdate.check')}
          onPress={() => {
            void apkUpdate.checkNow({ manual: true });
          }}
        />
      </Card>

      <Card style={styles.menuCard}>
        <MenuItem icon="log-out-outline" label={t('auth.logout')} onPress={handleLogout} danger />
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
                placeholder={t('profile.verifyCodePlaceholder')}
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
