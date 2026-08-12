import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { spacing } from '../../theme';
import type { LatestAndroidRelease } from './apk-update';

type Props = {
  release: LatestAndroidRelease | null;
  downloading: boolean;
  progress: number;
  error: string | null;
  onUpdate: () => void;
};

export const ApkForceUpdateModal = ({
  release,
  downloading,
  progress,
  error,
  onUpdate,
}: Props) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  if (!release) return null;
  return (
    <Modal visible animationType="fade" transparent>
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.65)' }]}>
        <Card style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>{t('appUpdate.forceTitle')}</Text>
          <Text style={{ color: colors.textSecondary }}>
            {t('appUpdate.available', { version: release.version })}
          </Text>
          {release.releaseNotes ? (
            <Text style={[styles.notes, { color: colors.textMuted }]}>{release.releaseNotes}</Text>
          ) : null}
          {downloading ? (
            <Text style={{ color: colors.primary, marginTop: spacing.sm }}>
              {t('appUpdate.downloading', { percent: Math.round(progress * 100) })}
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
