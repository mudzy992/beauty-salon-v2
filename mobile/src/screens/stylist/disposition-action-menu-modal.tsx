import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { spacing } from '../../theme';

export type DispositionAction =
  | 'discard'
  | 'reorder'
  | 'cancel_as_client'
  | 'cancel_as_stylist'
  | 'no_show';

export const DISPOSITION_ACTION_LABELS: Record<DispositionAction, string> = {
  discard: 'Obriši zapis i rezervaciju',
  reorder: 'Pomjeri termin',
  cancel_as_client: 'Otkaži u ime klijenta',
  cancel_as_stylist: 'Otkaži u svoje ime',
  no_show: 'Označi no-show',
};

const ACTION_KEYS = Object.keys(DISPOSITION_ACTION_LABELS) as DispositionAction[];

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
        <Text style={[styles.title, { color: colors.text }]}>Upravljanje rezervacijom</Text>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Odaberite akciju za direktnu rezervaciju.
        </Text>
        {ACTION_KEYS.map((key) => (
          <Button
            key={key}
            title={DISPOSITION_ACTION_LABELS[key]}
            variant={key === 'discard' || key === 'no_show' ? 'ghost' : 'outline'}
            textStyle={
              key === 'discard' || key === 'no_show'
                ? { color: colors.error ?? colors.warning }
                : undefined
            }
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
