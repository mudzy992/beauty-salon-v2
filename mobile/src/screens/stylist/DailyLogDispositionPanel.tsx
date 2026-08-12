import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
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
  const [targetDate, setTargetDate] = useState(
    String(entry.reservation?.reservationDate ?? entry.date ?? '').slice(0, 10),
  );
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

  const openMenu = useCallback(() => {
    Alert.alert(
      'Upravljanje rezervacijom',
      'Odaberite akciju za direktnu rezervaciju.',
      [
        ...(Object.keys(ACTION_LABELS) as DispositionAction[]).map((key) => ({
          text: ACTION_LABELS[key],
          onPress: () => openAction(key),
          style: (key === 'discard' || key === 'no_show' ? 'destructive' : 'default') as
            | 'default'
            | 'cancel'
            | 'destructive',
        })),
        { text: 'Odustani', style: 'cancel' as const },
      ],
    );
  }, [openAction]);

  const handleSubmit = useCallback(async () => {
    if (!action) return;
    const trimmed = reason.trim();
    if (!trimmed) return;
    if (action === 'reorder') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate.trim())) return;
      if (!/^\d{2}:\d{2}$/.test(targetStartTime.trim())) return;
      if (!/^\d{2}:\d{2}$/.test(targetEndTime.trim())) return;
    }
    setSubmitting(true);
    try {
      await api.post(`/api/daily-log/${entry.id}/dispose`, {
        action,
        reason: trimmed,
        targetDate: action === 'reorder' ? targetDate.trim() : undefined,
        targetStartTime: action === 'reorder' ? targetStartTime.trim() : undefined,
        targetEndTime: action === 'reorder' ? targetEndTime.trim() : undefined,
        applyPenalty: action === 'no_show' || action === 'cancel_as_client',
      });
      setModalOpen(false);
      if (action === 'reorder') {
        Alert.alert(
          'Termin pomjeren',
          'Novi datum i vrijeme su odmah primijenjeni. Klijent ne mora potvrđivati.',
          [{ text: 'U redu', onPress: onDone }],
        );
      } else {
        onDone();
      }
    } finally {
      setSubmitting(false);
    }
  }, [
    action,
    entry.id,
    onDone,
    reason,
    targetDate,
    targetEndTime,
    targetStartTime,
  ]);

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
        <Button title="Akcije rezervacije" variant="outline" onPress={openMenu} />
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
                    label="Novi datum"
                    value={targetDate}
                    onChangeText={setTargetDate}
                    placeholder="YYYY-MM-DD"
                  />
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: spacing.md,
  },
  modalCard: { padding: spacing.md, gap: spacing.sm },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
});
