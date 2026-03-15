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
import { useTheme } from '../../hooks/useTheme';
import { useStylistProfile } from '../../hooks/useStylistProfile';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import api from '../../services/api';
import { spacing } from '../../theme';
import { formatDate, formatTime } from '../../utils/date';
import type { Reservation, StylistResponse } from '../../types';

function getMyResponse(reservation: Reservation, profileId: string): StylistResponse | undefined {
  return reservation.stylistResponses?.find((r) => r.stylistProfileId === profileId);
}

export function StylistInboxScreen() {
  const { colors } = useTheme();
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

  const handleAccept = useCallback(
    async (reservationId: string) => {
      if (!profileId) return;
      setActingId(reservationId);
      try {
        await api.post(`/api/reservations/${reservationId}/stylist/${profileId}/accept`);
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
      contentContainerStyle={[styles.list, pending.length === 0 && styles.emptyList]}
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
        const isLockedByMe = item.status === 'STYLIST_REVIEW' && myResponse?.status === 'LOCKED';
        const canLock = item.status === 'PENDING';
        const acting = actingId === item.id;

        return (
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={[styles.serviceName, { color: colors.text }]}>
                {item.service?.name ?? 'Usluga'}
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
              <Text style={[styles.client, { color: colors.textSecondary }]}>
                {item.client.firstName} {item.client.lastName}
              </Text>
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
              {canLock && (
                <Button
                  title="Zaključaj"
                  onPress={() => handleLock(item.id)}
                  loading={acting}
                  variant="outline"
                  size="sm"
                />
              )}
              {isLockedByMe && (
                <>
                  <Button
                    title="Prihvati"
                    onPress={() => handleAccept(item.id)}
                    loading={acting}
                    size="sm"
                    style={styles.actionBtn}
                  />
                  <Button
                    title="Odbij"
                    onPress={() => handleReject(item.id)}
                    loading={acting}
                    variant="ghost"
                    textStyle={{ color: colors.error }}
                    size="sm"
                  />
                </>
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
  date: { fontSize: 14 },
  notes: { fontSize: 13, marginTop: spacing.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.sm, alignItems: 'center' },
  actionBtn: { marginRight: 4 },
});
