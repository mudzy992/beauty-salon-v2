import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { Card } from '../../../../components/ui/Card';
import { Badge, getStatusVariant } from '../../../../components/ui/Badge';
import { spacing } from '../../../../theme';
import { formatDate, formatTime } from '../../../../utils/date';
import { getReservationServicesLabel, getReservationTotalDurationMinutes } from '../../../../utils/reservationServices';
import { useTheme } from '../../../../hooks/useTheme';
import type { Reservation } from '../../../../types';
import { getReservationStatusLabel } from './utils/reservation-detail';

type ReservationDetailSummaryProps = {
  reservation: Reservation;
};

export const ReservationDetailSummary = ({ reservation }: ReservationDetailSummaryProps) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const statusLabel = getReservationStatusLabel(reservation, t);
  const loyaltyPercent = Number(
    'loyaltyDiscountPercent' in reservation
      ? (reservation as { loyaltyDiscountPercent?: number }).loyaltyDiscountPercent ?? 0
      : 0,
  );
  const loyaltyAmount = Number(
    'loyaltyDiscountAmount' in reservation
      ? (reservation as { loyaltyDiscountAmount?: number }).loyaltyDiscountAmount ?? 0
      : 0,
  );
  const totalMinutes = getReservationTotalDurationMinutes(reservation);
  const durationSuffix = totalMinutes > 0 ? ` · ${totalMinutes} min` : '';

  return (
    <Card style={[styles.card, { borderWidth: 1, borderColor: colors.border }]}>
      <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.serviceName, { color: colors.text }]}>
            {getReservationServicesLabel(reservation)}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {formatDate(reservation.reservationDate.slice(0, 10))} ·{' '}
            {formatTime(reservation.startTime)} – {formatTime(reservation.endTime)}
            {durationSuffix}
          </Text>
        </View>
        <Badge label={statusLabel} variant={getStatusVariant(reservation.status)} status={reservation.status} />
      </View>
      <View style={styles.infoGrid}>
        <View style={styles.infoItem}>
          <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.text }]}>
            {reservation.client
              ? `${reservation.client.firstName} ${reservation.client.lastName}`
              : '—'}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="pricetag-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.text }]}>
            {loyaltyPercent > 0
              ? `Loyalty: ${loyaltyPercent}% (${loyaltyAmount.toFixed(2)} KM)`
              : 'Loyalty: —'}
          </Text>
        </View>
        {reservation.clientNotes ? (
          <View style={[styles.infoItem, { alignItems: 'flex-start' }]}>
            <Ionicons name="chatbubble-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary, flex: 1 }]}>
              {reservation.clientNotes}
            </Text>
          </View>
        ) : null}
        {reservation.payDebtsIntent ? (
          <View style={styles.infoItem}>
            <Ionicons name="cash-outline" size={16} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.primary, fontWeight: '700' }]}>
              Klijent želi platiti dugovanje
            </Text>
          </View>
        ) : null}
        {reservation.rescheduleStatus === 'PENDING' ? (
          <View style={[styles.infoItem, { alignItems: 'flex-start' }]}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.warning} />
            <Text style={[styles.infoText, { color: colors.warning, flex: 1 }]}>
              Klijent treba potvrditi predloženi termin.
            </Text>
          </View>
        ) : null}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  headerRow: {
    flexDirection: 'row',
    gap: 10,
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  serviceName: { fontSize: 18, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 4 },
  infoGrid: { gap: 10 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 14, flexShrink: 1 },
});
