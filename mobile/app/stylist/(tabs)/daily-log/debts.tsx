import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import api from '../../../../src/services/api';
import { useTheme } from '../../../../src/hooks/useTheme';
import { Card } from '../../../../src/components/ui/Card';
import { Button } from '../../../../src/components/ui/Button';
import { Input } from '../../../../src/components/ui/Input';
import { spacing } from '../../../../src/theme';
import { getSalonDateOnly } from '../../../../src/utils/date';
import { getApiErrorMessage } from '../../../../src/utils/apiError';
import { normalizeStylistDebtRows, type StylistDebtRowPayload } from '../../../../src/utils/apiPayload';

type DebtRow = StylistDebtRowPayload;

export default function StylistDebtsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [rows, setRows] = useState<DebtRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [q, setQ] = useState('');
  const [repayingId, setRepayingId] = useState<string | null>(null);
  const requestGeneration = useRef(0);
  const mounted = useRef(true);

  const fetchRows = useCallback(async (refresh = false) => {
    const generation = ++requestGeneration.current;
    if (refresh) setRefreshing(true);
    else setLoading(true);

    try {
      const { data } = await api.get<unknown>('/api/client-debts/stylist/me');
      const normalizedRows = normalizeStylistDebtRows(data);
      if (!normalizedRows) throw new Error('INVALID_STYLIST_DEBT_LIST_RESPONSE');
      if (!mounted.current || generation !== requestGeneration.current) return;
      setRows(normalizedRows);
      setLoadError(false);
    } catch {
      if (mounted.current && generation === requestGeneration.current) setLoadError(true);
    } finally {
      if (mounted.current && generation === requestGeneration.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  React.useEffect(() => {
    mounted.current = true;
    void fetchRows();
    return () => {
      mounted.current = false;
      requestGeneration.current += 1;
    };
  }, [fetchRows]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((debt) => {
      const name = `${debt.client.firstName ?? ''} ${debt.client.lastName ?? ''}`.trim().toLowerCase();
      return (
        debt.client.username.toLowerCase().includes(term) ||
        name.includes(term) ||
        (debt.service?.name ?? '').toLowerCase().includes(term) ||
        (debt.reservation?.publicReferenceCode ?? '').toLowerCase().includes(term)
      );
    });
  }, [rows, q]);

  const total = filtered.reduce((sum, debt) => sum + debt.amount, 0);
  const formatMoney = (amount: number) => t('stylist.dailyLogDebts.currencyAmount', {
    amount: amount.toFixed(2),
  });

  const onRefresh = () => {
    void fetchRows(true);
  };

  const repay = async (debtId: string) => {
    const today = getSalonDateOnly();
    setRepayingId(debtId);
    try {
      await api.post(`/api/client-debts/${debtId}/repay`, { date: today });
      if (!mounted.current) return;
      Alert.alert(
        t('stylist.dailyLogDebts.repaySuccessTitle'),
        t('stylist.dailyLogDebts.repaySuccessMessage'),
      );
      await fetchRows(true);
    } catch (error: unknown) {
      if (mounted.current) {
        Alert.alert(
          t('common.error'),
          getApiErrorMessage(error, t('stylist.dailyLogDebts.repayErrorFallback')),
        );
      }
    } finally {
      if (mounted.current) setRepayingId(null);
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
        <Text style={[styles.title, { color: colors.text }]}>{t('stylist.dailyLogDebts.title')}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('stylist.dailyLogDebts.total', { amount: formatMoney(total) })}
        </Text>
        <Input
          label={t('stylist.dailyLogDebts.searchLabel')}
          value={q}
          onChangeText={setQ}
          placeholder={t('stylist.dailyLogDebts.searchPlaceholder')}
        />
      </Card>

      <Card style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        {loading && rows.length === 0 ? (
          <Text style={{ color: colors.textSecondary }}>{t('common.loading')}</Text>
        ) : loadError && rows.length === 0 ? (
          <View style={styles.recovery}>
            <Text style={[styles.title, { color: colors.text }]}>{t('stylist.dailyLogDebts.loadErrorTitle')}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {t('stylist.dailyLogDebts.loadErrorMessage')}
            </Text>
            <Button title={t('stylist.dailyLogDebts.retry')} onPress={() => void fetchRows()} />
          </View>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {loadError ? (
              <View style={styles.recovery}>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  {t('stylist.dailyLogDebts.staleMessage')}
                </Text>
                <Button title={t('stylist.dailyLogDebts.retry')} onPress={() => void fetchRows(true)} />
              </View>
            ) : null}
            {rows.length === 0 ? (
              <Text style={{ color: colors.textSecondary }}>{t('stylist.dailyLogDebts.empty')}</Text>
            ) : filtered.length === 0 ? (
              <Text style={{ color: colors.textSecondary }}>{t('common.noResults')}</Text>
            ) : (
              <View style={{ gap: 10 }}>
                {filtered.map((debt) => {
                  const clientName = `${debt.client.firstName ?? ''} ${debt.client.lastName ?? ''}`.trim() || debt.client.username;
                  const reference = debt.reservation?.publicReferenceCode
                    ? t('stylist.dailyLogDebts.reservationReference', { code: debt.reservation.publicReferenceCode })
                    : debt.dailyLogEntry?.id
                      ? t('stylist.dailyLogDebts.dailyLogReference', { date: debt.dailyLogEntry.date.slice(0, 10) })
                      : debt.manualEntry?.id
                        ? t('stylist.dailyLogDebts.manualEntryReference', { date: debt.manualEntry.date.slice(0, 10) })
                        : t('stylist.dailyLogDebts.noReference');
                  return (
                    <View key={debt.id} style={[styles.row, { borderColor: colors.border }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
                          {clientName}
                        </Text>
                        <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
                          {debt.service?.name ? `${debt.service.name} · ` : ''}
                          {reference}
                        </Text>
                        <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
                          {debt.createdAt.slice(0, 10)}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.amount, { color: colors.text }]}>{formatMoney(debt.amount)}</Text>
                        <Button
                          title={t('stylist.dailyLogDebts.repayButton')}
                          onPress={() => void repay(debt.id)}
                          loading={repayingId === debt.id}
                          style={{ marginTop: spacing.xs }}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md },
  card: { padding: spacing.md, borderWidth: 1, marginBottom: spacing.md },
  recovery: { gap: spacing.xs },
  title: { fontSize: 18, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 4, marginBottom: spacing.sm },
  row: { borderWidth: 1, borderRadius: 12, padding: 12, flexDirection: 'row', gap: 12 },
  rowTitle: { fontSize: 15, fontWeight: '800' },
  rowMeta: { fontSize: 12, marginTop: 2 },
  amount: { fontSize: 14, fontWeight: '800' },
});
