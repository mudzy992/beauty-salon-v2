import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useFloatingTabBarTotalHeight } from '../../navigation/FloatingTabBar';
import { Card } from '../../components/ui/Card';
import { Badge, getStatusVariant } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { spacing } from '../../theme';
import { formatDate, formatTime } from '../../utils/date';
import { getReservationServices } from '../../utils/reservationServices';
import type { ReservationsScreenProps } from '../../navigation/types';
import { normalizeReservationDetail, type ReservationDetailPayload } from '../../utils/apiPayload';

export function ClientReservationDetailScreen({
  navigation,
  route,
}: ReservationsScreenProps<'ReservationDetail'>) {
  const { reservationId } = route.params;
  const { t } = useTranslation();
  const { colors } = useTheme();
  const tabBarBottom = useFloatingTabBarTotalHeight();
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const [reservation, setReservation] = useState<ReservationDetailPayload | null>(null);
  const [reservationOwner, setReservationOwner] = useState<{ userId: string; reservationId: string } | null>(null);
  const visibleReservation = reservationOwner?.userId === userId && reservationOwner.reservationId === reservationId
    ? reservation
    : null;
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const requestGeneration = useRef(0);
  const requestIdentity = useRef({ userId, reservationId });
  if (requestIdentity.current.userId !== userId || requestIdentity.current.reservationId !== reservationId) {
    requestIdentity.current = { userId, reservationId };
    requestGeneration.current += 1;
  }

  const load = useCallback(async () => {
    const generation = ++requestGeneration.current;
    setLoadError(false);
    if (!userId) {
      setReservation(null);
      setReservationOwner(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const { data } = await api.get<unknown>(`/api/reservations/${reservationId}`);
      if (generation !== requestGeneration.current) return;
      const normalized = normalizeReservationDetail(data);
      if (!normalized) {
        setLoadError(true);
        return;
      }
      setReservation(normalized);
      setReservationOwner({ userId, reservationId });
      setLoadError(false);
    } catch {
      if (generation === requestGeneration.current) setLoadError(true);
    } finally {
      if (generation === requestGeneration.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [reservationId, userId]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  useEffect(() => {
    navigation.setOptions({ title: t('reservationDetail.title') });
  }, [navigation, t]);

  useEffect(() => {
    setLoading(true);
    setRefreshing(false);
    setLoadError(false);
    void load();
    return () => {
      requestGeneration.current += 1;
    };
  }, [load]);

  if (loading && !visibleReservation) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!visibleReservation) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, padding: spacing.lg }]}>
        <EmptyState
          icon={loadError ? 'cloud-offline-outline' : 'document-text-outline'}
          title={loadError ? t('reservationDetail.loadErrorTitle') : t('reservationDetail.notFound')}
          message={loadError ? t('reservationDetail.loadErrorMessage') : undefined}
          actionLabel={loadError ? t('common.retry') : undefined}
          onAction={loadError ? () => { setLoading(true); void load(); } : undefined}
        />
        <Button title={t('common.back')} onPress={() => navigation.goBack()} variant="outline" style={{ marginTop: spacing.md }} />
      </View>
    );
  }

  const services = getReservationServices(visibleReservation);
  const stylistName = visibleReservation.confirmedStylist?.user
    ? [visibleReservation.confirmedStylist.user.firstName, visibleReservation.confirmedStylist.user.lastName]
        .filter(Boolean)
        .join(' ')
    : null;
  const payment = visibleReservation.paymentSummary;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: spacing.xl + tabBarBottom }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} />
      }
    >
      {loadError ? (
        <Card style={[styles.card, { borderWidth: 1, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('reservationDetail.loadErrorTitle')}</Text>
          <Text style={{ color: colors.textSecondary }}>{t('reservationDetail.staleMessage')}</Text>
          <Button title={t('common.retry')} onPress={() => void load()} variant="outline" size="sm" />
        </Card>
      ) : null}
      <Card style={styles.card}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            {visibleReservation.publicReferenceCode?.trim() || services[0]?.name || t('reservationDetail.title')}
          </Text>
          <Badge
            label={t(`myReservations.status.${visibleReservation.status}` as any)}
            variant={getStatusVariant(visibleReservation.status)}
            status={visibleReservation.status}
          />
        </View>
        <View style={styles.row}>
          <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.rowText, { color: colors.text }]}>
            {formatDate(visibleReservation.reservationDate)} · {formatTime(visibleReservation.startTime)}–{formatTime(visibleReservation.endTime)}
          </Text>
        </View>
        {stylistName ? (
          <View style={styles.row}>
            <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.rowText, { color: colors.text }]}>{stylistName}</Text>
          </View>
        ) : null}
        {services.map((service) => (
          <View key={service.id} style={styles.row}>
            <Ionicons name="cut-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.rowText, { color: colors.text }]}>{service.name}</Text>
          </View>
        ))}
      </Card>

      {payment ? (
        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('reservationDetail.paymentTitle')}</Text>
          <Text style={[styles.ref, { color: colors.textSecondary }]}>{payment.publicReferenceCode}</Text>
          {payment.items.map((item, index) => (
            <View key={`${item.name}-${index}`} style={styles.paymentRow}>
              <Text style={[styles.rowText, { color: colors.text, flex: 1 }]}>{item.name}</Text>
              <Text style={[styles.amount, { color: colors.text }]}>{item.unitPrice.toFixed(2)} KM</Text>
            </View>
          ))}
          {payment.loyaltyDiscountAmount > 0 ? (
            <View style={styles.paymentRow}>
              <Text style={[styles.rowText, { color: colors.textSecondary }]}>{t('reservationDetail.loyaltyDiscount')}</Text>
              <Text style={[styles.amount, { color: colors.success }]}>−{payment.loyaltyDiscountAmount.toFixed(2)} KM</Text>
            </View>
          ) : null}
          <View style={styles.paymentRow}>
            <Text style={[styles.rowText, { color: colors.textSecondary }]}>{t('reservationDetail.tip')}</Text>
            <Text style={[styles.amount, { color: colors.text }]}>{payment.tipAmount.toFixed(2)} KM</Text>
          </View>
          <View style={[styles.totalRow, { borderTopColor: colors.borderLight }]}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>{t('reservationDetail.totalPaid')}</Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>{payment.actualPrice.toFixed(2)} KM</Text>
          </View>
          <Text style={[styles.thankYou, { color: colors.textSecondary }]}>{t('reservationDetail.thankYou')}</Text>
        </Card>
      ) : visibleReservation.status === 'COMPLETED' ? (
        <Card style={styles.card}>
          <Text style={{ color: colors.textSecondary }}>{t('reservationDetail.paymentPending')}</Text>
        </Card>
      ) : null}

      {visibleReservation.status === 'COMPLETED' ? (
        <Button
          title={t('reviews.writeReview')}
          onPress={() =>
            navigation.navigate('WriteReview', {
              reservationId: visibleReservation.id,
              serviceId: visibleReservation.serviceId,
            })
          }
          variant="outline"
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, gap: spacing.md },
  card: { padding: spacing.lg, gap: spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  title: { fontSize: 18, fontWeight: '700', flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowText: { fontSize: 15, flex: 1 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  ref: { fontSize: 13, marginBottom: spacing.xs },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  amount: { fontSize: 15, fontWeight: '600' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
  totalLabel: { fontSize: 16, fontWeight: '700' },
  totalValue: { fontSize: 18, fontWeight: '800' },
  thankYou: { fontSize: 14, marginTop: spacing.sm },
});
