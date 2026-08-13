import React, { useEffect, useState, useCallback } from 'react';
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
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { useReservationSocketRefresh } from '../../hooks/useReservationSocketRefresh';
import { useSocket } from '../../realtime/SocketContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import api from '../../services/api';
import { spacing } from '../../theme';
import { formatDate, formatTime } from '../../utils/date';
import { getReservationServicesLabel } from '../../utils/reservationServices';
import type { ClientDebt, Reservation, StylistResponse } from '../../types';

function getMyResponse(reservation: Reservation, profileId: string): StylistResponse | undefined {
  return reservation.stylistResponses?.find((r) => r.stylistProfileId === profileId);
}

export function StylistInboxScreen() {
  const { colors } = useTheme();
  const tabBarBottom = useFloatingTabBarTotalHeight();
  const { connected: socketConnected } = useSocket();
  const { profileId, loading: profileLoading, refetch: refetchProfile } = useStylistProfile();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const fetchReservations = useCallback(async () => {
    try {
      const { data } = await api.get<Reservation[]>('/api/reservations', {
        params: { asStylist: true },
      });
      setReservations(data);
    } catch {
      setReservations([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  useReservationSocketRefresh(fetchReservations);
  useAutoRefresh(fetchReservations, {
    intervalMs: 30000,
    connectedIntervalMs: 120000,
    isSocketConnected: socketConnected,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchReservations(), refetchProfile()]);
    setRefreshing(false);
  }, [fetchReservations, refetchProfile]);

  const pending = reservations.filter(
    (r) => r.status === 'PENDING' || r.status === 'STYLIST_REVIEW',
  );

  const handleLock = useCallback(
    async (reservationId: string) => {
      if (!profileId) return;
      setActingId(reservationId);
      try {
        await api.post(`/api/reservations/${reservationId}/stylist/${profileId}/lock`);
        await fetchReservations();
      } catch (err: unknown) {
        const msg =
          err && typeof err === 'object' && 'response' in err
            ? (err as any).response?.data?.message
            : 'Greška pri zaključavanju.';
        Alert.alert('Greška', Array.isArray(msg) ? msg[0] : msg);
      } finally {
        setActingId(null);
      }
    },
    [profileId, fetchReservations],
  );

  const handleUnlock = useCallback(
    async (reservationId: string) => {
      if (!profileId) return;
      setActingId(reservationId);
      try {
        await api.post(`/api/reservations/${reservationId}/stylist/${profileId}/unlock`);
        await fetchReservations();
      } catch (err: unknown) {
        const msg =
          err && typeof err === 'object' && 'response' in err
            ? (err as any).response?.data?.message
            : 'Greška pri oslobađanju.';
        Alert.alert('Greška', Array.isArray(msg) ? msg[0] : msg);
      } finally {
        setActingId(null);
      }
    },
    [profileId, fetchReservations],
  );

  const handleAccept = useCallback(
    async (reservation: Reservation) => {
      if (!profileId) return;
      setActingId(reservation.id);
      try {
        try {
          const { data } = await api.get<ClientDebt[]>('/api/client-debts', {
            params: { clientId: reservation.clientId },
          });
          const list = Array.isArray(data) ? data : [];
          if (list.length > 0) {
            const mine = list.filter((d) => d.stylistProfileId === profileId);
            const others = list.filter((d) => d.stylistProfileId !== profileId);
            const lines: string[] = [];
            if (mine.length > 0) {
              const first = mine[0];
              lines.push(
                `Klijent ima dugovanje kod vas${first.service?.name ? ` (${first.service.name})` : ''} od ${first.createdAt.slice(0, 10)}.`,
              );
            }
            if (others.length > 0) {
              const d = others[0];
              const stylistName = d.stylistProfile?.user
                ? `${d.stylistProfile.user.firstName} ${d.stylistProfile.user.lastName}`.trim()
                : 'drugog stiliste';
              lines.push(
                `Klijent ima dugovanje kod ${stylistName}${d.service?.name ? ` (${d.service.name})` : ''} od ${d.createdAt.slice(0, 10)}.`,
              );
            }
            if (lines.length > 0) Alert.alert('Dugovanje klijenta', lines.join('\n'));
          }
        } catch {
          // ignore - rezervacija se i dalje može prihvatiti
        }

        await api.post(`/api/reservations/${reservation.id}/stylist/${profileId}/accept`);
        await fetchReservations();
      } catch (err: unknown) {
        const msg =
          err && typeof err === 'object' && 'response' in err
            ? (err as any).response?.data?.message
            : 'Greška pri prihvatanju.';
        Alert.alert('Greška', Array.isArray(msg) ? msg[0] : msg);
      } finally {
        setActingId(null);
      }
    },
    [profileId, fetchReservations],
  );

  const handleReject = useCallback(
    (reservationId: string) => {
      if (!profileId) return;
      Alert.alert(
        'Odbij rezervaciju',
        'Želite odbiti ovu rezervaciju? Klijent će biti obaviješten.',
        [
          { text: 'Odustani', style: 'cancel' },
          { text: 'Odbij', style: 'destructive', onPress: () => doReject(reservationId, undefined) },
        ],
      );
    },
    [profileId],
  );

  const doReject = useCallback(
    async (reservationId: string, rejectionReason?: string) => {
      if (!profileId) return;
      setActingId(reservationId);
      try {
        await api.post(`/api/reservations/${reservationId}/stylist/${profileId}/reject`, {
          rejectionReason: rejectionReason?.trim().slice(0, 500) || undefined,
        });
        await fetchReservations();
      } catch (err: unknown) {
        const msg =
          err && typeof err === 'object' && 'response' in err
            ? (err as any).response?.data?.message
            : 'Greška pri odbijanju.';
        Alert.alert('Greška', Array.isArray(msg) ? msg[0] : msg);
      } finally {
        setActingId(null);
      }
    },
    [profileId, fetchReservations],
  );

  if (profileLoading || (loading && reservations.length === 0)) {
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
          title="Nema profila stilista"
          message="Vaš profil stilista nije pronađen. Obratite se administratoru."
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
      ListEmptyComponent={
        <EmptyState
          icon="calendar-outline"
          title="Nema novih zahtjeva"
          message="Rezervacije koje trebaju vaš odgovor (zaključaj → prihvati ili odbij) pojavit će se ovdje."
        />
      }
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
                      ? 'Na pregledu (vi)'
                      : 'Na pregledu'
                    : 'Na čekanju'
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
                          label={`PENAL do ${until!.toISOString().slice(0, 10)}`}
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
                  Drugi stilist trenutno razmatra ovaj zahtjev.
                </Text>
              ) : null}
              {canLock && (
                <Button
                  title="Zaključaj"
                  onPress={() => handleLock(item.id)}
                  loading={acting}
                  variant="outline"
                  size="sm"
                />
              )}
              {canAccept && (
                <Button
                  title="Prihvati"
                  onPress={() => handleAccept(item)}
                  loading={acting}
                  size="sm"
                  style={styles.actionBtn}
                />
              )}
              {isLockedByMe && (
                <Button
                  title="Oslobodi"
                  onPress={() => handleUnlock(item.id)}
                  loading={acting}
                  variant="outline"
                  size="sm"
                />
              )}
              {(isLockedByMe || canAccept) && (
                <Button
                  title="Odbij"
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
