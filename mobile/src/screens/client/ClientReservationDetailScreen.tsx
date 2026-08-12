import React, { useCallback, useEffect, useState } from 'react';
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
import api from '../../services/api';
import { spacing } from '../../theme';
import { formatDate, formatTime } from '../../utils/date';
import { getReservationServices } from '../../utils/reservationServices';
import type { ReservationsScreenProps } from '../../navigation/types';
import type { Reservation, ReservationPaymentSummary } from '../../types';

type ReservationDetail = Reservation & {
  paymentSummary?: ReservationPaymentSummary | null;
};

export function ClientReservationDetailScreen({
  navigation,
  route,
}: ReservationsScreenProps<'ReservationDetail'>) {
  const { reservationId } = route.params;
  const { t } = useTranslation();
  const { colors } = useTheme();
  const tabBarBottom = useFloatingTabBarTotalHeight();
  const [reservation, setReservation] = useState<ReservationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<ReservationDetail>(`/api/reservations/${reservationId}`);
      setReservation(data);
    } catch {
      setReservation(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [reservationId]);

  useEffect(() => {
    navigation.setOptions({ title: t('reservationDetail.title') });
  }, [navigation, t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!reservation) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>{t('reservationDetail.notFound')}</Text>
      </View>
    );
  }

  const services = getReservationServices(reservation);
  const stylistName = reservation.confirmedStylist?.user
    ? [reservation.confirmedStylist.user.firstName, reservation.confirmedStylist.user.lastName]
        .filter(Boolean)
        .join(' ')
    : null;
  const payment = reservation.paymentSummary;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: spacing.xl + tabBarBottom }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />
      }
    >
      <Card style={styles.card}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            {reservation.publicReferenceCode?.trim() || services[0]?.name || t('reservationDetail.title')}
          </Text>
          <Badge
            label={t(`myReservations.status.${reservation.status}` as any)}
            variant={getStatusVariant(reservation.status)}
            status={reservation.status}
          />
        </View>
        <View style={styles.row}>
          <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.rowText, { color: colors.text }]}>
            {formatDate(reservation.reservationDate)} · {formatTime(reservation.startTime)}–{formatTime(reservation.endTime)}
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
      ) : reservation.status === 'COMPLETED' ? (
        <Card style={styles.card}>
          <Text style={{ color: colors.textSecondary }}>{t('reservationDetail.paymentPending')}</Text>
        </Card>
      ) : null}

      {reservation.status === 'COMPLETED' ? (
        <Button
          title={t('reviews.writeReview')}
          onPress={() =>
            navigation.navigate('WriteReview', {
              reservationId: reservation.id,
              serviceId: reservation.serviceId,
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
