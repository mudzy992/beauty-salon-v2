import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, View } from 'react-native';
import { Card } from '../../../components/ui/Card';
import { useTheme } from '../../../hooks/useTheme';
import { reservationDetailModalStyles as styles } from './modal-styles';

type ReservationDetailModalShellProps = {
  visible: boolean;
  children: React.ReactNode;
};

export function ReservationDetailModalShell({
  visible,
  children,
}: ReservationDetailModalShellProps) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.contentWrap}
        >
          <Card style={{ ...styles.card, backgroundColor: colors.surface }}>{children}</Card>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
