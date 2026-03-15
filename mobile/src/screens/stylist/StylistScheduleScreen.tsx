import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  SectionList,
  Modal,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useStylistProfile } from '../../hooks/useStylistProfile';
import { Card } from '../../components/ui/Card';
import { Badge, getStatusVariant } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import api from '../../services/api';
import { spacing } from '../../theme';
import { useTranslation } from 'react-i18next';
import { formatDate, formatTime } from '../../utils/date';
import type { Reservation, DailyLogEntry } from '../../types';

type Section = { title: string; data: Reservation[] };

export function StylistScheduleScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { profileId, loading: profileLoading } = useStylistProfile();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [completeModalReservation, setCompleteModalReservation] = useState<Reservation | null>(null);
  const [completeActualPrice, setCompleteActualPrice] = useState('');
  const [completeTipAmount, setCompleteTipAmount] = useState('');
  const [completeNotes, setCompleteNotes] = useState('');
  const [completeSubmitting, setCompleteSubmitting] = useState(false);
  const [cancelModalReservation, setCancelModalReservation] = useState<Reservation | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  const fetchReservations = useCallback(async () => {
    if (!profileId) {
      setLoading(false);
      return;
    }
    try {
      const from = new Date();
      from.setDate(from.getDate() - 7);
      const to = new Date();
      to.setDate(to.getDate() + 30);
      const { data } = await api.get<Reservation[]>('/api/reservations', {
        params: {
          asStylist: true,
          fromDate: from.toISOString().slice(0, 10),
          toDate: to.toISOString().slice(0, 10),
        },
      });
      setReservations(data);
    } catch {
      setReservations([]);
    }
    setLoading(false);
  }, [profileId]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchReservations();
    setRefreshing(false);
  }, [fetchReservations]);

  const canComplete = (r: Reservation) =>
    r.status === 'ATTENDANCE_CONFIRMED' && r.confirmedStylistId === profileId;

  const canCancelByStylist = (r: Reservation) =>
    (r.status === 'CONFIRMED' || r.status === 'IN_PROGRESS') && r.confirmedStylistId === profileId;

  const openCompleteModal = useCallback((r: Reservation) => {
    const price = r.service && 'price' in r.service ? Number((r.service as any).price) : 0;
    setCompleteModalReservation(r);
    setCompleteActualPrice(price ? String(price) : '');
    setCompleteTipAmount('');
    setCompleteNotes('');
  }, []);

  const closeCompleteModal = useCallback(() => {
    setCompleteModalReservation(null);
  }, []);

  const submitComplete = useCallback(async () => {
    if (!completeModalReservation) return;
    const actualPrice = parseFloat(completeActualPrice.replace(',', '.'));
    if (isNaN(actualPrice) || actualPrice < 0) {
      Alert.alert('Greška', 'Unesite ispravnu cijenu.');
      return;
    }
    const tipAmount = parseFloat(completeTipAmount.replace(',', '.')) || 0;
    setCompleteSubmitting(true);
    try {
      const { data: entry } = await api.post<DailyLogEntry>(
        `/api/daily-log/from-reservation/${completeModalReservation.id}`,
        { actualPrice, tipAmount: tipAmount >= 0 ? tipAmount : 0, notes: completeNotes.trim() || undefined },
      );
      await api.post(`/api/reservations/${completeModalReservation.id}/stylist-mark-complete`);
      await fetchReservations();
      closeCompleteModal();
      Alert.alert(
        'Završeno',
        'Rezervacija je označena završenom i upisana u dnevnu knjigu. U Dnevnoj knjizi možete dodati before/after slike i završiti zapis.',
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
  }, [completeModalReservation, completeActualPrice, completeTipAmount, completeNotes, fetchReservations, closeCompleteModal]);

  const openCancelModal = useCallback((r: Reservation) => {
    setCancelModalReservation(r);
    setCancelReason('');
  }, []);

  const closeCancelModal = useCallback(() => {
    setCancelModalReservation(null);
    setCancelReason('');
  }, []);

  const submitCancel = useCallback(async () => {
    if (!cancelModalReservation) return;
    const reason = cancelReason.trim();
    if (!reason) {
      Alert.alert('Greška', 'Unesite obrazloženje otkazivanja.');
      return;
    }
    setCancelSubmitting(true);
    try {
      await api.post(`/api/reservations/${cancelModalReservation.id}/stylist-cancel`, {
        cancelReason: reason,
      });
      await fetchReservations();
      closeCancelModal();
      Alert.alert('Otkazano', 'Rezervacija je otkazana.');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as any).response?.data?.message
          : 'Greška pri otkazivanju.';
      Alert.alert('Greška', Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setCancelSubmitting(false);
    }
  }, [cancelModalReservation, cancelReason, fetchReservations, closeCancelModal]);

  const sections: Section[] = React.useMemo(() => {
    const byDate: Record<string, Reservation[]> = {};
    for (const r of reservations) {
      const d = r.reservationDate.slice(0, 10);
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push(r);
    }
    for (const arr of Object.values(byDate)) {
      arr.sort((a, b) => (a.startTime < b.startTime ? -1 : 1));
    }
    const sortedDates = Object.keys(byDate).sort();
    return sortedDates.map((date) => ({
      title: formatDate(date),
      data: byDate[date],
    }));
  }, [reservations]);

  if (profileLoading || (loading && !profileId)) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!profileId) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="calendar-outline"
          title="Nema profila"
          message="Profil stilista nije pronađen."
        />
      </View>
    );
  }

  return (
    <>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, sections.length === 0 && styles.emptyList]}
        style={{ backgroundColor: colors.background }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title="Nema termina"
            message="Vaši potvrđeni i zakazani termini pojavit će se ovdje."
          />
        }
        renderSectionHeader={({ section }) => (
          <Text style={[styles.sectionHeader, { color: colors.primary }]}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => canComplete(item) && openCompleteModal(item)}
              disabled={!canComplete(item)}
            >
              <View style={styles.row}>
                <Text style={[styles.time, { color: colors.text }]}>
                  {formatTime(item.startTime)} – {formatTime(item.endTime)}
                </Text>
                <Badge
                  label={t(`myReservations.status.${item.status}` as any)}
                  variant={getStatusVariant(item.status)}
                  status={item.status}
                />
              </View>
              <Text style={[styles.serviceName, { color: colors.text }]}>
                {item.service?.name ?? 'Usluga'}
              </Text>
              {item.client && (
                <Text style={[styles.client, { color: colors.textSecondary }]}>
                  {item.client.firstName} {item.client.lastName}
                </Text>
              )}
              {canComplete(item) && (
                <Text style={[styles.hint, { color: colors.primary }]}>
                  {t('stylist.schedule.completeHint')}
                </Text>
              )}
            </TouchableOpacity>
            {canCancelByStylist(item) && (
              <Button
                title={t('stylist.schedule.cancelWithReason')}
                onPress={() => openCancelModal(item)}
                size="sm"
                variant="outline"
                textStyle={{ color: colors.error }}
                style={styles.cancelBtn}
              />
            )}
          </Card>
        )}
      />

      <Modal visible={!!cancelModalReservation} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContentWrap}
          >
            <Card style={{ ...styles.modalCard, backgroundColor: colors.surface }}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t('stylist.schedule.cancelTitle')}
              </Text>
              {cancelModalReservation && (
                <>
                  <Text style={[styles.modalService, { color: colors.textSecondary }]}>
                    {cancelModalReservation.service?.name} ·{' '}
                    {cancelModalReservation.client
                      ? `${cancelModalReservation.client.firstName} ${cancelModalReservation.client.lastName}`
                      : ''}
                  </Text>
                  <Input
                    label={t('stylist.schedule.cancelReasonLabel')}
                    value={cancelReason}
                    onChangeText={setCancelReason}
                    placeholder={t('stylist.schedule.cancelReasonPlaceholder')}
                    multiline
                  />
                </>
              )}
              <View style={styles.modalActions}>
                <Button title={t('common.cancel')} onPress={closeCancelModal} variant="outline" style={styles.modalBtn} />
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

      <Modal visible={!!completeModalReservation} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContentWrap}
          >
            <Card style={{ ...styles.modalCard, backgroundColor: colors.surface }}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t('stylist.schedule.completeTitle')}
              </Text>
              {completeModalReservation && (
                <>
                  <Text style={[styles.modalService, { color: colors.textSecondary }]}>
                    {completeModalReservation.service?.name} ·{' '}
                    {completeModalReservation.client
                      ? `${completeModalReservation.client.firstName} ${completeModalReservation.client.lastName}`
                      : ''}
                  </Text>
                  <Input
                    label="Cijena (KM)"
                    value={completeActualPrice}
                    onChangeText={setCompleteActualPrice}
                    keyboardType="decimal-pad"
                  />
                  <Input
                    label="Napojnica (KM)"
                    value={completeTipAmount}
                    onChangeText={setCompleteTipAmount}
                    keyboardType="decimal-pad"
                  />
                  <Input
                    label="Napomena (opciono)"
                    value={completeNotes}
                    onChangeText={setCompleteNotes}
                    multiline
                  />
                </>
              )}
              <View style={styles.modalActions}>
                <Button title={t('common.cancel')} onPress={closeCompleteModal} variant="outline" style={styles.modalBtn} />
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
  list: { padding: spacing.md, paddingBottom: spacing.xxl },
  emptyList: { flex: 1 },
  sectionHeader: { fontSize: 16, fontWeight: '700', marginTop: spacing.md, marginBottom: spacing.xs },
  card: { marginBottom: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  time: { fontSize: 15, fontWeight: '600' },
  serviceName: { fontSize: 15 },
  client: { fontSize: 13, marginTop: 2 },
  hint: { fontSize: 12, marginTop: 6, fontWeight: '600' },
  cancelBtn: { marginTop: 8 },
  modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: spacing.md },
  modalContentWrap: { maxHeight: '80%' },
  modalCard: { padding: spacing.lg },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  modalService: { fontSize: 14, marginBottom: spacing.md },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: spacing.md },
  modalBtn: { flex: 1 },
});
