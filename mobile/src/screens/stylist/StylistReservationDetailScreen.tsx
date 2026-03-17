import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
} from 'react-native';
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
import type { StylistScheduleStackParamList } from '../../navigation/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DailyLogEntry, Reservation } from '../../types';

type Props = NativeStackScreenProps<
  StylistScheduleStackParamList,
  'StylistReservationDetail'
>;

export function StylistReservationDetailScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
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
  const [startSubmitting, setStartSubmitting] = useState(false);

  const fetchReservation = useCallback(async () => {
    try {
      const { data } = await api.get<Reservation>(`/api/reservations/${reservationId}`);
      setReservation(data);
    } catch {
      setReservation(null);
    }
    setLoading(false);
  }, [reservationId]);

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
    setCompleteModalOpen(true);
  }, [reservation]);

  const submitComplete = useCallback(async () => {
    if (!reservation) return;
    const basePrice =
      reservation.service && 'price' in reservation.service ? Number((reservation.service as any).price) : 0;
    const loyaltyDiscountAmount = 'loyaltyDiscountAmount' in reservation ? Number((reservation as any).loyaltyDiscountAmount ?? 0) : 0;
    const minCharge = Math.max(0, basePrice - loyaltyDiscountAmount);

    const paidRaw = parseFloat(completeActualPrice.replace(',', '.'));
    if (isNaN(paidRaw) || paidRaw < minCharge) {
      Alert.alert(
        'Greška',
        minCharge > 0
          ? `Naplaćeni iznos ne može biti manji od preporučene cijene za naplatu (${minCharge.toFixed(2)} KM).`
          : 'Unesite ispravan iznos naplaćenog računa.',
      );
      return;
    }
    const autoTip = paidRaw - minCharge;
    const tipAmount = autoTip > 0 ? autoTip : 0;

    setCompleteSubmitting(true);
    try {
      const { data: entry } = await api.post<DailyLogEntry>(`/api/daily-log/from-reservation/${reservation.id}`, {
        actualPrice: paidRaw,
        tipAmount: tipAmount >= 0 ? tipAmount : 0,
        notes: completeNotes.trim() || undefined,
      });
      setCompleteModalOpen(false);
      await fetchReservation();

      // UX: nakon unosa naplate prebacujemo stilistu u Dnevnik -> detalji zapisa,
      // gdje može dodati before/after i završiti zapis (što će i završiti rezervaciju).
      navigation.getParent()?.navigate('DailyLogTab' as never, {
        screen: 'DailyLogDetail',
        params: { entryId: entry.id },
      } as never);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as any).response?.data?.message
          : 'Greška pri upisu.';
      Alert.alert('Greška', Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setCompleteSubmitting(false);
    }
  }, [reservation, completeActualPrice, completeNotes, fetchReservation, navigation]);

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

  const statusLabel = t(`myReservations.status.${reservation.status}` as any);
  const loyaltyPercent = 'loyaltyDiscountPercent' in reservation ? Number((reservation as any).loyaltyDiscountPercent ?? 0) : 0;
  const loyaltyAmount = 'loyaltyDiscountAmount' in reservation ? Number((reservation as any).loyaltyDiscountAmount ?? 0) : 0;

  return (
    <>
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <Card style={[styles.card, { borderWidth: 1, borderColor: colors.border }]}>
          <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.serviceName, { color: colors.text }]}>
                {reservation.service?.name ?? 'Usluga'}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {formatDate(reservation.reservationDate.slice(0, 10))} · {formatTime(reservation.startTime)} – {formatTime(reservation.endTime)}
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
          </View>
        </Card>

        {hasAnyAction ? (
          <Card style={[styles.card, { borderWidth: 1, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Akcije</Text>
            {canStart && (
              <Button
                title="Startuj rezervaciju"
                onPress={submitStart}
                loading={startSubmitting}
                style={{ marginBottom: spacing.sm }}
              />
            )}
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
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
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
});

