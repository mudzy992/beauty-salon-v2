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
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../hooks/useTheme';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { useReservationSocketRefresh } from '../../hooks/useReservationSocketRefresh';
import { useSocket } from '../../realtime/SocketContext';
import { Card } from '../../components/ui/Card';
import { Badge, getStatusVariant } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import api from '../../services/api';
import { fetchAllReservationPages } from '../../services/reservation-list';
import { spacing, borderRadius } from '../../theme';
import { formatDate, formatTime, isUpcoming, salonWallTimeToInstant } from '../../utils/date';
import { getReservationServices } from '../../utils/reservationServices';
import { normalizeReservations } from '../../utils/apiPayload';
import { getApiErrorMessage } from '../../utils/apiError';
import { ATTENDANCE_UNCONFIRMED_CANCEL_REASON } from '../../constants/reservation';
import type { ReservationsScreenProps } from '../../navigation/types';
import type { Reservation, ReservationStatus } from '../../types';

interface Section {
  title: string;
  data: Reservation[];
}

const CANCELABLE: ReservationStatus[] = [
  'PENDING',
  'STYLIST_REVIEW',
  'CONFIRMED',
  'ATTENDANCE_CONFIRMED',
];
const CONFIRMABLE: ReservationStatus[] = ['CONFIRMED'];

const canConfirmAttendance = (reservation: Reservation): boolean => {
  if (
    !CONFIRMABLE.includes(reservation.status) ||
    reservation.attendancePolicy === 'STAFF_WAIVED' ||
    reservation.attendanceConfirmedAt
  ) {
    return false;
  }
  if (!reservation.attendanceClientDeadlineAt) return true;
  return Date.now() < new Date(reservation.attendanceClientDeadlineAt).getTime();
};

const getAttendanceConfirmHours = (reservation: Reservation, fallback = 12): number => {
  if (!reservation.attendanceClientDeadlineAt) return fallback;
  let start: Date;
  try {
    start = salonWallTimeToInstant(
      reservation.reservationDate.slice(0, 10),
      reservation.startTime,
    );
  } catch {
    return fallback;
  }
  const deadline = new Date(reservation.attendanceClientDeadlineAt);
  const diffHours = Math.round((start.getTime() - deadline.getTime()) / 3_600_000);
  return diffHours > 0 ? diffHours : fallback;
};

const getReservationStartTime = (reservation: Reservation): number => {
  try {
    return salonWallTimeToInstant(
      reservation.reservationDate.slice(0, 10),
      reservation.startTime,
    ).getTime();
  } catch {
    return Number.MAX_SAFE_INTEGER;
  }
};

export function MyReservationsScreen({ navigation, route }: ReservationsScreenProps<'MyReservations'>) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const tabBarBottom = useFloatingTabBarTotalHeight();
  const { connected: socketConnected } = useSocket();
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [reservationsOwnerId, setReservationsOwnerId] = useState<string | null>(null);
  const visibleReservations = reservationsOwnerId === userId ? reservations : [];
  const actionIdentityRef = useRef({
    userId,
    routeKey: route.key,
    generation: 0,
    mounted: true,
  });
  const activeActionRef = useRef<number | null>(null);
  const actionSequenceRef = useRef(0);
  if (
    actionIdentityRef.current.userId !== userId ||
    actionIdentityRef.current.routeKey !== route.key
  ) {
    actionIdentityRef.current = {
      userId,
      routeKey: route.key,
      generation: actionIdentityRef.current.generation + 1,
      mounted: actionIdentityRef.current.mounted,
    };
    activeActionRef.current = null;
  }
  const reservationSnapshotRef = useRef({ ownerId: reservationsOwnerId, reservations });
  reservationSnapshotRef.current = { ownerId: reservationsOwnerId, reservations };
  const isCurrentActionIdentity = useCallback((generation = actionIdentityRef.current.generation) => {
    const identity = actionIdentityRef.current;
    return (
      userId !== null &&
      identity.mounted &&
      identity.userId === userId &&
      identity.routeKey === route.key &&
      identity.generation === generation &&
      useAuthStore.getState().user?.id === userId
    );
  }, [route.key, userId]);
  const canStartAction = useCallback((reservationId: string) => {
    const snapshot = reservationSnapshotRef.current;
    return (
      isCurrentActionIdentity() &&
      snapshot.ownerId === userId &&
      snapshot.reservations.some((reservation) => reservation.id === reservationId) &&
      activeActionRef.current === null
    );
  }, [isCurrentActionIdentity, userId]);
  const beginAction = useCallback((reservationId: string) => {
    const generation = actionIdentityRef.current.generation;
    if (!canStartAction(reservationId)) return null;
    const token = ++actionSequenceRef.current;
    activeActionRef.current = token;
    return {
      isCurrent: () =>
        activeActionRef.current === token && isCurrentActionIdentity(generation),
      finish: () => {
        if (activeActionRef.current === token) activeActionRef.current = null;
      },
    };
  }, [canStartAction]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const requestGeneration = useRef(0);
  const requestOwnerId = useRef(userId);
  if (requestOwnerId.current !== userId) {
    requestOwnerId.current = userId;
    requestGeneration.current += 1;
  }
  const [refreshing, setRefreshing] = useState(false);
  const [cancelModalReservation, setCancelModalReservation] = useState<Reservation | null>(null);
  const [cancelModalOwner, setCancelModalOwner] = useState<{ userId: string; routeKey: string } | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [visibleCount, setVisibleCount] = useState(4);
  const listRef = useRef<SectionList<Reservation>>(null);
  const focusReservationId =
    route.params?.focusReservationId ??
    (navigation as any)?.getState?.()?.routes?.find?.((r: any) => r.name === 'MyReservations')?.params?.focusReservationId ??
    undefined;

  useEffect(() => {
    actionIdentityRef.current.mounted = true;
    return () => {
      actionIdentityRef.current.mounted = false;
      actionIdentityRef.current.generation += 1;
      activeActionRef.current = null;
      requestGeneration.current += 1;
    };
  }, []);

  const fetchReservations = useCallback(async () => {
    if (useAuthStore.getState().user?.id !== userId) return;
    const generation = ++requestGeneration.current;
    const isCurrentRequest = () =>
      generation === requestGeneration.current &&
      useAuthStore.getState().user?.id === userId;
    if (!userId) {
      setReservations([]);
      setReservationsOwnerId(null);
      setLoadError(false);
      setLoading(false);
      return;
    }
    try {
      const data = await fetchAllReservationPages<unknown>({ asClient: true });
      if (!isCurrentRequest()) return;
      const rows = normalizeReservations(data);
      if (!rows) setLoadError(true);
      else {
        // Direktne rezervacije u dnevniku više nisu klijentov posao.
        setReservations(rows.filter((reservation) => reservation.status !== 'AWAITING_DAILY_LOG'));
        setReservationsOwnerId(userId);
        setLoadError(false);
      }
    } catch {
      if (isCurrentRequest()) setLoadError(true);
    } finally {
      if (isCurrentRequest()) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    setReservations([]);
    setLoading(true);
    setLoadError(false);
    void fetchReservations();
    return () => {
      requestGeneration.current += 1;
    };
  }, [fetchReservations]);

  const refreshReservations = useAutoRefresh(fetchReservations, {
    intervalMs: 30000,
    connectedIntervalMs: 120000,
    isSocketConnected: socketConnected,
  });
  useReservationSocketRefresh(refreshReservations);

  const onRefresh = useCallback(async () => {
    const generation = actionIdentityRef.current.generation;
    if (!isCurrentActionIdentity(generation)) return;
    setRefreshing(true);
    try {
      await refreshReservations();
    } finally {
      if (isCurrentActionIdentity(generation)) setRefreshing(false);
    }
  }, [isCurrentActionIdentity, refreshReservations]);

  const openCancelModal = useCallback((reservation: Reservation) => {
    if (!userId || !canStartAction(reservation.id)) return;
    setCancelModalReservation(reservation);
    setCancelModalOwner({ userId, routeKey: route.key });
    setCancelReason('');
  }, [canStartAction, route.key, userId]);

  const closeCancelModal = useCallback(() => {
    setCancelModalReservation(null);
    setCancelModalOwner(null);
    setCancelReason('');
  }, []);

  useEffect(() => {
    closeCancelModal();
    setCancelSubmitting(false);
    setRefreshing(false);
  }, [closeCancelModal, route.key, userId]);

  const submitCancel = useCallback(async () => {
    if (
      !cancelModalReservation ||
      !cancelModalOwner ||
      cancelModalOwner.userId !== userId ||
      cancelModalOwner.routeKey !== route.key
    ) return;
    const action = beginAction(cancelModalReservation.id);
    if (!action) return;
    setCancelSubmitting(true);
    try {
      await api.post(`/api/reservations/${cancelModalReservation.id}/cancel`, {
        cancelReason: cancelReason.trim() || undefined,
      });
      if (!action.isCurrent()) return;
      closeCancelModal();
      await fetchReservations();
    } catch (error: unknown) {
      if (action.isCurrent()) {
        Alert.alert(t('common.error'), getApiErrorMessage(error, t('common.error')));
      }
    } finally {
      if (action.isCurrent()) setCancelSubmitting(false);
      action.finish();
    }
  }, [beginAction, cancelModalOwner, cancelModalReservation, cancelReason, closeCancelModal, fetchReservations, route.key, t, userId]);

  const handleConfirmAttendance = useCallback(async (reservation: Reservation) => {
    const action = beginAction(reservation.id);
    if (!action) return;
    try {
      await api.post(`/api/reservations/${reservation.id}/confirm-attendance`);
      if (!action.isCurrent()) return;
      await fetchReservations();
    } catch (error: unknown) {
      if (action.isCurrent()) {
        Alert.alert(t('common.error'), getApiErrorMessage(error, t('common.error')));
      }
    } finally {
      action.finish();
    }
  }, [beginAction, fetchReservations, t]);

  const handleAcceptReschedule = useCallback(async (reservation: Reservation) => {
    const action = beginAction(reservation.id);
    if (!action) return;
    try {
      await api.post(`/api/reservations/${reservation.id}/reschedule/accept`);
      if (!action.isCurrent()) return;
      await fetchReservations();
      if (action.isCurrent()) {
        Alert.alert(
          t('myReservations.rescheduleAcceptSuccessTitle'),
          t('myReservations.rescheduleAcceptSuccessMessage'),
        );
      }
    } catch (error: unknown) {
      if (action.isCurrent()) {
        Alert.alert(t('common.error'), getApiErrorMessage(error, t('common.error')));
      }
    } finally {
      action.finish();
    }
  }, [beginAction, fetchReservations, t]);

  const handleDeclineReschedule = useCallback((reservation: Reservation) => {
    if (!canStartAction(reservation.id)) return;
    const generation = actionIdentityRef.current.generation;
    Alert.alert(
      t('myReservations.rescheduleDeclineConfirmTitle'),
      t('myReservations.rescheduleDeclineConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('myReservations.rescheduleDecline'),
          style: 'destructive',
          onPress: async () => {
            if (!isCurrentActionIdentity(generation)) return;
            const action = beginAction(reservation.id);
            if (!action) return;
            try {
              await api.post(`/api/reservations/${reservation.id}/reschedule/decline`);
              if (!action.isCurrent()) return;
              await fetchReservations();
              if (action.isCurrent()) {
                Alert.alert(
                  t('myReservations.rescheduleDeclineTitle'),
                  t('myReservations.rescheduleDeclineMessage'),
                );
              }
            } catch (error: unknown) {
              if (action.isCurrent()) {
                Alert.alert(t('common.error'), getApiErrorMessage(error, t('common.error')));
              }
            } finally {
              action.finish();
            }
          },
        },
      ],
    );
  }, [beginAction, canStartAction, fetchReservations, isCurrentActionIdentity, t]);

  const sections: Section[] = [];
  const activeReservation = visibleReservations
    .filter((r) =>
      isUpcoming(r.reservationDate, r.endTime) &&
      !['COMPLETED', 'CANCELLED_BY_CLIENT', 'CANCELLED_BY_STYLISTS', 'NO_SHOW'].includes(r.status),
    )
    .sort((a, b) => getReservationStartTime(a) - getReservationStartTime(b))[0];

  const listSource = activeReservation
    ? visibleReservations.filter((r) => r.id !== activeReservation.id)
    : visibleReservations;
  const upcoming = listSource.filter((r) => isUpcoming(r.reservationDate, r.endTime) && !['COMPLETED', 'CANCELLED_BY_CLIENT', 'CANCELLED_BY_STYLISTS', 'NO_SHOW'].includes(r.status));
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

  const renderReservationCard = (item: Reservation, featured = false) => {
    const services = getReservationServices(item);
    const title = item.publicReferenceCode?.trim() || services[0]?.name || t('myReservations.reservationFallbackTitle');
    const estimatedCost = services.reduce(
      (sum, service) => sum + (Number(service.price) || 0),
      0,
    );
    const statusLabel =
      item.status === 'CANCELLED_BY_CLIENT' &&
      (item.cancelReason ?? '').trim() === ATTENDANCE_UNCONFIRMED_CANCEL_REASON
        ? t('myReservations.cancelledForAttendance')
        : t(`myReservations.status.${item.status}` as any);

    return (
    <View>
      <Card style={[styles.card, featured ? styles.featuredCard : undefined]}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.navigate('ReservationDetail', { reservationId: item.id })}
          accessibilityRole="button"
          accessibilityLabel={t('reservationDetail.title')}
        >
        <View style={styles.cardHeader}>
          <Text style={[styles.serviceName, { color: colors.text }]}>
            {title}
          </Text>
          <Badge
            label={statusLabel}
            variant={getStatusVariant(item.status)}
            status={item.status}
          />
        </View>

        <View style={styles.cardBody}>
          {services.length > 0 ? (
            <View style={styles.servicesList}>
              {services.map((service) => (
                <View key={service.id} style={styles.infoRow}>
                  <Ionicons name="cut-outline" size={16} color={colors.textSecondary} />
                  <Text style={[styles.infoText, { color: colors.text }]}>
                    {service.name}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
          {estimatedCost > 0 ? (
            <View style={styles.estimateBlock}>
              <View style={styles.infoRow}>
                <Ionicons name="cash-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.infoText, { color: colors.text }]}>
                  {t('myReservations.estimatedCost', { amount: estimatedCost.toFixed(2) })}
                </Text>
              </View>
              <Text style={[styles.estimateHint, { color: colors.textMuted }]}>
                {t('myReservations.estimatedCostHint')}
              </Text>
            </View>
          ) : null}
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
                {t('myReservations.reschedulePending')}
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
        </TouchableOpacity>

        <View style={[styles.actions, { borderTopColor: colors.borderLight }]}>
          {item.rescheduleStatus === 'PENDING' && (
            <>
              <Button
                title={t('myReservations.rescheduleAccept')}
                onPress={() => handleAcceptReschedule(item)}
                size="sm"
                variant="primary"
              />
              <Button
                title={t('myReservations.rescheduleDecline')}
                onPress={() => handleDeclineReschedule(item)}
                size="sm"
                variant="ghost"
                textStyle={{ color: colors.error }}
              />
            </>
          )}
          {canConfirmAttendance(item) && (
            <View style={{ gap: 6 }}>
              <Button
                title={t('myReservations.confirmAttendance')}
                onPress={() => handleConfirmAttendance(item)}
                size="sm"
                variant="primary"
              />
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                {t('myReservations.confirmAttendanceHint', {
                  hours: getAttendanceConfirmHours(item),
                })}
              </Text>
            </View>
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
    </View>
    );
  };

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
          {loadError ? (
            <Card style={[styles.featuredCtaCard, { borderColor: colors.border }]}>
              <Text style={[styles.featuredCtaTitle, { color: colors.text }]}>
                {t('reservation.listLoadErrorTitle')}
              </Text>
              <Text style={[styles.featuredCtaDesc, { color: colors.textSecondary }]}>
                {visibleReservations.length > 0 ? t('reservation.staleListMessage') : t('reservation.listLoadErrorMessage')}
              </Text>
              <Button title={t('common.retry')} onPress={() => void fetchReservations()} size="sm" variant="outline" />
            </Card>
          ) : null}
          {(!loadError || visibleReservations.length > 0) ? activeReservation ? (
            <View style={styles.featuredWrap}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                {t('myReservations.activeTitle')}
              </Text>
              {renderReservationCard(activeReservation, true)}
            </View>
          ) : (
            <Card style={styles.featuredCtaCard}>
              <Text style={[styles.featuredCtaTitle, { color: colors.text }]}>
                {t('myReservations.noActiveTitle')}
              </Text>
              <Text style={[styles.featuredCtaDesc, { color: colors.textSecondary }]}>
                {t('myReservations.noActiveMessage')}
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
          ) : null}
        </View>
      }
      ListEmptyComponent={
        !loadError && !activeReservation ? (
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

    <Modal
      visible={
        !!cancelModalReservation &&
        !!cancelModalOwner &&
        cancelModalOwner.userId === userId &&
        cancelModalOwner.routeKey === route.key
      }
      animationType="slide"
      transparent
    >
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
  servicesList: { gap: spacing.xs, marginBottom: spacing.xs },
  estimateBlock: { gap: 2, marginBottom: spacing.xs },
  estimateHint: { fontSize: 12, lineHeight: 16, marginLeft: 24 },
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
