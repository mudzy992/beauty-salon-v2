import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { spacing } from '../../theme';
import {
  DISPOSITION_ACTION_KEYS,
  DISPOSITION_ACTION_LABELS,
  type DispositionAction,
} from './disposition-copy';

type Props = {
  visible: boolean;
  colors: { text: string; textSecondary: string; surface: string; error?: string; warning: string };
  onClose: () => void;
  onSelect: (action: DispositionAction) => void;
};

export const DispositionActionMenuModal = ({ visible, colors, onClose, onSelect }: Props) => (
  <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <Card style={{ ...styles.modalCard, backgroundColor: colors.surface, zIndex: 1 }}>
        <Text style={[styles.title, { color: colors.text }]}>Izuzeci za rezervaciju</Text>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Naplata je Završi zapis. Ovdje: otkaz, no-show ili pomjeranje.
        </Text>
        {DISPOSITION_ACTION_KEYS.map((key) => (
          <Button
            key={key}
            title={DISPOSITION_ACTION_LABELS[key]}
            variant={key === 'no_show' ? 'ghost' : 'outline'}
            textStyle={key === 'no_show' ? { color: colors.error ?? colors.warning } : undefined}
            onPress={() => onSelect(key)}
            style={{ marginBottom: spacing.xs }}
            fullWidth
          />
        ))}
        <Button title="Odustani" variant="outline" onPress={onClose} fullWidth />
      </Card>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: '700', marginBottom: spacing.xs },
  hint: { fontSize: 13, lineHeight: 18, marginBottom: spacing.sm },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: spacing.md,
  },
  backdrop: { ...StyleSheet.absoluteFillObject },
  modalCard: { padding: spacing.md, gap: spacing.sm },
});
