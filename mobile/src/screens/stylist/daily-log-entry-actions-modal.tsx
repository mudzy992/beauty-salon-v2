import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { spacing } from '../../theme';

type Props = {
  visible: boolean;
  colors: { text: string; surface: string; error?: string };
  onClose: () => void;
  onEdit: () => void;
  onAddBeforePhoto: () => void;
  onAddAfterPhoto: () => void;
  onDelete: () => void;
};

export const DailyLogEntryActionsModal = ({
  visible,
  colors,
  onClose,
  onEdit,
  onAddBeforePhoto,
  onAddAfterPhoto,
  onDelete,
}: Props) => {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Card style={{ ...styles.modalCard, backgroundColor: colors.surface, zIndex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>
            {t('stylist.dailyLogDetail.actionsMenuTitle')}
          </Text>
          <Button
            title={t('stylist.dailyLogDetail.actionsMenuEdit')}
            variant="outline"
            onPress={onEdit}
            style={styles.item}
            fullWidth
          />
          <Button
            title={t('stylist.dailyLogDetail.actionsMenuAddBeforePhoto')}
            variant="outline"
            onPress={onAddBeforePhoto}
            style={styles.item}
            fullWidth
          />
          <Button
            title={t('stylist.dailyLogDetail.actionsMenuAddAfterPhoto')}
            variant="outline"
            onPress={onAddAfterPhoto}
            style={styles.item}
            fullWidth
          />
          <Button
            title={t('stylist.dailyLogDetail.actionsMenuDelete')}
            variant="ghost"
            textStyle={{ color: colors.error }}
            onPress={onDelete}
            style={styles.item}
            fullWidth
          />
          <Button
            title={t('stylist.dailyLogDetail.actionsMenuCancel')}
            variant="outline"
            onPress={onClose}
            fullWidth
          />
        </Card>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: '700', marginBottom: spacing.sm },
  item: { marginBottom: spacing.xs },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: spacing.md,
  },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  modalCard: { padding: spacing.md, gap: spacing.sm },
});
