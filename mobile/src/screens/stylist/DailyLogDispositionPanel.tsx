import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { useAuthStore } from '../../store/authStore';
import { getApiErrorMessage } from '../../utils/apiError';
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
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const panelIdentityRef = useRef({ entryId: entry.id, userId, generation: 0, mounted: true });
  if (panelIdentityRef.current.entryId !== entry.id || panelIdentityRef.current.userId !== userId) {
    panelIdentityRef.current = {
      entryId: entry.id,
      userId,
      generation: panelIdentityRef.current.generation + 1,
      mounted: panelIdentityRef.current.mounted,
    };
  }
  const activeActionTokenRef = useRef<number | null>(null);
  const actionSequenceRef = useRef(0);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    panelIdentityRef.current.mounted = true;
    return () => {
      panelIdentityRef.current.mounted = false;
      panelIdentityRef.current.generation += 1;
      activeActionTokenRef.current = null;
    };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setModalOpen(false);
    setAction(null);
    setReason('');
    setTargetDate(String(entry.reservation?.reservationDate ?? entry.date ?? '').slice(0, 10));
    setTargetStartTime(entry.reservation?.startTime?.slice(0, 5) ?? '09:00');
    setTargetEndTime(entry.reservation?.endTime?.slice(0, 5) ?? '10:00');
    setSubmitting(false);
    activeActionTokenRef.current = null;
  }, [entry.id, userId]);

  const showPanel =
    entry.status === 'PENDING' &&
    entry.reservation?.status === 'AWAITING_DAILY_LOG';

  const isCurrentIdentity = (expected: { entryId: string; userId: string | null; generation: number }) => {
    const current = panelIdentityRef.current;
    return (
      current.mounted &&
      current.entryId === expected.entryId &&
      current.userId === expected.userId &&
      current.generation === expected.generation &&
      useAuthStore.getState().user?.id === expected.userId
    );
  };

  const openAction = useCallback((next: DispositionAction) => {
    if (activeActionTokenRef.current !== null) return;
    setMenuOpen(false);
    setAction(next);
    setReason('');
    setModalOpen(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!action || activeActionTokenRef.current !== null) return;
    const trimmed = reason.trim();
    if (!trimmed) return;
    if (action === 'reorder') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate.trim())) return;
      if (!/^\d{2}:\d{2}$/.test(targetStartTime.trim())) return;
      if (!/^\d{2}:\d{2}$/.test(targetEndTime.trim())) return;
    }
    const expectedIdentity = {
      entryId: entry.id,
      userId,
      generation: panelIdentityRef.current.generation,
    };
    if (!userId || !isCurrentIdentity(expectedIdentity)) return;
    const token = ++actionSequenceRef.current;
    activeActionTokenRef.current = token;
    const isCurrentAction = () =>
      activeActionTokenRef.current === token && isCurrentIdentity(expectedIdentity);
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
      if (!isCurrentAction()) return;
      setModalOpen(false);
      if (action === 'reorder') {
        Alert.alert(
          t('stylist.dailyLogDetail.dispositionReorderSuccessTitle'),
          t('stylist.dailyLogDetail.dispositionReorderSuccessMessage'),
          [{
            text: t('stylist.dailyLogDetail.dispositionReorderSuccessOk'),
            onPress: () => {
              if (isCurrentIdentity(expectedIdentity)) onDoneRef.current();
            },
          }],
        );
      } else {
        onDoneRef.current();
      }
    } catch (error: unknown) {
      if (isCurrentAction()) {
        Alert.alert(
          t('common.error'),
          getApiErrorMessage(error, t('stylist.dailyLogDetail.dispositionErrorFallback')),
          [{
            text: t('common.ok'),
            onPress: () => {
              if (isCurrentIdentity(expectedIdentity)) onDoneRef.current();
            },
          }],
        );
      }
    } finally {
      const shouldUpdateCurrentAction = isCurrentAction();
      if (activeActionTokenRef.current === token) activeActionTokenRef.current = null;
      if (shouldUpdateCurrentAction) setSubmitting(false);
    }
  }, [action, entry.id, isCurrentIdentity, reason, t, targetDate, targetEndTime, targetStartTime, userId]);

  if (!showPanel) return null;

  return (
    <>
      <Card style={[styles.card, { borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>{t('stylist.dailyLogDetail.dispositionPanelTitle')}</Text>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('stylist.dailyLogDetail.dispositionPanelHint')}</Text>
        <Button title={t('stylist.dailyLogDetail.dispositionOpenMenu')} variant="outline" onPress={() => setMenuOpen(true)} disabled={submitting} />
      </Card>

      <DispositionActionMenuModal
        visible={menuOpen}
        colors={colors}
        onClose={() => setMenuOpen(false)}
        onSelect={openAction}
      />

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => { if (!submitting) setModalOpen(false); }}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.backdrop} onPress={() => { if (!submitting) setModalOpen(false); }} disabled={submitting} />
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
                  disabled={submitting}
                  style={{ flex: 1 }}
                />
                <Button
                  title={t('stylist.dailyLogDetail.dispositionConfirm')}
                  onPress={() => void handleSubmit()}
                  loading={submitting}
                  disabled={submitting}
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
