import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useStylistProfile } from '../../hooks/useStylistProfile';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import api from '../../services/api';
import { spacing } from '../../theme';
import { formatDate } from '../../utils/date';
import type { DailyLogEntry } from '../../types';

type DailyLogListScreenProps = {
  navigation: {
    navigate: (screen: 'DailyLogDetail' | 'DailyLogNewEntry', params?: { entryId: string }) => void;
    setOptions: (opts: { headerRight?: () => React.ReactNode }) => void;
  };
};

export function DailyLogListScreen({ navigation }: DailyLogListScreenProps) {
  const { colors } = useTheme();
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

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('DailyLogNewEntry')}
          style={{ marginRight: spacing.sm }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="add-circle-outline" size={26} color={colors.headerText} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, colors.headerText]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEntries();
    setRefreshing(false);
  }, [fetchEntries]);

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
    <FlatList
      data={entries}
      keyExtractor={(e) => e.id}
      contentContainerStyle={[styles.list, entries.length === 0 && styles.emptyList]}
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
      renderItem={({ item }) => (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.navigate('DailyLogDetail', { entryId: item.id })}
        >
          <Card style={styles.card}>
            <View style={styles.row}>
              <Text style={[styles.serviceName, { color: colors.text }]}>
                {item.service?.name ?? 'Usluga'}
              </Text>
              <Badge
                label={item.status === 'COMPLETED' ? 'Završeno' : 'Na čekanju'}
                variant={item.status === 'COMPLETED' ? 'success' : 'warning'}
              />
            </View>
            <Text style={[styles.date, { color: colors.textSecondary }]}>
              {formatDate(item.date)}
            </Text>
            {item.client && (
              <Text style={[styles.client, { color: colors.textMuted }]}>
                {item.client.firstName} {item.client.lastName}
              </Text>
            )}
            <Text style={[styles.price, { color: colors.primary }]}>
              {Number(item.actualPrice).toFixed(2)} KM
              {item.tipAmount ? ` + ${Number(item.tipAmount).toFixed(2)} KM napojnica` : ''}
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
  card: { marginBottom: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  serviceName: { fontSize: 16, fontWeight: '600', flex: 1, marginRight: spacing.sm },
  date: { fontSize: 14 },
  client: { fontSize: 13, marginTop: 2 },
  price: { fontSize: 14, fontWeight: '600', marginTop: 4 },
});
