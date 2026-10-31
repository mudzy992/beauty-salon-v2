import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Pressable } from 'react-native';
import { useFloatingTabBarTotalHeight } from '../../navigation/FloatingTabBar';
import { useTheme } from '../../hooks/useTheme';
import { useStylistProfile } from '../../hooks/useStylistProfile';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import api from '../../services/api';
import { spacing } from '../../theme';
import { useReservationSocketRefresh } from '../../hooks/useReservationSocketRefresh';
import type { DailyLogEntry, Reservation } from '../../types';
import { normalizeDailyLogEntries, normalizeReservations } from '../../utils/apiPayload';
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
  const [reservationsLoaded, setReservationsLoaded] = useState(false);
  const [dailyLogLoaded, setDailyLogLoaded] = useState(false);
  const [reservationsOwnerId, setReservationsOwnerId] = useState<string | null>(null);
  const [dailyLogOwnerId, setDailyLogOwnerId] = useState<string | null>(null);
  const [reservationsError, setReservationsError] = useState(false);
  const [dailyLogError, setDailyLogError] = useState(false);
  const requestGeneration = useRef(0);

  const fetchData = useCallback(async () => {
    const generation = ++requestGeneration.current;
    if (!profileId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { fromDate, toDate } = getCalendarMonthRange(new Date());
    const loadReservations = async () => {
      try {
        const { data } = await api.get<unknown>('/api/reservations', {
          params: { asStylist: true, fromDate, toDate },
        });
        const parsed = normalizeReservations(data);
        if (!Array.isArray(data) || !parsed || parsed.length !== data.length) {
          throw new Error('Invalid reservations payload');
        }
        if (generation !== requestGeneration.current) return;
        setReservations(parsed);
        setReservationsLoaded(true);
        setReservationsOwnerId(profileId);
        setReservationsError(false);
      } catch {
        if (generation === requestGeneration.current) setReservationsError(true);
      }
    };
    const loadDailyLog = async () => {
      try {
        const { data } = await api.get<unknown>('/api/daily-log', {
          params: { stylistProfileId: profileId, fromDate, toDate },
        });
        const parsed = normalizeDailyLogEntries(data);
        if (!Array.isArray(data) || !parsed || parsed.length !== data.length) {
          throw new Error('Invalid daily-log payload');
        }
        if (generation !== requestGeneration.current) return;
        setDailyLog(parsed);
        setDailyLogLoaded(true);
        setDailyLogOwnerId(profileId);
        setDailyLogError(false);
      } catch {
        if (generation === requestGeneration.current) setDailyLogError(true);
      }
    };
    await Promise.all([loadReservations(), loadDailyLog()]);
    if (generation === requestGeneration.current) setLoading(false);
  }, [profileId]);

  useEffect(() => {
    requestGeneration.current += 1;
    setReservations([]);
    setDailyLog([]);
    setReservationsLoaded(false);
    setDailyLogLoaded(false);
    setReservationsOwnerId(null);
    setDailyLogOwnerId(null);
    setReservationsError(false);
    setDailyLogError(false);
    setLoading(Boolean(profileId));
    if (profileId) void fetchData();
    return () => {
      requestGeneration.current += 1;
    };
  }, [fetchData, profileId]);

  useReservationSocketRefresh(fetchData);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchData();
    } finally {
      setRefreshing(false);
    }
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
  const hasReservationsData = reservationsLoaded && reservationsOwnerId === profileId;
  const hasDailyLogData = dailyLogLoaded && dailyLogOwnerId === profileId;

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

      {loading && !hasReservationsData && !hasDailyLogData ? (
        <ActivityIndicator size="small" color={colors.primary} style={styles.loading} />
      ) : null}
      {reservationsError ? (
        <View style={[styles.readNotice, { borderColor: colors.error }]} accessibilityRole="alert">
          <Text style={[styles.noticeText, { color: colors.error }]}>
            {t(hasReservationsData ? 'stylist.stats.reservationsStale' : 'stylist.stats.reservationsLoadError')}
          </Text>
          <Pressable
            onPress={() => { void fetchData(); }}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={t('stylist.stats.retry')}
            style={styles.retryButton}
          >
            <Text style={[styles.retryText, { color: colors.primary }]}>{t('stylist.stats.retry')}</Text>
          </Pressable>
        </View>
      ) : null}
      {dailyLogError ? (
        <View style={[styles.readNotice, { borderColor: colors.error }]} accessibilityRole="alert">
          <Text style={[styles.noticeText, { color: colors.error }]}>
            {t(hasDailyLogData ? 'stylist.stats.dailyLogStale' : 'stylist.stats.dailyLogLoadError')}
          </Text>
          <Pressable
            onPress={() => { void fetchData(); }}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={t('stylist.stats.retry')}
            style={styles.retryButton}
          >
            <Text style={[styles.retryText, { color: colors.primary }]}>{t('stylist.stats.retry')}</Text>
          </Pressable>
        </View>
      ) : null}

      <Card style={styles.card}>
        <Text style={[styles.statValue, { color: colors.primary }]}>
          {hasReservationsData ? completedReservations.length : '—'}
        </Text>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
          {t('stylist.stats.completedReservations')}
        </Text>
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.statValue, { color: colors.primary }]}>
          {hasReservationsData ? confirmedUpcoming.length : '—'}
        </Text>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
          {t('stylist.stats.upcomingConfirmed')}
        </Text>
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.statValue, { color: colors.primary }]}>
          {hasDailyLogData ? `${totalRevenue.toFixed(2)} KM` : '—'}
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
              {hasDailyLogData ? `${serviceRevenue.toFixed(2)} KM` : '—'}
            </Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>
              {t('stylist.stats.tips')}
            </Text>
            <Text style={[styles.breakdownValue, { color: colors.text }]}>
              {hasDailyLogData ? `${totalTips.toFixed(2)} KM` : '—'}
            </Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>
              {t('stylist.stats.debts')}
            </Text>
            <Text style={[styles.breakdownValue, { color: colors.text }]}>
              {hasDailyLogData ? `${totalDebts.toFixed(2)} KM` : '—'}
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
  loading: { marginBottom: spacing.md },
  readNotice: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  noticeText: { fontSize: 13 },
  retryButton: { alignSelf: 'flex-start', paddingVertical: spacing.xs },
  retryText: { fontSize: 14, fontWeight: '600' },
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
