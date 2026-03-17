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
      (reservation.status === 'ATTENDANCE_CONFIRMED' ||
        reservation.status === 'IN_PROGRESS') &&
      reservation.confirmedStylistId === profileId
    );
  }, [reservation, profileId]);

  const submitStart = useCallback(async () => {
    if (!reservation) return;
    setStartSubmitting(true);
    try {
      await api.post(`/api/reservations/${reservation.id}/stylist-start`);
      await fetchReservation();
      Alert.alert('Pokrenuto', 'Rezervacija je pokrenuta (u toku).');
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

  const openComplete = useCallback(() => {
    if (!reservation) return;
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
      await api.post<DailyLogEntry>(`/api/daily-log/from-reservation/${reservation.id}`, {
        actualPrice: paidRaw,
        tipAmount: tipAmount >= 0 ? tipAmount : 0,
        notes: completeNotes.trim() || undefined,
      });
      await api.post(`/api/reservations/${reservation.id}/stylist-mark-complete`);
      setCompleteModalOpen(false);
      await fetchReservation();

      // Ako je termin probio planirano vrijeme, stilisti ponuditi rekalkulaciju budućih termina.
      try {
        const { data: proposal } = await api.post<{
          delayMinutes: number;
          shiftMinutes: number;
          items: Array<{ id: string; shiftMinutes: number }>;
        }>(`/api/reservations/${reservation.id}/reschedule/propose`, { includeBreaks: true });
        if (proposal?.items?.length > 0 && (proposal.shiftMinutes ?? 0) > 0) {
          Alert.alert(
            'Rekalkulacija rasporeda',
            `Termin je probio za ~${proposal.delayMinutes} min. Predlog: pomjeriti ${proposal.items.length} termina za ${proposal.shiftMinutes} min (uz uključene pauze). Obavijestiti klijente?`,
            [
              { text: 'Ne sada', style: 'cancel' },
              {
                text: 'Obavijesti',
                onPress: async () => {
                  await api.post(`/api/reservations/${reservation.id}/reschedule/commit`, { includeBreaks: true });
                  Alert.alert('Poslano', 'Klijentima su poslane notifikacije za potvrdu novog termina.');
                  navigation.goBack();
                },
              },
            ],
          );
          return;
        }
      } catch {
        // Ako predlog ne uspije, samo nastavi standardni flow.
      }

      Alert.alert(
        'Završeno',
        'Rezervacija je označena završenom i upisana u dnevnu knjigu. U Dnevnoj knjizi možete dodati before/after slike i završiti zapis.',
      );
      navigation.goBack();
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
        <Card style={styles.card}>
          <View style={styles.row}>
            <Text style={[styles.time, { color: colors.text }]}>
              {formatTime(reservation.startTime)} – {formatTime(reservation.endTime)}
            </Text>
            <Badge label={statusLabel} variant={getStatusVariant(reservation.status)} status={reservation.status} />
          </View>
          <Text style={[styles.serviceName, { color: colors.text }]}>
            {reservation.service?.name ?? 'Usluga'}
          </Text>
          <Text style={[styles.meta, { color: colors.textSecondary }]}>{formatDate(reservation.reservationDate.slice(0, 10))}</Text>
          {reservation.client && (
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              Klijent: {reservation.client.firstName} {reservation.client.lastName}
            </Text>
          )}
          {loyaltyPercent > 0 && (
            <Text style={[styles.meta, { color: colors.success }]}>
              Loyalty popust: {loyaltyPercent}% ({loyaltyAmount.toFixed(2)} KM)
            </Text>
          )}
          {reservation.clientNotes ? (
            <Text style={[styles.notes, { color: colors.text }]}>{reservation.clientNotes}</Text>
          ) : null}
        </Card>

        <Card style={styles.card}>
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
          {canCancelByStylist && (
            <Button
              title={t('stylist.schedule.cancelWithReason')}
              onPress={openCancel}
              variant="outline"
              textStyle={{ color: colors.error }}
            />
          )}
        </Card>
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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  time: { fontSize: 16, fontWeight: '700' },
  serviceName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  meta: { fontSize: 13, marginTop: 2 },
  notes: { fontSize: 13, marginTop: spacing.sm },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: spacing.sm },
  modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: spacing.md },
  modalContentWrap: { maxHeight: '80%' },
  modalCard: { padding: spacing.lg },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.md },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: spacing.md },
  modalBtn: { flex: 1 },
});

