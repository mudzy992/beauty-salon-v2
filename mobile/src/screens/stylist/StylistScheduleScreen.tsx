import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  SectionList,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useStylistProfile } from '../../hooks/useStylistProfile';
import { Card } from '../../components/ui/Card';
import { Badge, getStatusVariant } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import api from '../../services/api';
import { spacing } from '../../theme';
import { useTranslation } from 'react-i18next';
import { formatDate, formatTime } from '../../utils/date';
import type { Reservation, DailyLogEntry } from '../../types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { StylistScheduleStackParamList } from '../../navigation/types';

type Section = { title: string; data: Reservation[] };

type Props = NativeStackScreenProps<StylistScheduleStackParamList, 'ScheduleList'>;

export function StylistScheduleScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { profileId, loading: profileLoading } = useStylistProfile();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const sections: Section[] = React.useMemo(() => {
    const byDate: Record<string, Reservation[]> = {};
    for (const r of reservations) {
      const d = r.reservationDate.slice(0, 10);
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push(r);
    }
    for (const arr of Object.values(byDate)) {
      const statusOrder: Record<string, number> = {
        IN_PROGRESS: 0,
        ATTENDANCE_CONFIRMED: 1,
        CONFIRMED: 2,
        STYLIST_REVIEW: 3,
        PENDING: 4,
        COMPLETED: 5,
        CANCELLED_BY_CLIENT: 6,
        CANCELLED_BY_STYLISTS: 7,
        NO_SHOW: 8,
      };
      arr.sort((a, b) => {
        const ao = statusOrder[a.status] ?? 99;
        const bo = statusOrder[b.status] ?? 99;
        if (ao !== bo) return ao - bo;
        return a.startTime < b.startTime ? -1 : 1;
      });
    }
    const sortedDates = Object.keys(byDate).sort();
    return sortedDates.map((date) => ({
      title: formatDate(date),
      data: byDate[date],
    }));
  }, [reservations]);

  const activeReservation = React.useMemo(() => {
    return (
      reservations.find(
        (r) => r.status === 'IN_PROGRESS' && r.confirmedStylistId === profileId,
      ) ?? null
    );
  }, [reservations, profileId]);

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
        ListHeaderComponent={
          activeReservation ? (
            <Card style={[styles.card, { borderWidth: 1, borderColor: colors.primary }]}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() =>
                  navigation.navigate('StylistReservationDetail', {
                    reservationId: activeReservation.id,
                  })
                }
              >
                <View style={styles.row}>
                  <Text style={[styles.time, { color: colors.text }]}>
                    Aktivno: {formatTime(activeReservation.startTime)} – {formatTime(activeReservation.endTime)}
                  </Text>
                  <Badge
                    label={t(`myReservations.status.${activeReservation.status}` as any)}
                    variant={getStatusVariant(activeReservation.status)}
                    status={activeReservation.status}
                  />
                </View>
                <Text style={[styles.serviceName, { color: colors.text }]}>
                  {activeReservation.service?.name ?? 'Usluga'}
                </Text>
                {activeReservation.client && (
                  <Text style={[styles.client, { color: colors.textSecondary }]}>
                    {activeReservation.client.firstName} {activeReservation.client.lastName}
                  </Text>
                )}
              </TouchableOpacity>
            </Card>
          ) : null
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
              onPress={() =>
                navigation.navigate('StylistReservationDetail', {
                  reservationId: item.id,
                })
              }
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
            </TouchableOpacity>
          </Card>
        )}
      />
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
});
