import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card } from '../../../components/ui/Card';
import { useTheme } from '../../../hooks/useTheme';
import { reservationDetailModalStyles as styles } from './modal-styles';

type ReservationDetailModalShellProps = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

export function ReservationDetailModalShell({
  visible,
  onClose,
  children,
}: ReservationDetailModalShellProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheetAbsoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
        />
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

const StyleSheetAbsoluteFill = {
  position: 'absolute' as const,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};
