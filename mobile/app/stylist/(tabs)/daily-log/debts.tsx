import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import api from '../../../../src/services/api';
import { useTheme } from '../../../../src/hooks/useTheme';
import { Card } from '../../../../src/components/ui/Card';
import { Button } from '../../../../src/components/ui/Button';
import { Input } from '../../../../src/components/ui/Input';
import { spacing } from '../../../../src/theme';

type DebtRow = {
  id: string;
  amount: number | string;
  createdAt: string;
  client: { id: string; username: string; firstName: string | null; lastName: string | null };
  service?: { id: string; name: string } | null;
  reservation?: { id: string; publicReferenceCode: string } | null;
  dailyLogEntry?: { id: string; date: string } | null;
  manualEntry?: { id: string; date: string } | null;
};

const formatMoney = (v: number | string) => `${Number(v || 0).toFixed(2)} KM`;

export default function StylistDebtsScreen() {
  const { colors } = useTheme();
  const [rows, setRows] = useState<DebtRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState('');
  const [repayingId, setRepayingId] = useState<string | null>(null);

  const fetchRows = async () => {
    try {
      const { data } = await api.get<DebtRow[]>('/api/client-debts/stylist/me');
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchRows();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((d) => {
      const name = `${d.client.firstName ?? ''} ${d.client.lastName ?? ''}`.trim().toLowerCase();
      return (
        d.client.username.toLowerCase().includes(term) ||
        name.includes(term) ||
        (d.service?.name ?? '').toLowerCase().includes(term) ||
        (d.reservation?.publicReferenceCode ?? '').toLowerCase().includes(term)
      );
    });
  }, [rows, q]);

  const total = filtered.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRows();
    setRefreshing(false);
  };

  const repay = async (debtId: string) => {
    const today = new Date().toISOString().slice(0, 10);
    setRepayingId(debtId);
    try {
      await api.post(`/api/client-debts/${debtId}/repay`, { date: today });
      Alert.alert('Naplaćeno', 'Dug je zatvoren i evidentiran u dnevnoj knjizi.');
      await fetchRows();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as any).response?.data?.message
          : 'Greška pri naplati duga.';
      Alert.alert('Greška', Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setRepayingId(null);
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      <Card style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <Text style={[styles.title, { color: colors.text }]}>Dužnici</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Ukupno: {formatMoney(total)}
        </Text>
        <Input
          label="Pretraga"
          value={q}
          onChangeText={setQ}
          placeholder="Klijent, servis, kod…"
        />
      </Card>

      <Card style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        {loading ? (
          <Text style={{ color: colors.textSecondary }}>Učitavanje…</Text>
        ) : filtered.length === 0 ? (
          <Text style={{ color: colors.textSecondary }}>Nema otvorenih dugovanja.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {filtered.map((d) => {
              const clientName = `${d.client.firstName ?? ''} ${d.client.lastName ?? ''}`.trim() || d.client.username;
              const ref = d.reservation?.publicReferenceCode
                ? `Rezervacija: ${d.reservation.publicReferenceCode}`
                : d.dailyLogEntry?.id
                  ? `Daily log: ${d.dailyLogEntry.date.slice(0, 10)}`
                  : d.manualEntry?.id
                    ? `Manual entry: ${d.manualEntry.date.slice(0, 10)}`
                    : '—';
              return (
                <View key={d.id} style={[styles.row, { borderColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
                      {clientName}
                    </Text>
                    <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
                      {d.service?.name ? `${d.service.name} · ` : ''}
                      {ref}
                    </Text>
                    <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
                      {d.createdAt.slice(0, 10)}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.amount, { color: colors.text }]}>{formatMoney(d.amount)}</Text>
                    <Button
                      title="Naplati dug"
                      onPress={() => repay(d.id)}
                      loading={repayingId === d.id}
                      style={{ marginTop: spacing.xs }}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md },
  card: { padding: spacing.md, borderWidth: 1, marginBottom: spacing.md },
  title: { fontSize: 18, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 4, marginBottom: spacing.sm },
  row: { borderWidth: 1, borderRadius: 12, padding: 12, flexDirection: 'row', gap: 12 },
  rowTitle: { fontSize: 15, fontWeight: '800' },
  rowMeta: { fontSize: 12, marginTop: 2 },
  amount: { fontSize: 14, fontWeight: '800' },
});

