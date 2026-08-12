import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useFloatingTabBarTotalHeight } from '../../navigation/FloatingTabBar';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useStylistProfile } from '../../hooks/useStylistProfile';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import api from '../../services/api';
import { spacing } from '../../theme';
import { formatDate } from '../../utils/date';
import type { DailyLogEntry } from '../../types';
import {
  endOfWeek,
  isSameDay,
  isWithinInterval,
  parseISO,
  startOfWeek,
  subWeeks,
} from 'date-fns';
import { useReservationSocketRefresh } from '../../hooks/useReservationSocketRefresh';

type DailyLogListScreenProps = {
  navigation: {
    navigate: (screen: 'DailyLogDetail' | 'DailyLogNewEntry', params?: { entryId: string }) => void;
    setOptions: (opts: { headerRight?: () => React.ReactNode }) => void;
  };
};

type Section = { title: string; data: DailyLogEntry[] };

export function DailyLogListScreen({ navigation }: DailyLogListScreenProps) {
  const { colors } = useTheme();
  const tabBarBottom = useFloatingTabBarTotalHeight();
  const { profileId, loading: profileLoading } = useStylistProfile();
  const [entries, setEntries] = useState<DailyLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEntries = useCallback(async () => {
    if (!profileId) {
      setLoading(false);
      return;
    }
    try {
      const from = new Date();
      from.setMonth(from.getMonth() - 1);
      const to = new Date();
      to.setDate(to.getDate() + 7);
      const { data } = await api.get<DailyLogEntry[]>('/api/daily-log', {
        params: {
          stylistProfileId: profileId,
          fromDate: from.toISOString().slice(0, 10),
          toDate: to.toISOString().slice(0, 10),
        },
      });
      setEntries(data);
    } catch {
      setEntries([]);
    }
    setLoading(false);
  }, [profileId]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  useReservationSocketRefresh(fetchEntries);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginRight: spacing.sm }}>
          <TouchableOpacity
            onPress={() => router.push('/stylist/daily-log/debts')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="cash-outline" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('DailyLogNewEntry')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="add-circle-outline" size={26} color={colors.headerText} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, colors.headerText]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEntries();
    setRefreshing(false);
  }, [fetchEntries]);

  const sections: Section[] = React.useMemo(() => {
    const today = new Date();
    const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    const thisWeekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const lastWeekDate = subWeeks(today, 1);
    const lastWeekStart = startOfWeek(lastWeekDate, { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(lastWeekDate, { weekStartsOn: 1 });

    const buckets: Record<'today' | 'thisWeek' | 'lastWeek' | 'other', DailyLogEntry[]> = {
      today: [],
      thisWeek: [],
      lastWeek: [],
      other: [],
    };

    for (const e of entries) {
      const d = parseISO(e.date);
      if (isSameDay(d, today)) buckets.today.push(e);
      else if (isWithinInterval(d, { start: thisWeekStart, end: thisWeekEnd })) buckets.thisWeek.push(e);
      else if (isWithinInterval(d, { start: lastWeekStart, end: lastWeekEnd })) buckets.lastWeek.push(e);
      else buckets.other.push(e);
    }

    const sortInGroup = (a: DailyLogEntry, b: DailyLogEntry) => {
      const aPending = a.status !== 'COMPLETED';
      const bPending = b.status !== 'COMPLETED';
      if (aPending !== bPending) return aPending ? -1 : 1;
      const ad = a.date;
      const bd = b.date;
      if (ad === bd) return 0;
      return ad > bd ? -1 : 1;
    };

    (Object.keys(buckets) as Array<keyof typeof buckets>).forEach((k) => buckets[k].sort(sortInGroup));

    const result: Section[] = [];
    if (buckets.today.length) result.push({ title: 'Danas', data: buckets.today });
    if (buckets.thisWeek.length) result.push({ title: 'Ova sedmica', data: buckets.thisWeek });
    if (buckets.lastWeek.length) result.push({ title: 'Prošla sedmica', data: buckets.lastWeek });
    if (buckets.other.length) result.push({ title: 'Ostalo', data: buckets.other });
    return result;
  }, [entries]);

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
          icon="document-text-outline"
          title="Nema profila"
          message="Profil stilista nije pronađen."
        />
      </View>
    );
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={(e) => e.id}
      contentContainerStyle={[
        styles.list,
        sections.length === 0 && styles.emptyList,
        { paddingBottom: spacing.lg + tabBarBottom },
      ]}
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.background }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
      ListEmptyComponent={
        <EmptyState
          icon="document-text-outline"
          title="Nema zapisa"
          message="Zapisi iz rezervacija ili ručno dodani pojavit će se ovdje. Završite zapis i dodajte before/after slike."
        />
      }
      renderSectionHeader={({ section }) => (
        <Text style={[styles.sectionHeader, { color: colors.primary }]}>{section.title}</Text>
      )}
      renderItem={({ item }) => (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.navigate('DailyLogDetail', { entryId: item.id })}
        >
          <Card style={styles.card}>
            <View style={styles.row}>
              <Text style={[styles.serviceName, { color: colors.text }]}>
                {item.publicReferenceCode ?? getServicesLabel(item)}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {(() => {
                  const beforeCount = item.images?.filter((i) => i.isBefore).length ?? 0;
                  const afterCount = item.images?.filter((i) => i.isAfter).length ?? 0;
                  const hasBA = beforeCount > 0 && afterCount > 0;
                  return hasBA ? (
                    <Badge label="B/A" variant="info" />
                  ) : null;
                })()}
                <Badge
                  label={item.status === 'COMPLETED' ? 'Završeno' : 'Na čekanju'}
                  variant={item.status === 'COMPLETED' ? 'success' : 'warning'}
                />
              </View>
            </View>
            <Text style={[styles.date, { color: colors.textSecondary }]}>
              {formatDate(item.date)} · {getServicesLabel(item)}
            </Text>
            {item.client && (
              <Text style={[styles.client, { color: colors.textMuted }]}>
                {item.client.firstName} {item.client.lastName}
              </Text>
            )}
            <Text style={[styles.price, { color: colors.primary }]}>
              {getCollectedTotal(item).toFixed(2)} KM
              {getSettledDebtsSum(item) > 0
                ? ` · uklj. dug ${getSettledDebtsSum(item).toFixed(2)} KM`
                : ''}
              {item.tipAmount ? ` · nap. ${Number(item.tipAmount).toFixed(2)} KM` : ''}
            </Text>
          </Card>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: spacing.md },
  emptyList: { flex: 1 },
  sectionHeader: { fontSize: 16, fontWeight: '700', marginTop: spacing.md, marginBottom: spacing.xs },
  card: { marginBottom: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  serviceName: { fontSize: 16, fontWeight: '600', flex: 1, marginRight: spacing.sm },
  date: { fontSize: 14 },
  client: { fontSize: 13, marginTop: 2 },
  price: { fontSize: 14, fontWeight: '600', marginTop: 4 },
});
