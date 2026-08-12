import React from 'react';
import { Text } from 'react-native';
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
  const { colors } = useTheme();
  return (
    <ReservationDetailModalShell visible={visible}>
      <Text style={[styles.title, { color: colors.text }]}>Kašnjenje termina</Text>
      <Text style={[styles.infoText, { color: colors.textSecondary }]}>
        Odaberite kako želite obraditi kašnjenje prije nastavka rada.
      </Text>
      <Button
        title="Rekalkuliši po stvarnom kašnjenju"
        onPress={() => {
          onClose();
          onActualOverrun();
        }}
        style={{ marginTop: spacing.md }}
      />
      <Input
        label="Ručni unos minuta"
        value={manualShiftMinutes}
        onChangeText={onManualShiftMinutesChange}
        keyboardType="number-pad"
      />
      <Button
        title="Rekalkuliši po ručnom unosu"
        onPress={() => {
          onClose();
          onManualMinutes();
        }}
        variant="outline"
      />
      <Button
        title="Ne pomjeraj termine (iskoristi kraću pauzu)"
        onPress={() => {
          onClose();
          onUseBreakOnly();
        }}
        variant="ghost"
      />
    </ReservationDetailModalShell>
  );
}
