import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Switch, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../hooks/useTheme';
import { spacing, borderRadius } from '../../theme';

type ProposalItem = {
  id: string;
  clientId: string;
  serviceName: string;
  clientName: string;
  oldStartTime: string;
  oldEndTime: string;
  newStartTime: string;
  newEndTime: string;
  shiftMinutes: number;
  reducedBreakMinutes?: number;
};

type Proposal = {
  delayMinutes: number;
  shiftMinutes: number;
  items: ProposalItem[];
};

type Props = {
  route: { params: { reservationId: string; includeBreaks?: boolean } };
  navigation: { goBack: () => void };
};

export function ReschedulePreviewScreen({ route, navigation }: Props) {
  const { reservationId } = route.params;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [includeBreaks, setIncludeBreaks] = useState(route.params.includeBreaks === true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);

  const fetchProposal = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.post<Proposal>(`/api/reservations/${reservationId}/reschedule/propose`, {
        includeBreaks,
      });
      setProposal(data);
    } catch (err: any) {
      Alert.alert('Greška', err?.response?.data?.message || 'Greška pri rekalkulaciji.');
      setProposal(null);
    } finally {
      setLoading(false);
    }
  }, [includeBreaks, reservationId]);

  useEffect(() => {
    fetchProposal();
  }, [fetchProposal]);

  const items = proposal?.items ?? [];
  const hasChanges = items.length > 0 && (proposal?.delayMinutes ?? 0) > 0;

  const totalShift = useMemo(() => {
    if (!items.length) return 0;
    return items[items.length - 1].shiftMinutes ?? 0;
  }, [items]);

  const submitNotify = useCallback(async () => {
    if (!hasChanges) return;
    Alert.alert(
      'Obavijestiti klijente?',
      'Klijenti će dobiti push i moraju potvrditi novi termin. Do tada rezervacije ostaju “na čekanju”.',
      [
        { text: 'Odustani', style: 'cancel' },
        {
          text: 'Obavijesti',
          onPress: async () => {
            setSubmitting(true);
            try {
              await api.post(`/api/reservations/${reservationId}/reschedule/commit`, { includeBreaks });
              Alert.alert('Poslano', 'Obavijesti su poslane klijentima.');
              navigation.goBack();
            } catch (err: any) {
              Alert.alert('Greška', err?.response?.data?.message || 'Greška pri slanju obavijesti.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  }, [hasChanges, includeBreaks, navigation, reservationId]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingBottom: spacing.xl + insets.bottom + 8 }]}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      <Card style={[styles.card, { borderColor: colors.border }]}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>Rekalkulacija termina</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Kašnjenje: {proposal?.delayMinutes ?? 0} min · Ukupno pomjeranje: {totalShift} min
            </Text>
          </View>
          <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
        </View>

        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.toggleTitle, { color: colors.text }]}>Uključi buduće pauze</Text>
            <Text style={[styles.toggleHint, { color: colors.textSecondary }]}>
              Ravnomjerno “skida” vrijeme iz pauza (maks. {includeBreaks ? 'do' : '0'} globalne pauze po terminu).
            </Text>
          </View>
          <Switch
            value={includeBreaks}
            onValueChange={(v) => setIncludeBreaks(v)}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#fff"
          />
        </View>

        <Button
          title="Osvježi preview"
          onPress={fetchProposal}
          variant="outline"
          size="sm"
          style={{ marginTop: spacing.sm }}
        />
      </Card>

      {!hasChanges ? (
        <Card style={styles.card}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Nema promjena</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Nema kašnjenja ili nema budućih termina za pomjeranje.
          </Text>
        </Card>
      ) : (
        <>
          {items.map((it) => (
            <Card key={it.id} style={styles.card}>
              <Text style={[styles.itemTitle, { color: colors.text }]}>
                {it.serviceName || 'Usluga'} {it.clientName ? `· ${it.clientName}` : ''}
              </Text>
              <View style={styles.row}>
                <Ionicons name="arrow-forward-circle-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.itemText, { color: colors.textSecondary }]}>
                  {it.oldStartTime}–{it.oldEndTime} → {it.newStartTime}–{it.newEndTime}
                </Text>
              </View>
              <Text style={[styles.meta, { color: colors.textSecondary }]}>
                Pomak: {it.shiftMinutes} min
                {typeof it.reducedBreakMinutes === 'number' ? ` · Skinuto iz pauze: ${it.reducedBreakMinutes} min` : ''}
              </Text>
            </Card>
          ))}

          <Button
            title="Obavijesti klijente"
            onPress={submitNotify}
            loading={submitting}
            style={{ marginTop: spacing.sm }}
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: spacing.md, paddingBottom: spacing.xl },
  card: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontSize: 18, fontWeight: '700' },
  subtitle: { marginTop: 4, fontSize: 13 },
  toggleRow: { marginTop: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  toggleTitle: { fontSize: 14, fontWeight: '600' },
  toggleHint: { marginTop: 2, fontSize: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptyText: { marginTop: 6, fontSize: 13 },
  itemTitle: { fontSize: 15, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  itemText: { fontSize: 13, flex: 1 },
  meta: { marginTop: spacing.xs, fontSize: 12 },
});

