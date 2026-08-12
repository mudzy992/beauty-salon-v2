import React from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useTheme } from '../../../hooks/useTheme';
import { reservationDetailModalStyles as styles } from './modal-styles';
import { ReservationDetailModalShell } from './reservation-detail-modal-shell';

type CancelReservationModalProps = {
  visible: boolean;
  reason: string;
  submitting: boolean;
  onReasonChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function CancelReservationModal({
  visible,
  reason,
  submitting,
  onReasonChange,
  onClose,
  onSubmit,
}: CancelReservationModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <ReservationDetailModalShell visible={visible}>
      <Text style={[styles.title, { color: colors.text }]}>{t('stylist.schedule.cancelTitle')}</Text>
      <Input
        label={t('stylist.schedule.cancelReasonLabel')}
        value={reason}
        onChangeText={onReasonChange}
        placeholder={t('stylist.schedule.cancelReasonPlaceholder')}
        multiline
      />
      <View style={styles.actions}>
        <Button title={t('common.cancel')} onPress={onClose} variant="outline" style={styles.btn} />
        <Button
          title={t('stylist.schedule.cancelConfirm')}
          onPress={onSubmit}
          loading={submitting}
          style={styles.btn}
        />
      </View>
    </ReservationDetailModalShell>
  );
}
