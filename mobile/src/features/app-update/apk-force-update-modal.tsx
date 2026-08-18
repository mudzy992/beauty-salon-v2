import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { spacing } from '../../theme';
import type { ApkInstallPhase, LatestAndroidRelease } from './apk-update';

type Props = {
  release: LatestAndroidRelease | null;
  isForce: boolean;
  downloading: boolean;
  progress: number;
  phase: ApkInstallPhase | 'idle';
  error: string | null;
  onUpdate: () => void;
  onLater?: () => void;
};

function resolveStatusKey(phase: ApkInstallPhase | 'idle'): string | null {
  if (phase === 'verify') return 'appUpdate.verifying';
  if (phase === 'install') return 'appUpdate.installing';
  if (phase === 'download') return 'appUpdate.downloading';
  return null;
}

export const ApkForceUpdateModal = ({
  release,
  isForce,
  downloading,
  progress,
  phase,
  error,
  onUpdate,
  onLater,
}: Props) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  if (!release) return null;
  const statusKey = resolveStatusKey(phase);
  const canPostpone = !isForce && !downloading && phase === 'idle';
  return (
    <Modal
      visible
      animationType="fade"
      transparent
      onRequestClose={canPostpone ? onLater : undefined}
    >
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.65)' }]}>
        <Card style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            {isForce ? t('appUpdate.forceTitle') : t('appUpdate.title')}
          </Text>
          <Text style={{ color: colors.textSecondary }}>
            {t('appUpdate.available', { version: release.version })}
          </Text>
          {release.releaseNotes ? (
            <Text style={[styles.notes, { color: colors.textMuted }]}>{release.releaseNotes}</Text>
          ) : null}
          {statusKey ? (
            <Text style={{ color: colors.primary, marginTop: spacing.sm }}>
              {phase === 'download'
                ? t(statusKey, { percent: Math.round(progress * 100) })
                : t(statusKey)}
            </Text>
          ) : null}
          {error ? <Text style={{ color: colors.error, marginTop: spacing.sm }}>{error}</Text> : null}
          <Button
            title={downloading ? t('appUpdate.downloadingShort') : t('appUpdate.update')}
            onPress={onUpdate}
            disabled={downloading}
            fullWidth
            style={{ marginTop: spacing.md }}
          />
          {canPostpone && onLater ? (
            <Button
              title={t('appUpdate.later')}
              onPress={onLater}
              variant="outline"
              fullWidth
              style={{ marginTop: spacing.sm }}
            />
          ) : null}
        </Card>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  card: { padding: spacing.lg },
  title: { fontSize: 18, fontWeight: '600', marginBottom: spacing.sm },
  notes: { marginTop: spacing.sm, fontSize: 13 },
});
