import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useFloatingTabBarTotalHeight } from '../../navigation/FloatingTabBar';
import { useTheme } from '../../hooks/useTheme';
import { useStylistProfile } from '../../hooks/useStylistProfile';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import api from '../../services/api';
import { spacing } from '../../theme';
import { useReservationSocketRefresh } from '../../hooks/useReservationSocketRefresh';
import type { DailyLogEntry, Reservation } from '../../types';
import { getServiceAmount, getSettledDebtsSum, getTipAmount } from './daily-log-display';
import { getCalendarMonthRange, getSalonMonthLabel } from '../../utils/date';

export function StylistStatsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const tabBarBottom = useFloatingTabBarTotalHeight();
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
      const { fromDate, toDate } = getCalendarMonthRange(now);
      const [resRes, logRes] = await Promise.all([
        api.get<Reservation[]>('/api/reservations', {
          params: {
            asStylist: true,
            fromDate: fromDate,
            toDate: toDate,
          },
        }),
        api.get<DailyLogEntry[]>('/api/daily-log', {
          params: {
            stylistProfileId: profileId,
            fromDate: fromDate,
            toDate: toDate,
          },
        }),
      ]);
      setReservations(Array.isArray(resRes.data) ? resRes.data : []);
      setDailyLog(Array.isArray(logRes.data) ? logRes.data : []);
    } catch {
      setReservations([]);
      setDailyLog([]);
    }
    setLoading(false);
  }, [profileId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useReservationSocketRefresh(fetchData);

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
  const serviceRevenue = completedLogEntries.reduce(
    (sum, e) => sum + getServiceAmount(e),
    0,
  );
  const totalTips = completedLogEntries.reduce(
    (sum, e) => sum + getTipAmount(e),
    0,
  );
  const totalDebts = completedLogEntries.reduce(
    (sum, e) => sum + getSettledDebtsSum(e),
    0,
  );
  const totalRevenue = serviceRevenue + totalTips + totalDebts;

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
          title={t('stylist.stats.noProfileTitle')}
          message={t('stylist.stats.noProfileMessage')}
        />
      </View>
    );
  }

  const monthLabel = getSalonMonthLabel();

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: spacing.xl + tabBarBottom }]}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <Text style={[styles.period, { color: colors.textSecondary }]}>{monthLabel}</Text>

      <Card style={styles.card}>
        <Text style={[styles.statValue, { color: colors.primary }]}>{completedReservations.length}</Text>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
          {t('stylist.stats.completedReservations')}
        </Text>
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.statValue, { color: colors.primary }]}>{confirmedUpcoming.length}</Text>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
          {t('stylist.stats.upcomingConfirmed')}
        </Text>
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.statValue, { color: colors.primary }]}>
          {totalRevenue.toFixed(2)} KM
        </Text>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
          {t('stylist.stats.totalRevenue')}
        </Text>
        <View style={[styles.breakdown, { borderTopColor: colors.borderLight }]}>
          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>
              {t('stylist.stats.serviceRevenue')}
            </Text>
            <Text style={[styles.breakdownValue, { color: colors.text }]}>
              {serviceRevenue.toFixed(2)} KM
            </Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>
              {t('stylist.stats.tips')}
            </Text>
            <Text style={[styles.breakdownValue, { color: colors.text }]}>
              {totalTips.toFixed(2)} KM
            </Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>
              {t('stylist.stats.debts')}
            </Text>
            <Text style={[styles.breakdownValue, { color: colors.text }]}>
              {totalDebts.toFixed(2)} KM
            </Text>
          </View>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.md },
  period: { fontSize: 14, marginBottom: spacing.md, textTransform: 'capitalize' },
  card: { marginBottom: spacing.sm },
  statValue: { fontSize: 28, fontWeight: '700', fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 14, marginTop: 4 },
  breakdown: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: { fontSize: 13 },
  breakdownValue: { fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
