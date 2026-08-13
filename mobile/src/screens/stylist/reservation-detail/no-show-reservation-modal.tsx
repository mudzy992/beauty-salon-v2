import React from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useTheme } from '../../../hooks/useTheme';
import { spacing } from '../../../theme';
import { reservationDetailModalStyles as styles } from './modal-styles';
import { ReservationDetailModalShell } from './reservation-detail-modal-shell';

type NoShowReservationModalProps = {
  visible: boolean;
  reason: string;
  applyPenalty: boolean;
  submitting: boolean;
  onReasonChange: (value: string) => void;
  onTogglePenalty: () => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function NoShowReservationModal({
  visible,
  reason,
  applyPenalty,
  submitting,
  onReasonChange,
  onTogglePenalty,
  onClose,
  onSubmit,
}: NoShowReservationModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <ReservationDetailModalShell visible={visible} onClose={onClose}>
      <Text style={[styles.title, { color: colors.text }]}>Klijent se nije pojavio</Text>
      <Input
        label="Obrazloženje"
        value={reason}
        onChangeText={onReasonChange}
        placeholder="Npr. Klijent se nije pojavio na termin"
        multiline
      />
      <View style={styles.actions}>
        <Button
          title={applyPenalty ? 'Penal: DA' : 'Penal: NE'}
          onPress={onTogglePenalty}
          variant={applyPenalty ? 'primary' : 'outline'}
          style={styles.btn}
        />
        <Button title="Označi no-show" onPress={onSubmit} loading={submitting} style={styles.btn} />
      </View>
      <Button
        title={t('common.cancel')}
        onPress={onClose}
        variant="ghost"
        textStyle={{ color: colors.textSecondary }}
        style={{ marginTop: spacing.sm }}
      />
    </ReservationDetailModalShell>
  );
}
