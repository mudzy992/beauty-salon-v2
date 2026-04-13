import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFloatingTabBarTotalHeight } from '../../navigation/FloatingTabBar';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { Card } from '../../components/ui/Card';
import { Badge, getStatusVariant } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import api from '../../services/api';
import { spacing, borderRadius } from '../../theme';
import { formatDate, formatTime, isUpcoming } from '../../utils/date';
import type { ReservationsScreenProps } from '../../navigation/types';
import type { Reservation, ReservationStatus } from '../../types';

interface Section {
  title: string;
  data: Reservation[];
}

const CANCELABLE: ReservationStatus[] = ['PENDING', 'STYLIST_REVIEW', 'CONFIRMED'];
const CONFIRMABLE: ReservationStatus[] = ['CONFIRMED'];

export function MyReservationsScreen({ navigation }: ReservationsScreenProps<'MyReservations'>) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const tabBarBottom = useFloatingTabBarTotalHeight();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelModalReservation, setCancelModalReservation] = useState<Reservation | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [visibleCount, setVisibleCount] = useState(4);
  const listRef = useRef<SectionList<Reservation>>(null);
  const focusReservationId =
    (navigation as any)?.getState?.()?.routes?.find?.((r: any) => r.name === 'MyReservations')?.params?.focusReservationId ??
    undefined;

  const fetchReservations = useCallback(async () => {
    try {
      const { data } = await api.get<Reservation[]>('/api/reservations', {
        params: { asClient: true },
      });
      setReservations(data);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchReservations(); }, [fetchReservations]);
  useAutoRefresh(fetchReservations, { intervalMs: 30000 });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchReservations();
    setRefreshing(false);
  }, [fetchReservations]);

  const openCancelModal = (reservation: Reservation) => {
    setCancelModalReservation(reservation);
    setCancelReason('');
  };

  const closeCancelModal = useCallback(() => {
    setCancelModalReservation(null);
    setCancelReason('');
  }, []);

  const submitCancel = useCallback(async () => {
    if (!cancelModalReservation) return;
    setCancelSubmitting(true);
    try {
      await api.post(`/api/reservations/${cancelModalReservation.id}/cancel`, {
        cancelReason: cancelReason.trim() || undefined,
      });
      closeCancelModal();
      fetchReservations();
    } catch (error: unknown) {
      const msg =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
          : t('common.error');
      Alert.alert(t('common.error'), Array.isArray(msg) ? msg[0] : String(msg ?? 'Greška'));
    } finally {
      setCancelSubmitting(false);
    }
  }, [cancelModalReservation, cancelReason, closeCancelModal, fetchReservations, t]);

  const handleConfirmAttendance = async (reservation: Reservation) => {
    try {
      await api.post(`/api/reservations/${reservation.id}/confirm-attendance`);
      fetchReservations();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.message || 'Greška');
    }
  };

  const handleAcceptReschedule = async (reservation: Reservation) => {
    try {
      await api.post(`/api/reservations/${reservation.id}/reschedule/accept`);
      fetchReservations();
      Alert.alert('Potvrđeno', 'Potvrdili ste novi termin.');
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.message || 'Greška');
    }
  };

  const handleDeclineReschedule = async (reservation: Reservation) => {
    Alert.alert(
      'Odbij novi termin?',
      'Ako je ovo rekalkulacija termina, rezervacija se otkazuje. Ako je reorder prijedlog, ostaje vaš postojeći termin.',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: 'Odbij',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post(`/api/reservations/${reservation.id}/reschedule/decline`);
              fetchReservations();
            } catch (error: any) {
              Alert.alert(t('common.error'), error.response?.data?.message || 'Greška');
            }
          },
        },
      ],
    );
  };

  const sections: Section[] = [];
  const activeReservation = reservations
    .filter((r) =>
      isUpcoming(r.reservationDate) &&
      !['COMPLETED', 'CANCELLED_BY_CLIENT', 'CANCELLED_BY_STYLISTS', 'NO_SHOW'].includes(r.status),
    )
    .sort((a, b) => {
      const ad = new Date(`${a.reservationDate}T${a.startTime}`).getTime();
      const bd = new Date(`${b.reservationDate}T${b.startTime}`).getTime();
      return ad - bd;
    })[0];

  const listSource = activeReservation
    ? reservations.filter((r) => r.id !== activeReservation.id)
    : reservations;
  const upcoming = listSource.filter((r) => isUpcoming(r.reservationDate) && !['COMPLETED', 'CANCELLED_BY_CLIENT', 'CANCELLED_BY_STYLISTS', 'NO_SHOW'].includes(r.status));
  const past = listSource.filter((r) => !upcoming.includes(r));

  if (upcoming.length > 0) sections.push({ title: t('myReservations.upcoming'), data: upcoming });
  if (past.length > 0) sections.push({ title: t('myReservations.past'), data: past });

  const totalListItems = sections.reduce((sum, s) => sum + s.data.length, 0);
  let remaining = visibleCount;
  const visibleSections: Section[] = sections
    .map((section) => {
      if (remaining <= 0) return { ...section, data: [] };
      const sliced = section.data.slice(0, remaining);
      remaining -= sliced.length;
      return { ...section, data: sliced };
    })
    .filter((section) => section.data.length > 0);

  const focusLocation = useMemo(() => {
    if (!focusReservationId) return null;
    for (let sectionIndex = 0; sectionIndex < visibleSections.length; sectionIndex++) {
      const itemIndex = visibleSections[sectionIndex].data.findIndex((r) => r.id === focusReservationId);
      if (itemIndex >= 0) return { sectionIndex, itemIndex };
    }
    return null;
  }, [focusReservationId, visibleSections]);

  useEffect(() => {
    if (!focusLocation) return;
    // Sačekaj render liste
    const tmr = setTimeout(() => {
      try {
        listRef.current?.scrollToLocation({
          sectionIndex: focusLocation.sectionIndex,
          itemIndex: focusLocation.itemIndex,
          viewPosition: 0.2,
          animated: true,
        });
      } catch { /* ignore */ }
    }, 250);
    return () => clearTimeout(tmr);
  }, [focusLocation]);

  const renderReservationCard = (item: Reservation, featured = false) => (
    <Animated.View layout={LinearTransition.springify().damping(18)}>
      <Card style={[styles.card, featured ? styles.featuredCard : undefined]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.serviceName, { color: colors.text }]}>
            {item.service?.name || 'Usluga'}
          </Text>
          <Badge
            label={
              item.status === 'CANCELLED_BY_CLIENT' &&
              (item.cancelReason ?? '').trim() === 'Nije potvrđen dolazak u roku'
                ? 'Otkazano (nepotvrđen dolazak)'
                : t(`myReservations.status.${item.status}` as any)
            }
            variant={getStatusVariant(item.status)}
            status={item.status}
          />
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.text }]}>
              {formatDate(item.reservationDate)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.text }]}>
              {formatTime(item.startTime)} - {formatTime(item.endTime)}
            </Text>
          </View>
          {item.rescheduleStatus === 'PENDING' && (
            <View style={styles.infoRow}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.warning} />
              <Text style={[styles.infoText, { color: colors.warning }]}>
                Novi termin čeka potvrdu.
              </Text>
            </View>
          )}
          {item.clientNotes && (
            <View style={styles.infoRow}>
              <Ionicons name="chatbubble-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]} numberOfLines={2}>
                {item.clientNotes}
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.actions, { borderTopColor: colors.borderLight }]}>
          {item.rescheduleStatus === 'PENDING' && (
            <>
              <Button
                title="Potvrdi termin"
                onPress={() => handleAcceptReschedule(item)}
                size="sm"
                variant="primary"
              />
              <Button
                title="Odbij"
                onPress={() => handleDeclineReschedule(item)}
                size="sm"
                variant="ghost"
                textStyle={{ color: colors.error }}
              />
            </>
          )}
          {CONFIRMABLE.includes(item.status) && !item.attendanceConfirmedAt && (
            <Button
              title={t('myReservations.confirmAttendance')}
              onPress={() => handleConfirmAttendance(item)}
              size="sm"
              variant="primary"
            />
          )}
          {item.attendanceConfirmedAt && item.status === 'ATTENDANCE_CONFIRMED' && (
            <View style={styles.confirmedBadge}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={[styles.confirmedText, { color: colors.success }]}>
                {t('myReservations.attendanceConfirmed')}
              </Text>
            </View>
          )}
          {CANCELABLE.includes(item.status) && (
            <Button
              title={t('myReservations.cancelReservation')}
              onPress={() => openCancelModal(item)}
              size="sm"
              variant="ghost"
              textStyle={{ color: colors.error }}
            />
          )}
          {item.status === 'COMPLETED' && (
            <Button
              title={t('reviews.writeReview')}
              onPress={() =>
                navigation.navigate('WriteReview', {
                  reservationId: item.id,
                  serviceId: item.serviceId,
                })
              }
              size="sm"
              variant="outline"
            />
          )}
        </View>
      </Card>
    </Animated.View>
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
    <SectionList
      ref={listRef}
      sections={visibleSections}
      keyExtractor={(item) => item.id}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.list,
        listSource.length === 0 && !activeReservation && styles.emptyList,
        { paddingBottom: spacing.lg + tabBarBottom },
      ]}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={
        <View>
          {activeReservation ? (
            <View style={styles.featuredWrap}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                Trenutna rezervacija
              </Text>
              {renderReservationCard(activeReservation, true)}
            </View>
          ) : (
            <Card style={styles.featuredCtaCard}>
              <Text style={[styles.featuredCtaTitle, { color: colors.text }]}>
                Nemate aktivnu rezervaciju
              </Text>
              <Text style={[styles.featuredCtaDesc, { color: colors.textSecondary }]}>
                Rezervišite termin i pratite status na jednom mjestu.
              </Text>
              <Button
                title={t('home.bookNow')}
                onPress={() =>
                  navigation.getParent()?.navigate('ServicesTab', {
                    screen: 'Reservation',
                    params: { origin: 'reservations' },
                  })
                }
                size="sm"
              />
            </Card>
          )}
        </View>
      }
      ListEmptyComponent={
        !activeReservation ? (
          <EmptyState
            icon="calendar-outline"
            title={t('myReservations.noReservations')}
            actionLabel={t('home.bookNow')}
            onAction={() =>
              navigation.getParent()?.navigate('ServicesTab', {
                screen: 'Reservation',
                params: { origin: 'reservations' },
              })
            }
          />
        ) : null
      }
      renderSectionHeader={({ section: { title } }) => (
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          {title}
        </Text>
      )}
      renderItem={({ item }) => renderReservationCard(item)}
      onEndReachedThreshold={0.35}
      onEndReached={() => {
        if (totalListItems > visibleCount) {
          setVisibleCount((prev) => prev + 4);
        }
      }}
    />

    <Modal visible={!!cancelModalReservation} animationType="slide" transparent>
      <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalContentWrap}
        >
          <Card style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t('myReservations.cancelReservation')}
            </Text>
            <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>
              {t('myReservations.cancelConfirm')}
            </Text>
            <Input
              label={t('myReservations.cancelReason')}
              value={cancelReason}
              onChangeText={setCancelReason}
              placeholder={t('myReservations.cancelReason')}
              multiline
            />
            <View style={styles.modalActions}>
              <Button
                title={t('common.cancel')}
                onPress={closeCancelModal}
                variant="outline"
                style={styles.modalBtn}
              />
              <Button
                title={t('common.confirm')}
                onPress={submitCancel}
                loading={cancelSubmitting}
                style={[styles.modalBtn, { borderColor: colors.error }]}
                textStyle={{ color: colors.error }}
                variant="outline"
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
  list: { padding: spacing.md },
  emptyList: { flex: 1 },
  featuredWrap: { marginBottom: spacing.sm },
  featuredCard: {
    borderWidth: 1,
    borderColor: 'rgba(212,168,67,0.45)',
  },
  featuredCtaCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    gap: spacing.sm,
  },
  featuredCtaTitle: { fontSize: 17, fontWeight: '700' },
  featuredCtaDesc: { fontSize: 14, lineHeight: 20 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  card: { marginBottom: spacing.sm },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  serviceName: { fontSize: 17, fontWeight: '600', flex: 1, marginRight: spacing.sm },
  cardBody: { gap: spacing.xs },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  infoText: { fontSize: 14 },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.sm,
  },
  confirmedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  confirmedText: { fontSize: 13, fontWeight: '500' },
  modalOverlay: { flex: 1, justifyContent: 'center', padding: spacing.md },
  modalContentWrap: { maxHeight: '80%' },
  modalCard: { padding: spacing.lg },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  modalMessage: { fontSize: 14, marginBottom: spacing.md },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: spacing.md },
  modalBtn: { flex: 1 },
});
