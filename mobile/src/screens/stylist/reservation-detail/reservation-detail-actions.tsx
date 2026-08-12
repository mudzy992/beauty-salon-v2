import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { spacing } from '../../../theme';
import { useTheme } from '../../../hooks/useTheme';
import type { Reservation } from '../../../types';
import { isStaffWaivedAttendance } from './utils/reservation-detail';

type ReservationDetailActionsProps = {
  reservation: Reservation;
  profileId: string | undefined;
  canStart: boolean;
  canComplete: boolean;
  canMarkNoShow: boolean;
  canCancelByStylist: boolean;
  hasAnyAction: boolean;
  isStartOverdue: boolean;
  startBlockedReason: string | null;
  startSubmitting: boolean;
  onStart: () => void;
  onOpenOverrun: () => void;
  onOpenComplete: () => void;
  onOpenNoShow: () => void;
  onOpenCancel: () => void;
  onOpenReorder: () => void;
};

export const ReservationDetailActions = ({
  reservation,
  profileId,
  canStart,
  canComplete,
  canMarkNoShow,
  canCancelByStylist,
  hasAnyAction,
  isStartOverdue,
  startBlockedReason,
  startSubmitting,
  onStart,
  onOpenOverrun,
  onOpenComplete,
  onOpenNoShow,
  onOpenCancel,
  onOpenReorder,
}: ReservationDetailActionsProps) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  if (!hasAnyAction) return null;

  return (
    <Card style={[styles.card, { borderWidth: 1, borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Akcije</Text>
      {canStart ? (
        <Button
          title={isStartOverdue ? 'Obradi kašnjenje termina' : 'Startuj rezervaciju'}
          onPress={isStartOverdue ? onOpenOverrun : onStart}
          loading={startSubmitting}
          disabled={!!startBlockedReason}
          style={{ marginBottom: spacing.sm }}
        />
      ) : null}
      {canStart && startBlockedReason ? (
        <View style={[styles.infoItem, { alignItems: 'flex-start', marginTop: -4 }]}>
          <Ionicons name="lock-closed-outline" size={16} color={colors.warning} />
          <Text style={[styles.infoText, { color: colors.warning, flex: 1 }]}>
            {startBlockedReason}
          </Text>
        </View>
      ) : null}
      {canComplete ? (
        <Button
          title={t('stylist.schedule.completeSubmit')}
          onPress={onOpenComplete}
          style={{ marginBottom: spacing.sm }}
        />
      ) : null}
      {canMarkNoShow ? (
        <Button
          title="Klijent se nije pojavio (no-show)"
          onPress={onOpenNoShow}
          variant="outline"
          textStyle={{ color: colors.error }}
          style={{ marginBottom: spacing.sm }}
        />
      ) : null}
      {canCancelByStylist ? (
        <Button
          title={t('stylist.schedule.cancelWithReason')}
          onPress={onOpenCancel}
          variant="outline"
          textStyle={{ color: colors.error }}
        />
      ) : null}
      {(reservation.status === 'CONFIRMED' || reservation.status === 'ATTENDANCE_CONFIRMED') &&
      reservation.confirmedStylistId === profileId &&
      !isStartOverdue &&
      !isStaffWaivedAttendance(reservation) ? (
        <Button
          title="Predloži pomjeranje termina (reorder)"
          onPress={onOpenReorder}
          variant="outline"
          style={{ marginTop: spacing.sm }}
        />
      ) : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: spacing.sm },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 14, flexShrink: 1 },
});
