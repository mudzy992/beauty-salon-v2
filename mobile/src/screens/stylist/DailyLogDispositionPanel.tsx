import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import api from '../../services/api';
import { spacing } from '../../theme';
import type { DailyLogEntry } from '../../types';

type DispositionAction =
  | 'discard'
  | 'reorder'
  | 'cancel_as_client'
  | 'cancel_as_stylist'
  | 'no_show';

const ACTION_LABELS: Record<DispositionAction, string> = {
  discard: 'Obriši zapis i rezervaciju',
  reorder: 'Pomjeri termin',
  cancel_as_client: 'Otkaži u ime klijenta',
  cancel_as_stylist: 'Otkaži u svoje ime',
  no_show: 'Označi no-show',
};

type Props = {
  entry: DailyLogEntry;
  colors: {
    text: string;
    textSecondary: string;
    surface: string;
    border: string;
    warning: string;
  };
  onDone: () => void;
};

export function DailyLogDispositionPanel({ entry, colors, onDone }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [action, setAction] = useState<DispositionAction | null>(null);
  const [reason, setReason] = useState('');
  const [targetStartTime, setTargetStartTime] = useState(
    entry.reservation?.startTime?.slice(0, 5) ?? '',
  );
  const [targetEndTime, setTargetEndTime] = useState(
    entry.reservation?.endTime?.slice(0, 5) ?? '',
  );
  const [submitting, setSubmitting] = useState(false);

  const showPanel =
    entry.status === 'PENDING' &&
    entry.reservation?.status === 'AWAITING_DAILY_LOG';

  const openAction = useCallback((next: DispositionAction) => {
    setAction(next);
    setReason('');
    setModalOpen(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!action) return;
    const trimmed = reason.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      await api.post(`/api/daily-log/${entry.id}/dispose`, {
        action,
        reason: trimmed,
        targetStartTime: action === 'reorder' ? targetStartTime : undefined,
        targetEndTime: action === 'reorder' ? targetEndTime : undefined,
        applyPenalty: action === 'no_show' || action === 'cancel_as_client',
      });
      setModalOpen(false);
      onDone();
    } finally {
      setSubmitting(false);
    }
  }, [action, entry.id, onDone, reason, targetEndTime, targetStartTime]);

  if (!showPanel) return null;

  return (
    <>
      <Card style={[styles.card, { borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          Upravljanje direktnom rezervacijom
        </Text>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Rezervacija je prešla u dnevnu knjigu. Završite zapis ili odaberite akciju.
        </Text>
        <View style={styles.actions}>
          {(Object.keys(ACTION_LABELS) as DispositionAction[]).map((key) => (
            <Button
              key={key}
              title={ACTION_LABELS[key]}
              variant="outline"
              size="sm"
              onPress={() => openAction(key)}
            />
          ))}
        </View>
      </Card>

      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ width: '100%' }}
          >
            <Card style={{ ...styles.modalCard, backgroundColor: colors.surface }}>
              <Text style={[styles.title, { color: colors.text }]}>
                {action ? ACTION_LABELS[action] : 'Akcija'}
              </Text>
              {action === 'reorder' ? (
                <>
                  <Input
                    label="Novi početak"
                    value={targetStartTime}
                    onChangeText={setTargetStartTime}
                    placeholder="09:00"
                  />
                  <Input
                    label="Novi kraj"
                    value={targetEndTime}
                    onChangeText={setTargetEndTime}
                    placeholder="10:00"
                  />
                </>
              ) : null}
              <Input
                label="Razlog"
                value={reason}
                onChangeText={setReason}
                multiline
                placeholder="Obrazloženje"
              />
              <View style={styles.modalActions}>
                <Button
                  title="Odustani"
                  variant="outline"
                  onPress={() => setModalOpen(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Potvrdi"
                  onPress={() => void handleSubmit()}
                  loading={submitting}
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md, padding: spacing.md, borderWidth: 1 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: spacing.xs },
  hint: { fontSize: 13, lineHeight: 18, marginBottom: spacing.sm },
  actions: { gap: spacing.sm },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: spacing.md,
  },
  modalCard: { padding: spacing.md, gap: spacing.sm },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
});
