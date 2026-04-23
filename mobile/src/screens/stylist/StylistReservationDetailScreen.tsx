import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useFloatingTabBarTotalHeight } from '../../navigation/FloatingTabBar';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useStylistProfile } from '../../hooks/useStylistProfile';
import api from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Badge, getStatusVariant } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { spacing } from '../../theme';
import { formatDate, formatTime } from '../../utils/date';
import { getReservationServicesLabel, getReservationTotalDurationMinutes } from '../../utils/reservationServices';
import type { StylistScheduleStackParamList } from '../../navigation/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import type { ClientDebt, DailyLogEntry, Reservation } from '../../types';

type Props = NativeStackScreenProps<
  StylistScheduleStackParamList,
  'StylistReservationDetail'
>;

export function StylistReservationDetailScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const tabBarBottom = useFloatingTabBarTotalHeight();
  const { profileId } = useStylistProfile();
  const reservationId = route.params.reservationId;

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  const [noShowModalOpen, setNoShowModalOpen] = useState(false);
  const [noShowReason, setNoShowReason] = useState('');
  const [noShowApplyPenalty, setNoShowApplyPenalty] = useState(true);
  const [noShowSubmitting, setNoShowSubmitting] = useState(false);

  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [completeActualPrice, setCompleteActualPrice] = useState('');
  const [completeNotes, setCompleteNotes] = useState('');
  const [completeSubmitting, setCompleteSubmitting] = useState(false);
  const [clientDebts, setClientDebts] = useState<ClientDebt[]>([]);
  const [clientDebtsLoading, setClientDebtsLoading] = useState(false);
  const [selectedDebtIds, setSelectedDebtIds] = useState<Record<string, boolean>>({});
  const [startSubmitting, setStartSubmitting] = useState(false);
  const [startBlockedReason, setStartBlockedReason] = useState<string | null>(null);
  const [overrunModalOpen, setOverrunModalOpen] = useState(false);
  const [manualShiftMinutes, setManualShiftMinutes] = useState('5');
  const [reorderModalOpen, setReorderModalOpen] = useState(false);
  const [reorderStartTime, setReorderStartTime] = useState('');
  const [reorderEndTime, setReorderEndTime] = useState('');
  const [reorderSubmitting, setReorderSubmitting] = useState(false);

  const fetchReservation = useCallback(async () => {
    try {
      const { data } = await api.get<Reservation>(`/api/reservations/${reservationId}`);
      setReservation(data);
    } catch {
      setReservation(null);
    }
    setLoading(false);
  }, [reservationId]);

  const fetchClientDebts = useCallback(async (clientId?: string) => {
    if (!clientId) {
      setClientDebts([]);
      return;
    }
    setClientDebtsLoading(true);
    try {
      const { data } = await api.get<ClientDebt[]>('/api/client-debts', {
        params: { clientId },
      });
      setClientDebts(Array.isArray(data) ? data : []);
    } catch {
      setClientDebts([]);
    } finally {
      setClientDebtsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReservation();
  }, [fetchReservation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchReservation();
    setRefreshing(false);
  }, [fetchReservation]);

  const canCancelByStylist = useMemo(() => {
    if (!reservation) return false;
    return (
      (reservation.status === 'CONFIRMED' || reservation.status === 'IN_PROGRESS') &&
      reservation.confirmedStylistId === profileId
    );
  }, [reservation, profileId]);

  const canMarkNoShow = useMemo(() => {
    if (!reservation) return false;
    return (
      (reservation.status === 'CONFIRMED' || reservation.status === 'ATTENDANCE_CONFIRMED') &&
      reservation.confirmedStylistId === profileId
    );
  }, [reservation, profileId]);

  const canStart = useMemo(() => {
    if (!reservation) return false;
    return (
      reservation.status === 'ATTENDANCE_CONFIRMED' &&
      reservation.confirmedStylistId === profileId
    );
  }, [reservation, profileId]);

  const isStartOverdue = useMemo(() => {
    if (!reservation) return false;
    if (reservation.status !== 'ATTENDANCE_CONFIRMED') return false;
    const [y, m, d] = reservation.reservationDate.slice(0, 10).split('-').map(Number);
    const [eh, em] = reservation.endTime.slice(0, 5).split(':').map(Number);
    const plannedEnd = new Date(y ?? 0, (m ?? 1) - 1, d ?? 1, eh ?? 0, em ?? 0, 0, 0);
    return Date.now() > plannedEnd.getTime();
  }, [reservation]);

  const [timeTick, setTimeTick] = useState(0);
  const overrunPopupShownForRef = useRef<string | null>(null);
  const isFocused = useIsFocused();

  useFocusEffect(
    useCallback(() => {
      const id = setInterval(() => setTimeTick((v) => v + 1), 30000);
      void fetchReservation();
      return () => {
        clearInterval(id);
        overrunPopupShownForRef.current = null;
      };
    }, [fetchReservation]),
  );

  useEffect(() => {
    void fetchClientDebts(reservation?.clientId);
  }, [reservation?.clientId, fetchClientDebts]);

  useEffect(() => {
    let cancelled = false;

    async function resolveStartBlockReason() {
      if (!reservation || !profileId || reservation.status !== 'ATTENDANCE_CONFIRMED') {
        if (!cancelled) setStartBlockedReason(null);
        return;
      }

      const [y, m, d] = reservation.reservationDate.slice(0, 10).split('-').map(Number);
      const [sh, sm] = reservation.startTime.slice(0, 5).split(':').map(Number);
      const plannedStart = new Date(y ?? 0, (m ?? 1) - 1, d ?? 1, sh ?? 0, sm ?? 0, 0, 0);
      if (Date.now() < plannedStart.getTime()) {
        if (!cancelled) {
          setStartBlockedReason(
            `Termin još nije počeo. Start je dozvoljen od ${formatTime(reservation.startTime)}.`,
          );
        }
        return;
      }

      try {
        const day = reservation.reservationDate.slice(0, 10);
        const { data } = await api.get<Reservation[]>('/api/reservations', {
          params: { asStylist: true, fromDate: day, toDate: day },
        });
        const list = Array.isArray(data) ? data : [];
        const earlierPending = list
          .filter((r) => r.id !== reservation.id)
          .filter((r) => r.confirmedStylistId === profileId)
          .filter((r) => r.startTime < reservation.startTime)
          .find(
            (r) => r.status === 'CONFIRMED' || r.status === 'ATTENDANCE_CONFIRMED',
          );

        if (!cancelled) {
          setStartBlockedReason(
            earlierPending
              ? `Postoji raniji termin (${formatTime(earlierPending.startTime)}–${formatTime(earlierPending.endTime)}) koji prvo treba obraditi.`
              : null,
          );
        }
      } catch {
        if (!cancelled) setStartBlockedReason(null);
      }
    }

    resolveStartBlockReason();
    return () => {
      cancelled = true;
    };
  }, [reservation, profileId]);

  const canComplete = useMemo(() => {
    if (!reservation) return false;
    return (
      reservation.status === 'IN_PROGRESS' &&
      reservation.confirmedStylistId === profileId
    );
  }, [reservation, profileId]);

  const hasAnyAction = useMemo(() => {
    return canStart || canComplete || canCancelByStylist || canMarkNoShow;
  }, [canStart, canComplete, canCancelByStylist, canMarkNoShow]);

  const navigateToReschedulePreview = useCallback(
    (mode: 'actual_overrun' | 'manual_minutes' | 'use_break_only') => {
      if (!reservation) return;
      (navigation.getParent() as { navigate: (name: string, params: object) => void } | undefined)?.navigate(
        'DailyLogTab',
        {
          screen: 'ReschedulePreview',
          params: {
            reservationId: reservation.id,
            includeBreaks: false,
            mode,
            manualShiftMinutes:
              mode === 'manual_minutes'
                ? Math.max(0, parseInt(manualShiftMinutes || '0', 10) || 0)
                : undefined,
          },
        },
      );
    },
    [navigation, reservation, manualShiftMinutes],
  );

  useEffect(() => {
    if (reservation?.status !== 'IN_PROGRESS') {
      overrunPopupShownForRef.current = null;
    }
  }, [reservation?.status]);

  useEffect(() => {
    if (!isFocused) return;
    if (!reservation) return;
    if (reservation.status !== 'IN_PROGRESS') return;
    if (reservation.confirmedStylistId !== profileId) return;

    const [y, m, d] = reservation.reservationDate.slice(0, 10).split('-').map(Number);
    const [eh, em] = reservation.endTime.slice(0, 5).split(':').map(Number);
    const plannedEnd = new Date(y ?? 0, (m ?? 1) - 1, d ?? 1, eh ?? 0, em ?? 0, 0, 0);
    const overrunMinutes = Math.floor((Date.now() - plannedEnd.getTime()) / 60000);
    if (overrunMinutes < 5) return;

    const popupKey = `${reservation.id}:5`;
    if (overrunPopupShownForRef.current === popupKey) return;
    overrunPopupShownForRef.current = popupKey;

    Alert.alert(
      'Termin je probijen',
      `Termin je probijen ${overrunMinutes} min. Želite li odmah otvoriti rekalkulaciju i poslati obavijesti klijentima?`,
      [
        { text: 'Kasnije', style: 'cancel' },
        {
          text: 'Otvori rekalkulaciju',
          onPress: () => navigateToReschedulePreview('actual_overrun'),
        },
      ],
    );
  }, [isFocused, reservation, profileId, navigateToReschedulePreview, timeTick]);

  const submitStart = useCallback(async () => {
    if (!reservation) return;
    setStartSubmitting(true);
    try {
      await api.post(`/api/reservations/${reservation.id}/stylist-start`);
      await fetchReservation();
      // UX: vrati na raspored gdje se prikazuje aktivna kartica sa countdown + akcijama
      navigation.goBack();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as any).response?.data?.message
          : 'Greška pri startovanju.';
      Alert.alert('Greška', Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setStartSubmitting(false);
    }
  }, [reservation, fetchReservation]);

  const submitReorderRequest = useCallback(async () => {
    if (!reservation) return;
    const start = reorderStartTime.trim();
    const end = reorderEndTime.trim();
    if (!start || !end) {
      Alert.alert('Greška', 'Unesite početak i kraj novog termina.');
      return;
    }
    setReorderSubmitting(true);
    try {
      await api.post(`/api/reservations/${reservation.id}/reorder/request`, {
        targetStartTime: start,
        targetEndTime: end,
      });
      setReorderModalOpen(false);
      setReorderStartTime('');
      setReorderEndTime('');
      await fetchReservation();
      Alert.alert('Poslano', 'Klijentu je poslan prijedlog pomjeranja termina.');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as any).response?.data?.message
          : 'Greška pri slanju prijedloga.';
      Alert.alert('Greška', Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setReorderSubmitting(false);
    }
  }, [reservation, reorderStartTime, reorderEndTime, fetchReservation]);

  const openCancel = useCallback(() => {
    setCancelReason('');
    setCancelModalOpen(true);
  }, []);

  const openNoShow = useCallback(() => {
    setNoShowReason('');
    setNoShowApplyPenalty(true);
    setNoShowModalOpen(true);
  }, []);

  const submitCancel = useCallback(async () => {
    if (!reservation) return;
    const reason = cancelReason.trim();
    if (!reason) {
      Alert.alert('Greška', 'Unesite obrazloženje otkazivanja.');
      return;
    }
    setCancelSubmitting(true);
    try {
      await api.post(`/api/reservations/${reservation.id}/stylist-cancel`, { cancelReason: reason });
      setCancelModalOpen(false);
      await fetchReservation();
      Alert.alert('Otkazano', 'Rezervacija je otkazana.');
      navigation.goBack();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as any).response?.data?.message
          : 'Greška pri otkazivanju.';
      Alert.alert('Greška', Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setCancelSubmitting(false);
    }
  }, [reservation, cancelReason, fetchReservation, navigation]);

  const submitNoShow = useCallback(async () => {
    if (!reservation) return;
    const reason = noShowReason.trim();
    if (!reason) {
      Alert.alert('Greška', 'Unesite obrazloženje.');
      return;
    }
    setNoShowSubmitting(true);
    try {
      await api.post(`/api/reservations/${reservation.id}/stylist-no-show`, {
        reason,
        applyPenalty: noShowApplyPenalty,
      });
      setNoShowModalOpen(false);
      await fetchReservation();
      Alert.alert('Označeno', 'Rezervacija je označena kao no-show.');
      navigation.goBack();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as any).response?.data?.message
          : 'Greška pri označavanju.';
      Alert.alert('Greška', Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setNoShowSubmitting(false);
    }
  }, [reservation, noShowReason, noShowApplyPenalty, fetchReservation, navigation]);

  const openComplete = useCallback(() => {
    if (!reservation) return;
    if (reservation.status !== 'IN_PROGRESS') return;
    const basePrice =
      reservation.service && 'price' in reservation.service ? Number((reservation.service as any).price) : 0;
    const loyaltyDiscountAmount = 'loyaltyDiscountAmount' in reservation ? Number((reservation as any).loyaltyDiscountAmount ?? 0) : 0;
    const chargePrice = Math.max(0, basePrice - loyaltyDiscountAmount);
    setCompleteActualPrice(chargePrice ? String(chargePrice) : '');
    setCompleteNotes('');
    setSelectedDebtIds({});
    setCompleteModalOpen(true);
  }, [reservation]);

  const selectedDebtSum = useMemo(() => {
    const selected = clientDebts.filter((d) => selectedDebtIds[d.id]);
    return selected.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);
  }, [clientDebts, selectedDebtIds]);

  const submitComplete = useCallback(async () => {
    if (!reservation) return;
    const basePrice =
      reservation.service && 'price' in reservation.service ? Number((reservation.service as any).price) : 0;
    const loyaltyDiscountAmount = 'loyaltyDiscountAmount' in reservation ? Number((reservation as any).loyaltyDiscountAmount ?? 0) : 0;
    const minCharge = Math.max(0, basePrice - loyaltyDiscountAmount);

    const paidRaw = parseFloat(completeActualPrice.replace(',', '.'));
    if (isNaN(paidRaw) || paidRaw < 0) {
      Alert.alert(
        'Greška',
        'Unesite ispravan iznos naplaćenog računa.',
      );
      return;
    }
    const autoTip = paidRaw - minCharge;
    const tipAmount = autoTip > 0 ? autoTip : 0;
    const actualPriceWithDebts = paidRaw + selectedDebtSum;

    const doSubmit = async (debtHandling: 'CREATE_DEBT' | 'IGNORE_DEBT') => {
      setCompleteSubmitting(true);
      try {
        const selectedDebts = clientDebts.filter((d) => selectedDebtIds[d.id]);
        const { data: entry } = await api.post<DailyLogEntry>(
          `/api/daily-log/from-reservation/${reservation.id}`,
          {
            paidAmount: paidRaw,
            settledDebtIds: selectedDebts.map((d) => d.id),
            debtHandling,
            tipAmount: tipAmount >= 0 ? tipAmount : 0,
            notes: completeNotes.trim() || undefined,
          },
        );
        setCompleteModalOpen(false);
        await fetchReservation();
        await fetchClientDebts(reservation.clientId);

        (navigation.getParent() as { navigate: (name: string, params: object) => void } | undefined)?.navigate(
          'DailyLogTab',
          { screen: 'DailyLogDetail', params: { entryId: entry.id } },
        );
      } catch (err: unknown) {
        const msg =
          err && typeof err === 'object' && 'response' in err
            ? (err as any).response?.data?.message
            : 'Greška pri upisu.';
        Alert.alert('Greška', Array.isArray(msg) ? msg[0] : msg);
      } finally {
        setCompleteSubmitting(false);
      }
    };

    if (paidRaw < minCharge) {
      const diff = Math.max(0, minCharge - paidRaw);
      Alert.alert(
        'Naplaćuje se manje nego što sistem zahtijeva',
        `Razlika iznosi ${diff.toFixed(2)} KM. Želite li da se ta razlika evidentira kao dug klijentu?`,
        [
          { text: 'Odustani', style: 'cancel' },
          { text: 'Ne zavodi dug', onPress: () => void doSubmit('IGNORE_DEBT') },
          { text: 'Zavedi dug', onPress: () => void doSubmit('CREATE_DEBT') },
        ],
      );
      return;
    }

    await doSubmit('IGNORE_DEBT');
  }, [reservation, completeActualPrice, completeNotes, fetchReservation, navigation, selectedDebtSum, clientDebts, selectedDebtIds, fetchClientDebts]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!reservation) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Rezervacija nije pronađena.</Text>
        <Button title="Nazad" onPress={() => navigation.goBack()} variant="outline" style={{ marginTop: spacing.md }} />
      </View>
    );
  }

  const statusLabel =
    reservation.status === 'CANCELLED_BY_CLIENT' &&
    (reservation.cancelReason ?? '').trim() === 'Nije potvrđen dolazak u roku'
      ? 'Otkazano (nepotvrđen dolazak)'
      : t(`myReservations.status.${reservation.status}` as any);
  const loyaltyPercent = 'loyaltyDiscountPercent' in reservation ? Number((reservation as any).loyaltyDiscountPercent ?? 0) : 0;
  const loyaltyAmount = 'loyaltyDiscountAmount' in reservation ? Number((reservation as any).loyaltyDiscountAmount ?? 0) : 0;
  const totalMinutes = getReservationTotalDurationMinutes(reservation);
  const durationSuffix = totalMinutes > 0 ? ` · ${totalMinutes} min` : '';

  return (
    <>
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[styles.content, { paddingBottom: spacing.xl + tabBarBottom }]}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <Card style={[styles.card, { borderWidth: 1, borderColor: colors.border }]}>
          <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.serviceName, { color: colors.text }]}>
                {getReservationServicesLabel(reservation)}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {formatDate(reservation.reservationDate.slice(0, 10))} · {formatTime(reservation.startTime)} – {formatTime(reservation.endTime)}
                {durationSuffix}
              </Text>
            </View>
            <Badge
              label={statusLabel}
              variant={getStatusVariant(reservation.status)}
              status={reservation.status}
            />
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                {reservation.client
                  ? `${reservation.client.firstName} ${reservation.client.lastName}`
                  : '—'}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="pricetag-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                {loyaltyPercent > 0
                  ? `Loyalty: ${loyaltyPercent}% (${loyaltyAmount.toFixed(2)} KM)`
                  : 'Loyalty: —'}
              </Text>
            </View>
            {reservation.clientNotes ? (
              <View style={[styles.infoItem, { alignItems: 'flex-start' }]}>
                <Ionicons name="chatbubble-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.infoText, { color: colors.textSecondary, flex: 1 }]}>
                  {reservation.clientNotes}
                </Text>
              </View>
            ) : null}
            {reservation.rescheduleStatus === 'PENDING' ? (
              <View style={[styles.infoItem, { alignItems: 'flex-start' }]}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.warning} />
                <Text style={[styles.infoText, { color: colors.warning, flex: 1 }]}>
                  Klijent treba potvrditi predloženi termin.
                </Text>
              </View>
            ) : null}
          </View>
        </Card>

        {hasAnyAction ? (
          <Card style={[styles.card, { borderWidth: 1, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Akcije</Text>
            {canStart && (
              <Button
                title={isStartOverdue ? 'Obradi kašnjenje termina' : 'Startuj rezervaciju'}
                onPress={isStartOverdue ? () => setOverrunModalOpen(true) : submitStart}
                loading={startSubmitting}
                disabled={!!startBlockedReason}
                style={{ marginBottom: spacing.sm }}
              />
            )}
            {canStart && startBlockedReason ? (
              <View style={[styles.infoItem, { alignItems: 'flex-start', marginTop: -4 }]}>
                <Ionicons name="lock-closed-outline" size={16} color={colors.warning} />
                <Text style={[styles.infoText, { color: colors.warning, flex: 1 }]}>
                  {startBlockedReason}
                </Text>
              </View>
            ) : null}
            {canComplete && (
              <Button
                title={t('stylist.schedule.completeSubmit')}
                onPress={openComplete}
                style={{ marginBottom: spacing.sm }}
              />
            )}
            {canMarkNoShow && (
              <Button
                title="Klijent se nije pojavio (no-show)"
                onPress={openNoShow}
                variant="outline"
                textStyle={{ color: colors.error }}
                style={{ marginBottom: spacing.sm }}
              />
            )}
            {canCancelByStylist && (
              <Button
                title={t('stylist.schedule.cancelWithReason')}
                onPress={openCancel}
                variant="outline"
                textStyle={{ color: colors.error }}
              />
            )}
            {(reservation.status === 'CONFIRMED' || reservation.status === 'ATTENDANCE_CONFIRMED') &&
            reservation.confirmedStylistId === profileId &&
            !isStartOverdue ? (
              <Button
                title="Predloži pomjeranje termina (reorder)"
                onPress={() => setReorderModalOpen(true)}
                variant="outline"
                style={{ marginTop: spacing.sm }}
              />
            ) : null}
          </Card>
        ) : null}
      </ScrollView>

      <Modal visible={cancelModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContentWrap}
          >
            <Card style={{ ...styles.modalCard, backgroundColor: colors.surface }}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t('stylist.schedule.cancelTitle')}
              </Text>
              <Input
                label={t('stylist.schedule.cancelReasonLabel')}
                value={cancelReason}
                onChangeText={setCancelReason}
                placeholder={t('stylist.schedule.cancelReasonPlaceholder')}
                multiline
              />
              <View style={styles.modalActions}>
                <Button
                  title={t('common.cancel')}
                  onPress={() => setCancelModalOpen(false)}
                  variant="outline"
                  style={styles.modalBtn}
                />
                <Button
                  title={t('stylist.schedule.cancelConfirm')}
                  onPress={submitCancel}
                  loading={cancelSubmitting}
                  style={styles.modalBtn}
                />
              </View>
            </Card>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={noShowModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContentWrap}
          >
            <Card style={{ ...styles.modalCard, backgroundColor: colors.surface }}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Klijent se nije pojavio
              </Text>
              <Input
                label="Obrazloženje"
                value={noShowReason}
                onChangeText={setNoShowReason}
                placeholder="Npr. Klijent se nije pojavio na termin"
                multiline
              />
              <View style={styles.modalActions}>
                <Button
                  title={noShowApplyPenalty ? 'Penal: DA' : 'Penal: NE'}
                  onPress={() => setNoShowApplyPenalty((v) => !v)}
                  variant={noShowApplyPenalty ? 'primary' : 'outline'}
                  style={styles.modalBtn}
                />
                <Button
                  title="Označi no-show"
                  onPress={submitNoShow}
                  loading={noShowSubmitting}
                  style={styles.modalBtn}
                />
              </View>
              <Button
                title={t('common.cancel')}
                onPress={() => setNoShowModalOpen(false)}
                variant="ghost"
                textStyle={{ color: colors.textSecondary }}
                style={{ marginTop: spacing.sm }}
              />
            </Card>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={completeModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContentWrap}
          >
            <Card style={{ ...styles.modalCard, backgroundColor: colors.surface }}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t('stylist.schedule.completeTitle')}
              </Text>
              <Input
                label="Cijena (KM)"
                value={completeActualPrice}
                onChangeText={setCompleteActualPrice}
                keyboardType="decimal-pad"
              />
              <View style={{ marginTop: spacing.sm }}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Dugovanja klijenta</Text>
                {clientDebtsLoading ? (
                  <View style={{ paddingVertical: spacing.sm }}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                ) : clientDebts.length === 0 ? (
                  <Text style={[styles.infoText, { color: colors.textSecondary }]}>Nema otvorenih dugovanja.</Text>
                ) : (
                  <View style={{ gap: 8 }}>
                    {clientDebts.slice(0, 6).map((d) => {
                      const isMine = d.stylistProfileId === profileId;
                      const label = d.service?.name ?? 'Usluga';
                      const stylistName = d.stylistProfile?.user
                        ? `${d.stylistProfile.user.firstName} ${d.stylistProfile.user.lastName}`.trim()
                        : 'Stilist';
                      const selected = !!selectedDebtIds[d.id];
                      return (
                        <TouchableOpacity
                          key={d.id}
                          onPress={() =>
                            setSelectedDebtIds((prev) => ({ ...prev, [d.id]: !prev[d.id] }))
                          }
                          style={[
                            styles.debtRow,
                            { borderColor: colors.border, backgroundColor: colors.surface },
                          ]}
                        >
                          <Ionicons
                            name={selected ? 'checkbox-outline' : 'square-outline'}
                            size={18}
                            color={selected ? colors.primary : colors.textSecondary}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.debtTitle, { color: colors.text }]}>
                              {label} · {Number(d.amount).toFixed(2)} KM
                            </Text>
                            <Text style={[styles.debtMeta, { color: colors.textSecondary }]}>
                              {isMine ? 'Dug kod vas' : `Dug kod ${stylistName}`} · {d.createdAt.slice(0, 10)}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                    <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                      Odabrana dugovanja će biti dodata na ukupnu cijenu i neće se računati u napojnicu.
                    </Text>
                    <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                      Ukupno za dugovanja: {selectedDebtSum.toFixed(2)} KM
                    </Text>
                  </View>
                )}
              </View>
              <Input
                label="Napomena (opciono)"
                value={completeNotes}
                onChangeText={setCompleteNotes}
                multiline
              />
              <View style={styles.modalActions}>
                <Button
                  title={t('common.cancel')}
                  onPress={() => setCompleteModalOpen(false)}
                  variant="outline"
                  style={styles.modalBtn}
                />
                <Button
                  title={t('stylist.schedule.completeSubmit')}
                  onPress={submitComplete}
                  loading={completeSubmitting}
                  style={styles.modalBtn}
                />
              </View>
            </Card>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={overrunModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContentWrap}
          >
            <Card style={{ ...styles.modalCard, backgroundColor: colors.surface }}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Kašnjenje termina
              </Text>
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Odaberite kako želite obraditi kašnjenje prije nastavka rada.
              </Text>
              <Button
                title="Rekalkuliši po stvarnom kašnjenju"
                onPress={() => {
                  setOverrunModalOpen(false);
                  navigateToReschedulePreview('actual_overrun');
                }}
                style={{ marginTop: spacing.md }}
              />
              <Input
                label="Ručni unos minuta"
                value={manualShiftMinutes}
                onChangeText={setManualShiftMinutes}
                keyboardType="number-pad"
              />
              <Button
                title="Rekalkuliši po ručnom unosu"
                onPress={() => {
                  setOverrunModalOpen(false);
                  navigateToReschedulePreview('manual_minutes');
                }}
                variant="outline"
              />
              <Button
                title="Ne pomjeraj termine (iskoristi kraću pauzu)"
                onPress={() => {
                  setOverrunModalOpen(false);
                  navigateToReschedulePreview('use_break_only');
                }}
                variant="ghost"
              />
            </Card>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={reorderModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContentWrap}
          >
            <Card style={{ ...styles.modalCard, backgroundColor: colors.surface }}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Reorder termina
              </Text>
              <Input
                label="Novi početak (HH:mm)"
                value={reorderStartTime}
                onChangeText={setReorderStartTime}
                placeholder="11:15"
              />
              <Input
                label="Novi kraj (HH:mm)"
                value={reorderEndTime}
                onChangeText={setReorderEndTime}
                placeholder="11:45"
              />
              <View style={styles.modalActions}>
                <Button
                  title={t('common.cancel')}
                  onPress={() => setReorderModalOpen(false)}
                  variant="outline"
                  style={styles.modalBtn}
                />
                <Button
                  title="Pošalji klijentu"
                  onPress={submitReorderRequest}
                  loading={reorderSubmitting}
                  style={styles.modalBtn}
                />
              </View>
            </Card>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.md },
  card: { marginBottom: spacing.md },
  headerRow: { flexDirection: 'row', gap: 10, paddingBottom: spacing.sm, marginBottom: spacing.sm, borderBottomWidth: 1 },
  serviceName: { fontSize: 18, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 4 },
  infoGrid: { gap: 10 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 14, flexShrink: 1 },
  notes: { fontSize: 13, marginTop: spacing.sm },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: spacing.sm },
  modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: spacing.md },
  modalContentWrap: { maxHeight: '80%' },
  modalCard: { padding: spacing.lg },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.md },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: spacing.md },
  modalBtn: { flex: 1 },
  debtRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 10,
    borderWidth: 1,
    borderRadius: 12,
  },
  debtTitle: { fontSize: 14, fontWeight: '700' },
  debtMeta: { fontSize: 12, marginTop: 2 },
});

