import React from 'react';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useTheme } from '../../../hooks/useTheme';
import { spacing } from '../../../theme';
import { reservationDetailModalStyles as styles } from './modal-styles';
import { ReservationDetailModalShell } from './reservation-detail-modal-shell';

type OverrunReservationModalProps = {
  visible: boolean;
  manualShiftMinutes: string;
  onManualShiftMinutesChange: (value: string) => void;
  onClose: () => void;
  onActualOverrun: () => void;
  onManualMinutes: () => void;
  onUseBreakOnly: () => void;
};

export function OverrunReservationModal({
  visible,
  manualShiftMinutes,
  onManualShiftMinutesChange,
  onClose,
  onActualOverrun,
  onManualMinutes,
  onUseBreakOnly,
}: OverrunReservationModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <ReservationDetailModalShell visible={visible} onClose={onClose}>
      <Text style={[styles.title, { color: colors.text }]}>
        {t('stylist.reservationDetail.overrun.title')}
      </Text>
      <Text style={[styles.infoText, { color: colors.textSecondary }]}>
        {t('stylist.reservationDetail.overrun.description')}
      </Text>
      <Button
        title={t('stylist.reservationDetail.overrun.actualOverrun')}
        onPress={() => {
          onClose();
          onActualOverrun();
        }}
        style={{ marginTop: spacing.md }}
      />
      <Input
        label={t('stylist.reservationDetail.overrun.manualMinutesLabel')}
        value={manualShiftMinutes}
        onChangeText={onManualShiftMinutesChange}
        keyboardType="number-pad"
      />
      <Button
        title={t('stylist.reservationDetail.overrun.manualMinutes')}
        onPress={() => {
          onClose();
          onManualMinutes();
        }}
        variant="outline"
      />
      <Button
        title={t('stylist.reservationDetail.overrun.useShorterBreak')}
        onPress={() => {
          onClose();
          onUseBreakOnly();
        }}
        variant="ghost"
      />
      <Button title={t('common.cancel')} onPress={onClose} variant="outline" style={{ marginTop: spacing.sm }} />
    </ReservationDetailModalShell>
  );
}
