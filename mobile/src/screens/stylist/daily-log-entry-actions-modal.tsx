import React from 'react';
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
}: Props) => (
  <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <Card style={{ ...styles.modalCard, backgroundColor: colors.surface, zIndex: 1 }}>
        <Text style={[styles.title, { color: colors.text }]}>Akcije zapisa</Text>
        <Button title="Uredi unos" variant="outline" onPress={onEdit} style={styles.item} fullWidth />
        <Button
          title="Dodaj sliku prije"
          variant="outline"
          onPress={onAddBeforePhoto}
          style={styles.item}
          fullWidth
        />
        <Button
          title="Dodaj sliku poslije"
          variant="outline"
          onPress={onAddAfterPhoto}
          style={styles.item}
          fullWidth
        />
        <Button
          title="Obriši unos"
          variant="ghost"
          textStyle={{ color: colors.error }}
          onPress={onDelete}
          style={styles.item}
          fullWidth
        />
        <Button title="Odustani" variant="outline" onPress={onClose} fullWidth />
      </Card>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: '700', marginBottom: spacing.sm },
  item: { marginBottom: spacing.xs },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: spacing.md,
  },
  backdrop: { ...StyleSheet.absoluteFillObject },
  modalCard: { padding: spacing.md, gap: spacing.sm },
});
