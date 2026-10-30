import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Pressable,
} from 'react-native';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { DateTimeField } from '../../components/ui/DateTimeField';
import { Input } from '../../components/ui/Input';
import api from '../../services/api';
import { spacing } from '../../theme';
import { useTranslation } from 'react-i18next';
import type { DailyLogEntry } from '../../types';
import { DispositionActionMenuModal } from './disposition-action-menu-modal';
import {
  DISPOSITION_ACTION_HINT_KEYS,
  DISPOSITION_ACTION_LABEL_KEYS,
  type DispositionAction,
} from './disposition-copy';

type Props = {
  entry: DailyLogEntry;
  colors: {
    text: string;
    textSecondary: string;
    surface: string;
    border: string;
    warning: string;
    error?: string;
  };
  onDone: () => void;
};

export function DailyLogDispositionPanel({ entry, colors, onDone }: Props) {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [action, setAction] = useState<DispositionAction | null>(null);
  const [reason, setReason] = useState('');
  const [targetDate, setTargetDate] = useState(
    String(entry.reservation?.reservationDate ?? entry.date ?? '').slice(0, 10),
  );
  const [targetStartTime, setTargetStartTime] = useState(
    entry.reservation?.startTime?.slice(0, 5) ?? '09:00',
  );
  const [targetEndTime, setTargetEndTime] = useState(
    entry.reservation?.endTime?.slice(0, 5) ?? '10:00',
  );
  const [submitting, setSubmitting] = useState(false);

  const showPanel =
    entry.status === 'PENDING' &&
    entry.reservation?.status === 'AWAITING_DAILY_LOG';

  const openAction = useCallback((next: DispositionAction) => {
    setMenuOpen(false);
    setAction(next);
    setReason('');
    setModalOpen(true);
  }, []);

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
          t('stylist.dailyLogDetail.dispositionReorderSuccessTitle'),
          t('stylist.dailyLogDetail.dispositionReorderSuccessMessage'),
          [{ text: t('stylist.dailyLogDetail.dispositionReorderSuccessOk'), onPress: onDone }],
        );
      } else {
        onDone();
      }
    } finally {
      setSubmitting(false);
    }
  }, [action, entry.id, onDone, reason, t, targetDate, targetEndTime, targetStartTime]);

  if (!showPanel) return null;

  return (
    <>
      <Card style={[styles.card, { borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>{t('stylist.dailyLogDetail.dispositionPanelTitle')}</Text>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('stylist.dailyLogDetail.dispositionPanelHint')}</Text>
        <Button title={t('stylist.dailyLogDetail.dispositionOpenMenu')} variant="outline" onPress={() => setMenuOpen(true)} />
      </Card>

      <DispositionActionMenuModal
        visible={menuOpen}
        colors={colors}
        onClose={() => setMenuOpen(false)}
        onSelect={openAction}
      />

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.backdrop} onPress={() => setModalOpen(false)} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ width: '100%', zIndex: 1 }}
          >
            <Card style={{ ...styles.modalCard, backgroundColor: colors.surface }}>
              <Text style={[styles.title, { color: colors.text }]}>
                {action ? t(DISPOSITION_ACTION_LABEL_KEYS[action]) : t('stylist.dailyLogDetail.dispositionActionFallback')}
              </Text>
              {action ? (
                <Text style={[styles.hint, { color: colors.textSecondary }]}>
                  {t(DISPOSITION_ACTION_HINT_KEYS[action])}
                </Text>
              ) : null}
              {action === 'reorder' ? (
                <>
                  <DateTimeField label={t('stylist.dailyLogDetail.dispositionNewDate')} mode="date" value={targetDate} onChange={setTargetDate} />
                  <DateTimeField
                    label={t('stylist.dailyLogDetail.dispositionNewStart')}
                    mode="time"
                    value={targetStartTime}
                    onChange={setTargetStartTime}
                  />
                  <DateTimeField
                    label={t('stylist.dailyLogDetail.dispositionNewEnd')}
                    mode="time"
                    value={targetEndTime}
                    onChange={setTargetEndTime}
                  />
                </>
              ) : null}
              <Input
                label={t('stylist.dailyLogDetail.dispositionReasonLabel')}
                value={reason}
                onChangeText={setReason}
                multiline
                placeholder={t('stylist.dailyLogDetail.dispositionReasonPlaceholder')}
              />
              <View style={styles.modalActions}>
                <Button
                  title={t('stylist.dailyLogDetail.dispositionCancel')}
                  variant="outline"
                  onPress={() => setModalOpen(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  title={t('stylist.dailyLogDetail.dispositionConfirm')}
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
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  modalCard: { padding: spacing.md, gap: spacing.sm },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
});
