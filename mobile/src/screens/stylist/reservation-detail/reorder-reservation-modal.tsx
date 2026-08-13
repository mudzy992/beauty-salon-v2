import React from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { DateTimeField } from '../../../components/ui/DateTimeField';
import { useTheme } from '../../../hooks/useTheme';
import { spacing } from '../../../theme';
import {
  durationMinutesFromRange,
  normalizeHm,
} from '../../../utils/reservation-time';
import { reservationDetailModalStyles as styles } from './modal-styles';
import { ReservationDetailModalShell } from './reservation-detail-modal-shell';

type ReorderReservationModalProps = {
  visible: boolean;
  startTime: string;
  endTime: string;
  submitting: boolean;
  onStartTimeChange: (value: string) => void;
  onEndTimeChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function ReorderReservationModal({
  visible,
  startTime,
  endTime,
  submitting,
  onStartTimeChange,
  onEndTimeChange,
  onClose,
  onSubmit,
}: ReorderReservationModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const previewStart = normalizeHm(startTime);
  const previewEnd = normalizeHm(endTime);
  const previewDuration = durationMinutesFromRange(startTime, endTime);

  return (
    <ReservationDetailModalShell visible={visible} onClose={onClose}>
      <Text style={[styles.title, { color: colors.text }]}>Reorder termina</Text>
      <Text style={{ color: colors.textSecondary, marginBottom: spacing.sm }}>
        Odaberite novo vrijeme. Kraj se automatski računa iz trajanja kad mijenjate početak.
      </Text>
      <DateTimeField
        label="Novi početak"
        mode="time"
        value={startTime}
        onChange={onStartTimeChange}
      />
      <DateTimeField label="Novi kraj" mode="time" value={endTime} onChange={onEndTimeChange} />
      <Text style={{ color: colors.textSecondary, marginBottom: spacing.sm }}>
        Pregled:{' '}
        {previewStart && previewEnd
          ? `${previewStart} – ${previewEnd} (${previewDuration} min)`
          : '—'}
      </Text>
      <View style={styles.actions}>
        <Button title={t('common.cancel')} onPress={onClose} variant="outline" style={styles.btn} />
        <Button title="Pošalji klijentu" onPress={onSubmit} loading={submitting} style={styles.btn} />
      </View>
    </ReservationDetailModalShell>
  );
}
