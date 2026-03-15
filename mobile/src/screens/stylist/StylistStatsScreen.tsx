import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useStylistProfile } from '../../hooks/useStylistProfile';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import api from '../../services/api';
import { spacing } from '../../theme';
import type { Reservation, DailyLogEntry } from '../../types';

export function StylistStatsScreen() {
  const { colors } = useTheme();
  const { profileId, loading: profileLoading } = useStylistProfile();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [dailyLog, setDailyLog] = useState<DailyLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!profileId) {
      setLoading(false);
      return;
    }
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const [resRes, logRes] = await Promise.all([
        api.get<Reservation[]>('/api/reservations', {
          params: {
            asStylist: true,
            fromDate: startOfMonth.toISOString().slice(0, 10),
            toDate: endOfMonth.toISOString().slice(0, 10),
          },
        }),
        api.get<DailyLogEntry[]>('/api/daily-log', {
          params: {
            stylistProfileId: profileId,
            fromDate: startOfMonth.toISOString().slice(0, 10),
            toDate: endOfMonth.toISOString().slice(0, 10),
          },
        }),
      ]);
      setReservations(resRes.data);
      setDailyLog(logRes.data);
    } catch {
      setReservations([]);
      setDailyLog([]);
    }
    setLoading(false);
  }, [profileId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const completedReservations = reservations.filter((r) => r.status === 'COMPLETED');
  const confirmedUpcoming = reservations.filter(
    (r) =>
      r.status === 'CONFIRMED' || r.status === 'ATTENDANCE_CONFIRMED' || r.status === 'IN_PROGRESS',
  );
  const completedLogEntries = dailyLog.filter((e) => e.status === 'COMPLETED');
  const totalRevenue = completedLogEntries.reduce((sum, e) => sum + Number(e.actualPrice), 0);
  const totalTips = completedLogEntries.reduce((sum, e) => sum + Number(e.tipAmount), 0);

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
          icon="stats-chart-outline"
          title="Nema profila"
          message="Profil stilista nije pronađen."
        />
      </View>
    );
  }

  const monthLabel = new Date().toLocaleDateString('bs-BA', { month: 'long', year: 'numeric' });

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <Text style={[styles.period, { color: colors.textSecondary }]}>{monthLabel}</Text>

      <Card style={styles.card}>
        <Text style={[styles.statValue, { color: colors.primary }]}>{completedReservations.length}</Text>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Završene rezervacije (mjesec)</Text>
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.statValue, { color: colors.primary }]}>{confirmedUpcoming.length}</Text>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Predstojeći potvrđeni termini</Text>
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.statValue, { color: colors.primary }]}>
          {totalRevenue.toFixed(2)} KM
        </Text>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Ukupan prihod (dnevna knjiga, mjesec)</Text>
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.statValue, { color: colors.primary }]}>
          {totalTips.toFixed(2)} KM
        </Text>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Napojnice (mjesec)</Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  period: { fontSize: 14, marginBottom: spacing.md, textTransform: 'capitalize' },
  card: { marginBottom: spacing.sm },
  statValue: { fontSize: 28, fontWeight: '700' },
  statLabel: { fontSize: 14, marginTop: 4 },
});
