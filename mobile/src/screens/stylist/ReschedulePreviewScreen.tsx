import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Switch, ActivityIndicator } from 'react-native';
import { useFloatingTabBarTotalHeight } from '../../navigation/FloatingTabBar';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useTheme } from '../../hooks/useTheme';
import { spacing, borderRadius } from '../../theme';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '../../utils/apiError';
import { normalizeRescheduleProposal } from './reschedule-proposal.mjs';
import type { RescheduleMode, RescheduleProposal } from './reschedule-proposal.mjs';

type Props = {
  route: {
    params: {
      reservationId: string;
      includeBreaks?: boolean;
      mode?: RescheduleMode;
      manualShiftMinutes?: number;
      lockMode?: boolean;
    };
  };
  navigation: { goBack: () => void };
};

export function ReschedulePreviewScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { reservationId } = route.params;
  const lockMode = route.params.lockMode === true;
  const { colors } = useTheme();
  const tabBarBottom = useFloatingTabBarTotalHeight();
  const [includeBreaks, setIncludeBreaks] = useState(route.params.includeBreaks === true);
  const [mode, setMode] = useState<RescheduleMode>(route.params.mode ?? 'actual_overrun');
  const [manualShiftMinutes, setManualShiftMinutes] = useState(
    route.params.manualShiftMinutes ? String(route.params.manualShiftMinutes) : '5',
  );
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [proposal, setProposal] = useState<RescheduleProposal | null>(null);
  const [proposalOwnerKey, setProposalOwnerKey] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const requestGeneration = useRef(0);
  const proposalKey = `${reservationId}:${includeBreaks}:${mode}:${manualShiftMinutes}`;
  const hasCurrentProposal = proposalOwnerKey === proposalKey && proposal !== null;
  const currentProposal = hasCurrentProposal ? proposal : null;

  const fetchProposal = useCallback(async () => {
    const generation = ++requestGeneration.current;
    setLoading(true);
    setLoadError(false);
    try {
      const { data } = await api.post<unknown>(`/api/reservations/${reservationId}/reschedule/propose`, {
        includeBreaks,
        mode,
        manualShiftMinutes:
          mode === 'manual_minutes'
            ? Math.max(0, parseInt(manualShiftMinutes || '0', 10) || 0)
            : undefined,
      });
      const parsed = normalizeRescheduleProposal(data);
      if (!parsed) throw new Error('INVALID_RESCHEDULE_PROPOSAL');
      if (generation !== requestGeneration.current) return;
      setProposal(parsed);
      setProposalOwnerKey(proposalKey);
      setLoadError(false);
    } catch {
      if (generation === requestGeneration.current) setLoadError(true);
    } finally {
      if (generation === requestGeneration.current) setLoading(false);
    }
  }, [includeBreaks, mode, manualShiftMinutes, proposalKey, reservationId]);

  useEffect(() => {
    void fetchProposal();
    return () => {
      requestGeneration.current += 1;
    };
  }, [fetchProposal]);

  const items = currentProposal?.items ?? [];
  const hasChanges = items.length > 0 && (currentProposal?.delayMinutes ?? 0) > 0;

  const totalShift = useMemo(() => {
    if (!items.length) return 0;
    return items[items.length - 1].shiftMinutes ?? 0;
  }, [items]);

  const submitNotify = useCallback(async () => {
    if (loading || loadError || !hasCurrentProposal) return;
    if (!hasChanges && mode !== 'use_break_only') return;
    Alert.alert(
      'Obavijestiti klijente?',
      'Klijenti će dobiti push i moraju potvrditi novi termin. Do tada rezervacije ostaju “na čekanju”.',
      [
        { text: 'Odustani', style: 'cancel' },
        {
          text: 'Obavijesti',
          onPress: async () => {
            if (loading || loadError || !hasCurrentProposal) return;
            setSubmitting(true);
            try {
              await api.post(`/api/reservations/${reservationId}/reschedule/commit`, {
                includeBreaks,
                mode,
                manualShiftMinutes:
                  mode === 'manual_minutes'
                    ? Math.max(0, parseInt(manualShiftMinutes || '0', 10) || 0)
                    : undefined,
              });
              Alert.alert(
                'Poslano',
                mode === 'use_break_only'
                  ? 'Odabrano je korištenje pauze bez pomjeranja termina.'
                  : 'Obavijesti su poslane klijentima.',
              );
              navigation.goBack();
            } catch (err: unknown) {
              Alert.alert(t('common.error'), getApiErrorMessage(err, t('common.error')));
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  }, [hasChanges, hasCurrentProposal, includeBreaks, loadError, loading, mode, manualShiftMinutes, navigation, reservationId, t]);

  if (loading && !hasCurrentProposal) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingBottom: spacing.xl + tabBarBottom }]}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      <Card style={[styles.card, { borderColor: colors.border }]}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>Rekalkulacija termina</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Kašnjenje: {currentProposal?.overrunMinutes ?? currentProposal?.delayMinutes ?? 0} min · Ukupno pomjeranje: {totalShift} min
            </Text>
          </View>
          <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
        </View>

        <View style={styles.modeRow}>
          {lockMode ? (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Način: stvarni overrun (nakon završetka DK)
            </Text>
          ) : (
            <>
              <Button
                title="Stvarni overrun"
                onPress={() => setMode('actual_overrun')}
                size="sm"
                variant={mode === 'actual_overrun' ? 'primary' : 'outline'}
                style={styles.modeBtn}
              />
              <Button
                title="Ručni unos"
                onPress={() => setMode('manual_minutes')}
                size="sm"
                variant={mode === 'manual_minutes' ? 'primary' : 'outline'}
                style={styles.modeBtn}
              />
              <Button
                title="Bez pomjeranja"
                onPress={() => setMode('use_break_only')}
                size="sm"
                variant={mode === 'use_break_only' ? 'primary' : 'outline'}
                style={styles.modeBtn}
              />
            </>
          )}
        </View>

        {mode === 'manual_minutes' && (
          <Input
            label="Ručni pomak (min)"
            value={manualShiftMinutes}
            onChangeText={setManualShiftMinutes}
            keyboardType="number-pad"
          />
        )}

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
          title={t('stylist.reschedulePreview.retry')}
          onPress={fetchProposal}
          variant="outline"
          size="sm"
          loading={loading}
          style={{ marginTop: spacing.sm }}
        />
        {loading && hasCurrentProposal ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: spacing.sm }} />
        ) : null}
      </Card>

      {loadError ? (
        <Card style={styles.card}>
          <Text style={[styles.emptyText, { color: colors.error }]}>
            {t(hasCurrentProposal ? 'stylist.reschedulePreview.stale' : 'stylist.reschedulePreview.loadError')}
          </Text>
          <Button
            title={t('stylist.reschedulePreview.retry')}
            onPress={() => { void fetchProposal(); }}
            loading={loading}
            variant="outline"
            size="sm"
            style={{ marginTop: spacing.sm }}
          />
        </Card>
      ) : null}

      {!hasChanges && !loadError ? (
        <Card style={styles.card}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Nema promjena</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {mode === 'use_break_only'
              ? 'Odabran je način bez pomjeranja termina (korištenje pauze).'
              : 'Nema kašnjenja ili nema budućih termina za pomjeranje.'}
          </Text>
          {mode === 'use_break_only' ? (
            <Button
              title="Primijeni bez pomjeranja"
              onPress={submitNotify}
              loading={submitting}
              disabled={loading || loadError || !hasCurrentProposal}
              style={{ marginTop: spacing.md }}
            />
          ) : null}
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
            disabled={loading || loadError || !hasCurrentProposal}
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
  modeRow: { marginTop: spacing.md, gap: spacing.xs },
  modeBtn: { width: '100%' },
  toggleTitle: { fontSize: 14, fontWeight: '600' },
  toggleHint: { marginTop: 2, fontSize: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptyText: { marginTop: 6, fontSize: 13 },
  itemTitle: { fontSize: 15, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  itemText: { fontSize: 13, flex: 1 },
  meta: { marginTop: spacing.xs, fontSize: 12 },
});

