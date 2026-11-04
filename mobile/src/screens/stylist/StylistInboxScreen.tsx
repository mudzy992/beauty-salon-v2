import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
  AlertButton,
} from 'react-native';
import { useFloatingTabBarTotalHeight } from '../../navigation/FloatingTabBar';
import { useTheme } from '../../hooks/useTheme';
import { useStylistProfile } from '../../hooks/useStylistProfile';
import { useAuthStore } from '../../store/authStore';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { useReservationSocketRefresh } from '../../hooks/useReservationSocketRefresh';
import { useSocket } from '../../realtime/SocketContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import api from '../../services/api';
import { fetchAllReservationPages } from '../../services/reservation-list';
import { spacing } from '../../theme';
import { formatDate, formatTime, getSalonDateOnly } from '../../utils/date';
import { getReservationServicesLabel } from '../../utils/reservationServices';
import type { Reservation, StylistResponse } from '../../types';
import { normalizeClientDebts, normalizeReservations } from '../../utils/apiPayload';
import { getApiErrorMessage } from '../../utils/apiError';

function getMyResponse(reservation: Reservation, profileId: string): StylistResponse | undefined {
  return reservation.stylistResponses?.find((r) => r.stylistProfileId === profileId);
}

export function StylistInboxScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const tabBarBottom = useFloatingTabBarTotalHeight();
  const { connected: socketConnected } = useSocket();
  const {
    profileId,
    loading: profileLoading,
    loadError: profileLoadError,
    refetch: refetchProfile,
  } = useStylistProfile();
  const userId = useAuthStore((state) => state.user?.id);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [reservationsOwner, setReservationsOwner] = useState<{ userId: string; profileId: string } | null>(null);
  const visibleReservations =
    reservationsOwner !== null &&
    reservationsOwner.userId === userId &&
    reservationsOwner.profileId === profileId
      ? reservations
      : [];
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const requestGeneration = useRef(0);
  const requestIdentityRef = useRef({ userId, profileId });
  if (requestIdentityRef.current.userId !== userId || requestIdentityRef.current.profileId !== profileId) {
    requestIdentityRef.current = { userId, profileId };
    requestGeneration.current += 1;
  }
  const actionIdentityRef = useRef({ userId, profileId, generation: 0, mounted: true });
  if (actionIdentityRef.current.userId !== userId || actionIdentityRef.current.profileId !== profileId) {
    actionIdentityRef.current = {
      userId,
      profileId,
      generation: actionIdentityRef.current.generation + 1,
      mounted: actionIdentityRef.current.mounted,
    };
  }
  const activeActionIdRef = useRef<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const isCurrentIdentity = useCallback(() => {
    const current = actionIdentityRef.current;
    return (
      !!userId &&
      current.mounted &&
      current.userId === userId &&
      current.profileId === profileId &&
      useAuthStore.getState().user?.id === userId
    );
  }, [profileId, userId]);

  const beginAction = useCallback((reservationId: string) => {
    if (!profileId || !isCurrentIdentity() || activeActionIdRef.current) return null;
    const generation = actionIdentityRef.current.generation;
    activeActionIdRef.current = reservationId;
    setActingId(reservationId);
    return () =>
      isCurrentIdentity() &&
      actionIdentityRef.current.generation === generation &&
      activeActionIdRef.current === reservationId;
  }, [isCurrentIdentity, profileId]);

  const finishAction = useCallback((reservationId: string, isCurrentAction: () => boolean) => {
    if (!isCurrentAction() || activeActionIdRef.current !== reservationId) return;
    activeActionIdRef.current = null;
    setActingId(null);
  }, []);

  useEffect(() => {
    actionIdentityRef.current.mounted = true;
    return () => {
      actionIdentityRef.current.mounted = false;
      actionIdentityRef.current.generation += 1;
      activeActionIdRef.current = null;
      requestGeneration.current += 1;
    };
  }, []);

  useEffect(() => {
    activeActionIdRef.current = null;
    setActingId(null);
    setRefreshing(false);
  }, [profileId, userId]);

  const fetchReservations = useCallback(async () => {
    const generation = ++requestGeneration.current;
    const requestedUserId = userId;
    const requestedProfileId = profileId;
    const isCurrentRequest = () =>
      generation === requestGeneration.current &&
      isCurrentIdentity() &&
      requestIdentityRef.current.userId === requestedUserId &&
      requestIdentityRef.current.profileId === requestedProfileId;
    if (!profileId) {
      if (!isCurrentRequest()) return;
      setReservations([]);
      setReservationsOwner(null);
      setLoadError(false);
      setLoading(false);
      return;
    }
    try {
      const data = await fetchAllReservationPages<unknown>({ asStylist: true });
      if (!isCurrentRequest()) return;
      const rows = normalizeReservations(data);
      if (!rows) setLoadError(true);
      else {
        setReservations(rows);
        setReservationsOwner({ userId: requestedUserId!, profileId });
        setLoadError(false);
      }
    } catch {
      if (isCurrentRequest()) setLoadError(true);
    } finally {
      if (isCurrentRequest()) setLoading(false);
    }
  }, [isCurrentIdentity, profileId, userId]);

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
    if (!isCurrentIdentity()) return;
    setRefreshing(true);
    try {
      await Promise.all([refreshReservations(), refetchProfile()]);
    } finally {
      if (isCurrentIdentity()) setRefreshing(false);
    }
  }, [isCurrentIdentity, refreshReservations, refetchProfile]);

  const pending = visibleReservations.filter(
    (r) => r.status === 'PENDING' || r.status === 'STYLIST_REVIEW',
  );

  const handleLock = useCallback(
    async (reservationId: string) => {
      if (!profileId) return;
      const isCurrentAction = beginAction(reservationId);
      if (!isCurrentAction) return;
      try {
        await api.post(`/api/reservations/${reservationId}/stylist/${profileId}/lock`);
        if (!isCurrentAction()) return;
        await fetchReservations();
      } catch (err: unknown) {
        if (!isCurrentAction()) return;
        Alert.alert(
          t('common.error'),
          getApiErrorMessage(err, t('stylist.inbox.lockErrorFallback')),
        );
      } finally {
        finishAction(reservationId, isCurrentAction);
      }
    },
    [beginAction, finishAction, profileId, fetchReservations, t],
  );

  const handleUnlock = useCallback(
    async (reservationId: string) => {
      if (!profileId) return;
      const isCurrentAction = beginAction(reservationId);
      if (!isCurrentAction) return;
      try {
        await api.post(`/api/reservations/${reservationId}/stylist/${profileId}/unlock`);
        if (!isCurrentAction()) return;
        await fetchReservations();
      } catch (err: unknown) {
        if (!isCurrentAction()) return;
        Alert.alert(
          t('common.error'),
          getApiErrorMessage(err, t('stylist.inbox.unlockErrorFallback')),
        );
      } finally {
        finishAction(reservationId, isCurrentAction);
      }
    },
    [beginAction, finishAction, profileId, fetchReservations, t],
  );

  const handleAccept = useCallback(
    async (reservation: Reservation) => {
      if (!profileId) return;
      const isCurrentAction = beginAction(reservation.id);
      if (!isCurrentAction) return;
      try {
        const confirmDebtWarning = (message: string) => new Promise<boolean>((resolve) => {
          Alert.alert(
            t('stylist.inbox.clientDebtTitle'),
            message,
            [
              { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
              { text: t('stylist.inbox.clientDebtAcceptAnyway'), onPress: () => resolve(true) },
            ],
            { cancelable: false },
          );
        });
        let debtCheckResolved = false;
        while (!debtCheckResolved) {
          try {
            const { data } = await api.get<unknown>('/api/client-debts', {
              params: { clientId: reservation.clientId },
            });
            if (!isCurrentAction()) return;
            const list = normalizeClientDebts(data);
            if (!list) throw new Error('Invalid client debt response');
            if (list.length > 0) {
              const mine = list.filter((d) => d.stylistProfileId === profileId);
              const others = list.filter((d) => d.stylistProfileId !== profileId);
              const lines: string[] = [];
              if (mine.length > 0) {
                const first = mine[0];
                const serviceSuffix = first.service?.name ? ` (${first.service.name})` : '';
                lines.push(
                  t('stylist.inbox.clientDebtByMe', {
                    serviceSuffix,
                    date: first.createdAt.slice(0, 10),
                  }),
                );
              }
              if (others.length > 0) {
                const d = others[0];
                const stylistName = d.stylistProfile?.user
                  ? `${d.stylistProfile.user.firstName} ${d.stylistProfile.user.lastName}`.trim()
                  : t('stylist.inbox.otherStylist');
                const serviceSuffix = d.service?.name ? ` (${d.service.name})` : '';
                lines.push(
                  t('stylist.inbox.clientDebtByOther', {
                    stylistName,
                    serviceSuffix,
                    date: d.createdAt.slice(0, 10),
                  }),
                );
              }
              if (lines.length > 0) {
                const confirmed = await confirmDebtWarning(lines.join('\n'));
                if (!isCurrentAction()) return;
                if (!confirmed) return;
              }
            }
            debtCheckResolved = true;
          } catch {
            if (!isCurrentAction()) return;
            const decision = await new Promise<'cancel' | 'retry' | 'continue'>((resolve) => {
              Alert.alert(
                t('stylist.inbox.clientDebtCheckErrorTitle'),
                t('stylist.inbox.clientDebtCheckErrorMessage'),
                [
                  { text: t('common.cancel'), style: 'cancel', onPress: () => resolve('cancel') },
                  { text: t('common.retry'), onPress: () => resolve('retry') },
                  {
                    text: t('stylist.inbox.clientDebtContinueWithoutCheck'),
                    onPress: () => resolve('continue'),
                  },
                ],
                { cancelable: false },
              );
            });
            if (!isCurrentAction()) return;
            if (decision === 'cancel') return;
            if (decision === 'continue') debtCheckResolved = true;
          }
        }

        await api.post(`/api/reservations/${reservation.id}/stylist/${profileId}/accept`);
        if (!isCurrentAction()) return;
        await fetchReservations();
      } catch (err: unknown) {
        if (!isCurrentAction()) return;
        Alert.alert(
          t('common.error'),
          getApiErrorMessage(err, t('stylist.inbox.acceptErrorFallback')),
        );
      } finally {
        finishAction(reservation.id, isCurrentAction);
      }
    },
    [beginAction, fetchReservations, finishAction, profileId, t],
  );

  const doReject = useCallback(
    async (reservationId: string, rejectionReason?: string) => {
      if (!profileId) return;
      const isCurrentAction = beginAction(reservationId);
      if (!isCurrentAction) return;
      try {
        await api.post(`/api/reservations/${reservationId}/stylist/${profileId}/reject`, {
          rejectionReason: rejectionReason?.trim().slice(0, 500) || undefined,
        });
        if (!isCurrentAction()) return;
        await fetchReservations();
      } catch (err: unknown) {
        if (!isCurrentAction()) return;
        Alert.alert(
          t('common.error'),
          getApiErrorMessage(err, t('stylist.inbox.rejectErrorFallback')),
        );
      } finally {
        finishAction(reservationId, isCurrentAction);
      }
    },
    [beginAction, fetchReservations, finishAction, profileId, t],
  );

  const handleReject = useCallback(
    (reservationId: string) => {
      if (!profileId || !isCurrentIdentity()) return;
      Alert.alert(
        t('stylist.inbox.rejectConfirmTitle'),
        t('stylist.inbox.rejectConfirmMessage'),
        [
          { text: t('stylist.inbox.rejectCancel'), style: 'cancel' },
          {
            text: t('stylist.inbox.reject'),
            style: 'destructive',
            onPress: () => {
              if (isCurrentIdentity()) void doReject(reservationId, undefined);
            },
          },
        ],
      );
    },
    [doReject, isCurrentIdentity, profileId, t],
  );

  if (profileLoading || (loading && visibleReservations.length === 0)) {
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
          icon="person-outline"
          title={profileLoadError ? t('stylist.profile.profileLoadError') : t('stylist.inbox.noProfileTitle')}
          message={profileLoadError ? undefined : t('stylist.inbox.noProfileMessage')}
          actionLabel={profileLoadError ? t('stylist.profile.retryProfileLoad') : undefined}
          onAction={profileLoadError ? () => { void refetchProfile(); } : undefined}
        />
      </View>
    );
  }

  return (
    <FlatList
      data={pending}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[
        styles.list,
        pending.length === 0 && styles.emptyList,
        { paddingBottom: spacing.lg + tabBarBottom },
      ]}
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.background }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
      ListHeaderComponent={loadError && pending.length > 0 ? (
        <Card style={[styles.card, { borderColor: colors.border }]}>
          <Text style={{ color: colors.text, fontWeight: '700' }}>{t('stylist.inbox.loadErrorTitle')}</Text>
          <Text style={{ color: colors.textSecondary, marginTop: spacing.xs }}>{t('stylist.inbox.staleMessage')}</Text>
          <Button title={t('common.retry')} onPress={() => void fetchReservations()} variant="outline" size="sm" style={{ marginTop: spacing.sm }} />
        </Card>
      ) : null}
      ListEmptyComponent={loadError ? (
        <EmptyState
          icon="cloud-offline-outline"
          title={t('stylist.inbox.loadErrorTitle')}
          message={t('stylist.inbox.loadErrorMessage')}
          actionLabel={t('common.retry')}
          onAction={() => void fetchReservations()}
        />
      ) : (
        <EmptyState
          icon="calendar-outline"
          title={t('stylist.inbox.emptyTitle')}
          message={t('stylist.inbox.emptyMessage')}
        />
      )}
      renderItem={({ item }) => {
        const myResponse = getMyResponse(item, profileId);
        const lockActive =
          myResponse?.status === 'LOCKED' &&
          (!myResponse.lockExpiresAt || new Date(myResponse.lockExpiresAt).getTime() > Date.now());
        const isLockedByMe = lockActive;
        const lockedByOther =
          item.status === 'STYLIST_REVIEW' &&
          !isLockedByMe &&
          (item.stylistResponses ?? []).some(
            (x) =>
              x.stylistProfileId !== profileId &&
              x.status === 'LOCKED' &&
              (!x.lockExpiresAt || new Date(x.lockExpiresAt).getTime() > Date.now()),
          );
        const canLock =
          !isLockedByMe &&
          !lockedByOther &&
          !myResponse?.hasLockedOnce &&
          myResponse?.status !== 'REJECTED';
        const canAccept = !lockedByOther && (isLockedByMe || !!myResponse?.hasLockedOnce);
        const acting = actingId === item.id;

        return (
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={[styles.serviceName, { color: colors.text }]}>
                {getReservationServicesLabel(item)}
              </Text>
              <Badge
                label={
                  item.status === 'STYLIST_REVIEW'
                    ? isLockedByMe
                      ? t('stylist.inbox.statusReviewSelf')
                      : t('stylist.inbox.statusReview')
                    : t('stylist.inbox.statusPending')
                }
                variant={item.status === 'STYLIST_REVIEW' ? 'info' : 'warning'}
                status={item.status}
              />
            </View>
            {item.client && (
              <View style={styles.clientRow}>
                <Text style={[styles.client, { color: colors.textSecondary }]}>
                  {item.client.firstName} {item.client.lastName}
                </Text>
                {(() => {
                  const rec = item.client?.cancellationCount?.[0];
                  const count = rec?.cancellationCount ?? 0;
                  const until = rec?.penaltyUntil ? new Date(rec.penaltyUntil) : null;
                  const isPenalized = !!until && until.getTime() > Date.now();
                  return (
                    <>
                      {count > 0 ? (
                        <Badge
                          label={`CXL: ${count}`}
                          variant="warning"
                          status={'CANCELLED_BY_CLIENT' as any}
                        />
                      ) : null}
                      {isPenalized ? (
                        <Badge
                          label={`PENAL do ${getSalonDateOnly(until!)}`}
                          variant="error"
                          status={'NO_SHOW' as any}
                        />
                      ) : null}
                    </>
                  );
                })()}
              </View>
            )}
            <Text style={[styles.date, { color: colors.textSecondary }]}>
              {formatDate(item.reservationDate)} · {formatTime(item.startTime)}
            </Text>
            {item.clientNotes && (
              <Text style={[styles.notes, { color: colors.textMuted }]} numberOfLines={2}>
                {item.clientNotes}
              </Text>
            )}
            <View style={styles.actions}>
              {lockedByOther ? (
                <Text style={[styles.notes, { color: colors.textMuted }]}>
                  {t('stylist.inbox.lockedByOtherMessage')}
                </Text>
              ) : null}
              {canLock && (
                <Button
                  title={t('stylist.inbox.lock')}
                  onPress={() => handleLock(item.id)}
                  loading={acting}
                  variant="outline"
                  size="sm"
                />
              )}
              {canAccept && (
                <Button
                  title={t('stylist.inbox.accept')}
                  onPress={() => handleAccept(item)}
                  loading={acting}
                  size="sm"
                  style={styles.actionBtn}
                />
              )}
              {isLockedByMe && (
                <Button
                  title={t('stylist.inbox.unlock')}
                  onPress={() => handleUnlock(item.id)}
                  loading={acting}
                  variant="outline"
                  size="sm"
                />
              )}
              {(isLockedByMe || canAccept) && (
                <Button
                  title={t('stylist.inbox.reject')}
                  onPress={() => handleReject(item.id)}
                  loading={acting}
                  variant="ghost"
                  textStyle={{ color: colors.error }}
                  size="sm"
                />
              )}
            </View>
          </Card>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: spacing.md },
  emptyList: { flex: 1 },
  card: { marginBottom: spacing.sm },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  serviceName: { fontSize: 16, fontWeight: '600', flex: 1, marginRight: spacing.sm },
  client: { fontSize: 13, marginBottom: 2 },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  date: { fontSize: 14 },
  notes: { fontSize: 13, marginTop: spacing.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.sm, alignItems: 'center' },
  actionBtn: { marginRight: 4 },
});
