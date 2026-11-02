import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Switch, ActivityIndicator } from 'react-native';
import { useFloatingTabBarTotalHeight } from '../../navigation/FloatingTabBar';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
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
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [proposal, setProposal] = useState<RescheduleProposal | null>(null);
  const [proposalOwnerKey, setProposalOwnerKey] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const requestGeneration = useRef(0);
  const activeActionRef = useRef<number | null>(null);
  const actionSequenceRef = useRef(0);
  const proposalKey = `${reservationId}:${includeBreaks}:${mode}:${manualShiftMinutes}`;
  const proposalIdentityKey = `${userId ?? 'signed-out'}:${reservationId}:${lockMode}:${proposalKey}`;
  const requestIdentity = useRef({
    userId,
    reservationId,
    proposalIdentityKey,
    generation: 0,
    mounted: true,
  });
  if (
    requestIdentity.current.userId !== userId ||
    requestIdentity.current.reservationId !== reservationId ||
    requestIdentity.current.proposalIdentityKey !== proposalIdentityKey
  ) {
    requestIdentity.current = {
      userId,
      reservationId,
      proposalIdentityKey,
      generation: requestIdentity.current.generation + 1,
      mounted: requestIdentity.current.mounted,
    };
    requestGeneration.current += 1;
    activeActionRef.current = null;
  }
  const hasCurrentProposal = proposalOwnerKey === proposalIdentityKey && proposal !== null;
  const currentProposal = hasCurrentProposal ? proposal : null;

  const isCurrentIdentity = useCallback((generation = requestIdentity.current.generation) => {
    const identity = requestIdentity.current;
    return (
      identity.mounted &&
      identity.userId === userId &&
      identity.reservationId === reservationId &&
      identity.proposalIdentityKey === proposalIdentityKey &&
      identity.generation === generation &&
      useAuthStore.getState().user?.id === userId
    );
  }, [proposalIdentityKey, reservationId, userId]);

  useEffect(() => {
    requestIdentity.current.mounted = true;
    return () => {
      requestIdentity.current.mounted = false;
      requestIdentity.current.generation += 1;
      requestGeneration.current += 1;
      activeActionRef.current = null;
    };
  }, []);

  useEffect(() => {
    setSubmitting(false);
  }, [proposalIdentityKey]);

  const fetchProposal = useCallback(async () => {
    const identityGeneration = requestIdentity.current.generation;
    if (!isCurrentIdentity(identityGeneration)) return;
    const generation = ++requestGeneration.current;
    const isCurrentRequest = () =>
      generation === requestGeneration.current && isCurrentIdentity(identityGeneration);
    setLoading(true);
    setLoadError(false);
    if (!userId) {
      setLoadError(true);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.post<unknown>(`/api/reservations/${reservationId}/reschedule/propose`, {
        includeBreaks,
        mode,
        manualShiftMinutes:
          mode === 'manual_minutes'
            ? Math.max(0, parseInt(manualShiftMinutes || '0', 10) || 0)
            : undefined,
      });
      if (!isCurrentRequest()) return;
      const parsed = normalizeRescheduleProposal(data);
      if (!parsed) throw new Error('INVALID_RESCHEDULE_PROPOSAL');
      setProposal(parsed);
      setProposalOwnerKey(proposalIdentityKey);
      setLoadError(false);
    } catch {
      if (isCurrentRequest()) setLoadError(true);
    } finally {
      if (isCurrentRequest()) setLoading(false);
    }
  }, [includeBreaks, isCurrentIdentity, manualShiftMinutes, mode, proposalIdentityKey, reservationId, userId]);

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

  const actionStateRef = useRef({
    identityKey: proposalIdentityKey,
    proposalOwnerKey,
    proposal,
    loading,
    loadError,
    hasChanges,
    mode,
  });
  actionStateRef.current = {
    identityKey: proposalIdentityKey,
    proposalOwnerKey,
    proposal,
    loading,
    loadError,
    hasChanges,
    mode,
  };

  const canBeginAction = useCallback((generation: number, expectedIdentityKey: string) => {
    const actionState = actionStateRef.current;
    return (
      isCurrentIdentity(generation) &&
      actionState.identityKey === expectedIdentityKey &&
      actionState.proposalOwnerKey === expectedIdentityKey &&
      actionState.proposal !== null &&
      !actionState.loading &&
      !actionState.loadError &&
      (actionState.hasChanges || actionState.mode === 'use_break_only') &&
      activeActionRef.current === null
    );
  }, [isCurrentIdentity]);

  const beginAction = useCallback((generation: number, expectedIdentityKey: string) => {
    if (!canBeginAction(generation, expectedIdentityKey)) return null;
    const token = ++actionSequenceRef.current;
    activeActionRef.current = token;
    return {
      isCurrent: () =>
        activeActionRef.current === token &&
        isCurrentIdentity(generation) &&
        actionStateRef.current.identityKey === expectedIdentityKey,
      finish: () => {
        if (activeActionRef.current === token) activeActionRef.current = null;
      },
    };
  }, [canBeginAction, isCurrentIdentity]);

  const submitNotify = useCallback(() => {
    const generation = requestIdentity.current.generation;
    const expectedIdentityKey = proposalIdentityKey;
    if (!canBeginAction(generation, expectedIdentityKey)) return;
    Alert.alert(
      t('stylist.reschedulePreview.confirmTitle'),
      t('stylist.reschedulePreview.confirmMessage'),
      [
        { text: t('stylist.reschedulePreview.confirmCancel'), style: 'cancel' },
        {
          text: t('stylist.reschedulePreview.confirmSubmit'),
          onPress: async () => {
            const action = beginAction(generation, expectedIdentityKey);
            if (!action) return;
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
              if (!action.isCurrent()) return;
              Alert.alert(
                t('stylist.reschedulePreview.successTitle'),
                t(mode === 'use_break_only'
                  ? 'stylist.reschedulePreview.successBreakOnly'
                  : 'stylist.reschedulePreview.successNotify'),
              );
              if (action.isCurrent()) navigation.goBack();
            } catch (err: unknown) {
              if (action.isCurrent()) {
                Alert.alert(t('common.error'), getApiErrorMessage(err, t('common.error')));
              }
            } finally {
              if (action.isCurrent()) setSubmitting(false);
              action.finish();
            }
          },
        },
      ],
    );
  }, [beginAction, canBeginAction, includeBreaks, manualShiftMinutes, mode, navigation, proposalIdentityKey, reservationId, t]);

  if (!hasCurrentProposal && (loading || !loadError)) {
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
            <Text style={[styles.title, { color: colors.text }]}>
              {t('stylist.reschedulePreview.title')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {t('stylist.reschedulePreview.summary', {
                overrun: currentProposal?.overrunMinutes ?? currentProposal?.delayMinutes ?? 0,
                totalShift,
              })}
            </Text>
          </View>
          <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
        </View>

        <View style={styles.modeRow}>
          {lockMode ? (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {t('stylist.reschedulePreview.lockedMode')}
            </Text>
          ) : (
            <>
              <Button
                title={t('stylist.reschedulePreview.actualOverrunMode')}
                onPress={() => setMode('actual_overrun')}
                size="sm"
                variant={mode === 'actual_overrun' ? 'primary' : 'outline'}
                style={styles.modeBtn}
              />
              <Button
                title={t('stylist.reschedulePreview.manualMode')}
                onPress={() => setMode('manual_minutes')}
                size="sm"
                variant={mode === 'manual_minutes' ? 'primary' : 'outline'}
                style={styles.modeBtn}
              />
              <Button
                title={t('stylist.reschedulePreview.breakOnlyMode')}
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
            label={t('stylist.reschedulePreview.manualShiftLabel')}
            value={manualShiftMinutes}
            onChangeText={setManualShiftMinutes}
            keyboardType="number-pad"
          />
        )}

        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.toggleTitle, { color: colors.text }]}>
              {t('stylist.reschedulePreview.includeBreaksLabel')}
            </Text>
            <Text style={[styles.toggleHint, { color: colors.textSecondary }]}>
              {t('stylist.reschedulePreview.includeBreaksHint')}
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
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {t('stylist.reschedulePreview.noChangesTitle')}
          </Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {t(mode === 'use_break_only'
              ? 'stylist.reschedulePreview.noChangesBreakOnly'
              : 'stylist.reschedulePreview.noChangesFuture')}
          </Text>
          {mode === 'use_break_only' ? (
            <Button
              title={t('stylist.reschedulePreview.applyBreakOnly')}
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
                {it.serviceName || t('stylist.reschedulePreview.serviceFallback')} {it.clientName ? `· ${it.clientName}` : ''}
              </Text>
              <View style={styles.row}>
                <Ionicons name="arrow-forward-circle-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.itemText, { color: colors.textSecondary }]}>
                  {it.oldStartTime}–{it.oldEndTime} → {it.newStartTime}–{it.newEndTime}
                </Text>
              </View>
              <Text style={[styles.meta, { color: colors.textSecondary }]}>
                {t('stylist.reschedulePreview.shiftLabel', { minutes: it.shiftMinutes })}
                {typeof it.reducedBreakMinutes === 'number'
                  ? t('stylist.reschedulePreview.reducedBreak', { minutes: it.reducedBreakMinutes })
                  : ''}
              </Text>
            </Card>
          ))}

          <Button
            title={t('stylist.reschedulePreview.notifyClients')}
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

