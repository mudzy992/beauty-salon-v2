import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { spacing } from '../../theme';
import { useTranslation } from 'react-i18next';
import {
  DISPOSITION_ACTION_KEYS,
  DISPOSITION_ACTION_LABEL_KEYS,
  type DispositionAction,
} from './disposition-copy';

type Props = {
  visible: boolean;
  colors: { text: string; textSecondary: string; surface: string; error?: string; warning: string };
  onClose: () => void;
  onSelect: (action: DispositionAction) => void;
};

export const DispositionActionMenuModal = ({ visible, colors, onClose, onSelect }: Props) => {
  const { t } = useTranslation();

  return (
  <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <Card style={{ ...styles.modalCard, backgroundColor: colors.surface, zIndex: 1 }}>
        <Text style={[styles.title, { color: colors.text }]}>{t('stylist.dailyLogDetail.dispositionMenuTitle')}</Text>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          {t('stylist.dailyLogDetail.dispositionMenuHint')}
        </Text>
        {DISPOSITION_ACTION_KEYS.map((key) => (
          <Button
            key={key}
            title={t(DISPOSITION_ACTION_LABEL_KEYS[key])}
            variant={key === 'no_show' ? 'ghost' : 'outline'}
            textStyle={key === 'no_show' ? { color: colors.error ?? colors.warning } : undefined}
            onPress={() => onSelect(key)}
            style={{ marginBottom: spacing.xs }}
            fullWidth
          />
        ))}
        <Button title={t('stylist.dailyLogDetail.dispositionCancel')} variant="outline" onPress={onClose} fullWidth />
      </Card>
    </View>
  </Modal>
  );
};

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: '700', marginBottom: spacing.xs },
  hint: { fontSize: 13, lineHeight: 18, marginBottom: spacing.sm },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: spacing.md,
  },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  modalCard: { padding: spacing.md, gap: spacing.sm },
});
