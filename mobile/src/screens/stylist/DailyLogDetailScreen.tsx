import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useFloatingTabBarTotalHeight } from '../../navigation/FloatingTabBar';
import { MediaImage } from '../../components/MediaImage';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import api, { getUploadUrl } from '../../services/api';
import { spacing } from '../../theme';
import { formatDate } from '../../utils/date';
import { useReservationSocketRefresh } from '../../hooks/useReservationSocketRefresh';
import { useDailyLogSocketRefresh } from '../../hooks/useDailyLogSocketRefresh';
import type { DailyLogEntry } from '../../types';
import { getCollectedTotal, getSettledDebtsSum } from './daily-log-display';
import { DailyLogDispositionPanel } from './DailyLogDispositionPanel';
import { DailyLogEntryActionsModal } from './daily-log-entry-actions-modal';
import { getReservationStatusLabel } from './reservation-detail/utils/reservation-detail';
import { useTranslation } from 'react-i18next';

type DailyLogDetailScreenProps = {
  route: { params: { entryId: string } };
  navigation: {
    goBack: () => void;
    navigate: (name: string, params?: any) => void;
    setOptions: (opts: { headerRight?: () => React.ReactNode }) => void;
  };
};

export function DailyLogDetailScreen({ route, navigation }: DailyLogDetailScreenProps) {
  const { entryId } = route.params;
  const { colors } = useTheme();
  const tabBarBottom = useFloatingTabBarTotalHeight();
  const [entry, setEntry] = useState<DailyLogEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { t } = useTranslation();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');

  const fetchEntry = useCallback(async () => {
    try {
      const { data } = await api.get<DailyLogEntry>(`/api/daily-log/${entryId}`);
      setEntry(data);
    } catch {
      setEntry(null);
    }
    setLoading(false);
  }, [entryId]);

  useEffect(() => {
    fetchEntry();
  }, [fetchEntry]);

  useReservationSocketRefresh(fetchEntry);
  useDailyLogSocketRefresh(fetchEntry);

  const handleComplete = useCallback(() => {
    Alert.alert(
      t('stylist.dailyLogDetail.completeConfirmTitle'),
      entry?.reservationId
        ? t('stylist.dailyLogDetail.completeConfirmWithReservation')
        : t('stylist.dailyLogDetail.completeConfirmStandalone'),
      [
        { text: t('stylist.dailyLogDetail.completeConfirmCancel'), style: 'cancel' },
        {
          text: t('stylist.dailyLogDetail.completeConfirmAction'),
          onPress: async () => {
            setActing(true);
            try {
              const reservationId = entry?.reservationId ?? null;
              await api.post(`/api/daily-log/${entryId}/complete`);
              await fetchEntry();

              if (reservationId) {
                try {
                  const { data } = await api.post<{
                    delayMinutes: number;
                    overrunMinutes?: number;
                    items: unknown[];
                  }>(`/api/reservations/${reservationId}/reschedule/propose`, {
                    includeBreaks: false,
                    mode: 'actual_overrun',
                  });
                  const delay = data?.delayMinutes ?? 0;
                  const itemCount = data?.items?.length ?? 0;
                  const overrunLabel = data?.overrunMinutes ?? delay;
                  if (delay > 0 && itemCount > 0) {
                    Alert.alert(
                      t('stylist.dailyLogDetail.overrunTitle'),
                      t('stylist.dailyLogDetail.overrunReschedulePrompt'),
                      [
                        { text: t('stylist.dailyLogDetail.overrunNotNow'), style: 'cancel' },
                        {
                          text: t('stylist.dailyLogDetail.overrunWithoutBreaks'),
                          onPress: () =>
                            navigation.navigate('ReschedulePreview', {
                              reservationId,
                              includeBreaks: false,
                              mode: 'actual_overrun',
                              lockMode: true,
                            }),
                        },
                        {
                          text: t('stylist.dailyLogDetail.overrunWithBreaks'),
                          onPress: () =>
                            navigation.navigate('ReschedulePreview', {
                              reservationId,
                              includeBreaks: true,
                              mode: 'actual_overrun',
                              lockMode: true,
                            }),
                        },
                      ],
                    );
                  } else if (delay > 0 && itemCount === 0) {
                    Alert.alert(
                      t('stylist.dailyLogDetail.overrunTitle'),
                      t('stylist.dailyLogDetail.overrunNoFutureAppointments', { minutes: overrunLabel }),
                      [{ text: t('stylist.dailyLogDetail.overrunOk') }],
                    );
                  }
                } catch {
                  // ignore - preview je opcionalan korak
                }
              }
            } catch (err: unknown) {
              const msg =
                err && typeof err === 'object' && 'response' in err
                  ? (err as any).response?.data?.message
                  : t('stylist.dailyLogDetail.completeErrorFallback');
              Alert.alert(t('common.error'), Array.isArray(msg) ? msg[0] : msg);
            } finally {
              setActing(false);
            }
          },
        },
      ],
    );
  }, [entryId, fetchEntry, entry?.reservationId, navigation, t]);

  const handleDelete = useCallback(() => {
    setDeleteReason('');
    setDeleteModalOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    const reason = deleteReason.trim();
    if (!reason) {
      Alert.alert(t('common.error'), t('stylist.dailyLogDetail.deleteReasonRequired'));
      return;
    }
    setActing(true);
    try {
      await api.delete(`/api/daily-log/${entryId}`, { data: { reason } });
      setDeleteModalOpen(false);
      navigation.goBack();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string | string[] } } }).response?.data
              ?.message
          : t('stylist.dailyLogDetail.deleteErrorFallback');
      Alert.alert(t('common.error'), Array.isArray(msg) ? msg[0] : String(msg));
    } finally {
      setActing(false);
    }
  }, [deleteReason, entryId, navigation, t]);

  const addImage = useCallback(
    async (isBefore: boolean) => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('stylist.dailyLogDetail.imagePermissionTitle'),
          t('stylist.dailyLogDetail.imagePermissionMessage'),
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      const uri = result.assets[0].uri;
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', {
          uri,
          name: 'daily-log.jpg',
          type: 'image/jpeg',
        } as any);
        formData.append('entity', 'daily-log');
        const { data: uploadResult } = await api.post<{ id: string }>('/api/uploads', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        await api.post(`/api/daily-log/${entryId}/images`, {
          uploadId: uploadResult.id,
          isBefore,
          isAfter: !isBefore,
        });
        await fetchEntry();
      } catch (err: unknown) {
        const msg =
          err && typeof err === 'object' && 'response' in err
            ? (err as any).response?.data?.message
            : t('stylist.dailyLogDetail.imageUploadErrorFallback');
        Alert.alert(t('common.error'), Array.isArray(msg) ? msg[0] : msg);
      } finally {
        setUploading(false);
      }
    },
    [entryId, fetchEntry, t],
  );

  const openActionsMenu = useCallback(() => {
    if (!entry || entry.status === 'COMPLETED') return;
    setActionsMenuOpen(true);
  }, [entry]);

  useLayoutEffect(() => {
    const canAct = !!entry && entry.status !== 'COMPLETED';
    navigation.setOptions({
      headerRight: canAct
        ? () => (
            <TouchableOpacity
              onPress={openActionsMenu}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Akcije zapisa"
              style={{ marginRight: spacing.sm }}
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={24}
                color={colors.headerText}
              />
            </TouchableOpacity>
          )
        : undefined,
    });
  }, [colors.headerText, entry, navigation, openActionsMenu]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!entry) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>{t('stylist.dailyLogDetail.notFound')}</Text>
        <Button title={t('common.back')} onPress={() => navigation.goBack()} variant="outline" style={{ marginTop: spacing.md }} />
      </View>
    );
  }

  const canComplete = entry.status !== 'COMPLETED';
  const beforeImages = entry.images?.filter((i) => i.isBefore) ?? [];
  const afterImages = entry.images?.filter((i) => i.isAfter) ?? [];
  const hasBeforeAfter = beforeImages.length > 0 || afterImages.length > 0;
  const reservationStatusLabel = entry.reservation
    ? getReservationStatusLabel(
        { ...entry.reservation, cancelReason: entry.reservation.cancelReason ?? undefined },
        t,
      )
    : null;

  return (
    <>
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: spacing.xl + tabBarBottom }]}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      <Card style={[styles.card, { borderWidth: 1, borderColor: colors.border }]}>
        <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>
              {entry.publicReferenceCode ?? entry.id.slice(0, 8).toUpperCase()}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {formatDate(entry.date)} {entry.isManual ? '· Ručno' : '· Rezervacija'}
            </Text>
          </View>
          <Text style={[styles.statusPill, { color: entry.status === 'COMPLETED' ? colors.success : colors.warning }]}>
            {entry.status === 'COMPLETED' ? 'Završeno' : 'Na čekanju'}
          </Text>
        </View>

        <View style={styles.infoGrid}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 4 }]}>{t('stylist.dailyLogDetail.servicesSectionTitle')}</Text>
            {(entry.items && entry.items.length > 0
              ? entry.items
              : entry.service
                ? [{ serviceId: entry.serviceId, service: entry.service, unitPrice: entry.actualPrice }]
                : []
            ).map((it, idx) => (
              <View
                key={`${it.serviceId ?? idx}`}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingVertical: 4,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }}
              >
                <Text style={{ color: colors.text, flex: 1 }}>
                  {it.service?.name ?? t('stylist.dailyLogDetail.serviceFallback')}
                </Text>
                <Text style={{ color: colors.textSecondary }}>
                  {Number(it.unitPrice ?? 0).toFixed(2)} KM
                </Text>
              </View>
            ))}
          </View>

          {(entry.debtPaymentEntries?.length ?? 0) > 0 ? (
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 4 }]}>
                {t('stylist.dailyLogDetail.debtPaymentSectionTitle')}
              </Text>
              {entry.debtPaymentEntries!.map((dp) => (
                <View
                  key={dp.id}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingVertical: 4,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  }}
                >
                  <Text style={{ color: colors.text, flex: 1 }}>
                    {dp.debt?.service?.name ?? dp.service?.name ?? t('stylist.dailyLogDetail.debtFallback')}
                    {dp.debt?.createdAt
                      ? ` · ${String(dp.debt.createdAt).slice(0, 10)}`
                      : ''}
                  </Text>
                  <Text style={{ color: colors.textSecondary }}>
                    {Number(dp.actualPrice).toFixed(2)} KM
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {entry.reservation ? (
            <View style={styles.infoItem}>
              <Ionicons name="bookmark-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {t('stylist.dailyLogDetail.reservationLabel')}{' '}
                <Text style={{ color: colors.text }}>
                  {reservationStatusLabel}
                </Text>
                {entry.reservation.publicReferenceCode ? ` · ${entry.reservation.publicReferenceCode}` : ''}
              </Text>
            </View>
          ) : null}
          <View style={styles.infoItem}>
            <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.text }]}>
              {entry.client ? `${entry.client.firstName} ${entry.client.lastName}` : '—'}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="cash-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.text }]}>
              {t('stylist.dailyLogDetail.totalChargedAmount', {
                amount: getCollectedTotal(entry).toFixed(2),
              })}
            </Text>
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
            {t('stylist.dailyLogDetail.servicesAmount', {
              amount: Number(entry.actualPrice).toFixed(2),
            })}
            {entry.tipAmount > 0
              ? t('stylist.dailyLogDetail.tipAmount', {
                  amount: Number(entry.tipAmount).toFixed(2),
                })
              : ''}
            {getSettledDebtsSum(entry) > 0
              ? t('stylist.dailyLogDetail.settledDebtsAmount', {
                  amount: getSettledDebtsSum(entry).toFixed(2),
                })
              : ''}
          </Text>
          {entry.notes ? (
            <View style={[styles.infoItem, { alignItems: 'flex-start' }]}>
              <Ionicons name="document-text-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textSecondary, flex: 1 }]}>
                {entry.notes}
              </Text>
            </View>
          ) : null}

          {canComplete ? (
            <Button
              title={
                entry.reservationId
                  ? t('stylist.dailyLogDetail.completeButtonWithReservation')
                  : t('stylist.dailyLogDetail.completeButtonStandalone')
              }
              onPress={handleComplete}
              loading={acting}
              style={{ marginTop: spacing.md }}
            />
          ) : (
            <Text style={[styles.infoText, { color: colors.textSecondary, marginTop: spacing.md }]}>
              {t('stylist.dailyLogDetail.completedEntryNotice')}
            </Text>
          )}
        </View>
      </Card>

      {(canComplete || hasBeforeAfter) && (
        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('stylist.dailyLogDetail.photosSectionTitle')}</Text>
          {beforeImages.length > 0 && (
            <>
              <Text style={[styles.subLabel, { color: colors.textSecondary }]}>{t('stylist.dailyLogDetail.beforePhotosLabel')}</Text>
              <View style={styles.imageRow}>
                {beforeImages.map((img) => {
                  const uri = getUploadUrl(
                    img.upload?.pathMedium ??
                      img.upload?.pathThumb ??
                      img.upload?.pathOriginal,
                  );
                  return (
                    <MediaImage
                      key={img.id}
                      uri={uri}
                      style={styles.thumb}
                    />
                  );
                })}
              </View>
            </>
          )}
          {afterImages.length > 0 && (
            <>
              <Text style={[styles.subLabel, { color: colors.textSecondary }]}>{t('stylist.dailyLogDetail.afterPhotosLabel')}</Text>
              <View style={styles.imageRow}>
                {afterImages.map((img) => {
                  const uri = getUploadUrl(
                    img.upload?.pathMedium ??
                      img.upload?.pathThumb ??
                      img.upload?.pathOriginal,
                  );
                  return (
                    <MediaImage
                      key={img.id}
                      uri={uri}
                      style={styles.thumb}
                    />
                  );
                })}
              </View>
            </>
          )}
          {canComplete && !hasBeforeAfter ? (
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
              {t('stylist.dailyLogDetail.addPhotosHint')}
            </Text>
          ) : null}
        </Card>
      )}

      <DailyLogDispositionPanel
        entry={entry}
        colors={colors}
        onDone={() => navigation.goBack()}
      />
    </ScrollView>

      <Modal visible={deleteModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ width: '100%' }}
          >
            <Card style={{ ...styles.modalCard, backgroundColor: colors.surface }}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('stylist.dailyLogDetail.deleteTitle')}</Text>
              <Text style={{ color: colors.textSecondary, marginBottom: spacing.sm }}>
                {t('stylist.dailyLogDetail.deleteDescription')}
              </Text>
              <Input
                label={t('stylist.dailyLogDetail.deleteReasonLabel')}
                value={deleteReason}
                onChangeText={setDeleteReason}
                multiline
                placeholder={t('stylist.dailyLogDetail.deleteReasonPlaceholder')}
              />
              <View style={styles.modalActions}>
                <Button
                  title={t('stylist.dailyLogDetail.deleteCancel')}
                  variant="outline"
                  onPress={() => setDeleteModalOpen(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  title={t('common.delete')}
                  onPress={confirmDelete}
                  loading={acting}
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          </KeyboardAvoidingView>
        </View>
      </Modal>
      <DailyLogEntryActionsModal
        visible={actionsMenuOpen}
        colors={colors}
        onClose={() => setActionsMenuOpen(false)}
        onEdit={() => {
          setActionsMenuOpen(false);
          navigation.navigate('DailyLogNewEntry', { entryId });
        }}
        onAddBeforePhoto={() => {
          setActionsMenuOpen(false);
          void addImage(true);
        }}
        onAddAfterPhoto={() => {
          setActionsMenuOpen(false);
          void addImage(false);
        }}
        onDelete={() => {
          setActionsMenuOpen(false);
          handleDelete();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  card: { marginBottom: spacing.md },
  headerRow: { flexDirection: 'row', gap: 10, paddingBottom: spacing.sm, marginBottom: spacing.sm, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 4 },
  statusPill: { fontSize: 13, fontWeight: '800', marginTop: 2 },
  infoGrid: { gap: 10 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 14, flexShrink: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  subLabel: { fontSize: 13, marginTop: 6, marginBottom: 4 },
  imageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: { width: 80, height: 80, borderRadius: 8 },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: spacing.md,
  },
  modalCard: { padding: spacing.md, borderRadius: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.xs },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
});
