import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/Button';
import { useTheme } from '../hooks/useTheme';
import type { SessionBootstrapError } from '../store/authStore';

type SessionBootstrapNoticeProps = {
  error: SessionBootstrapError;
  isRetrying: boolean;
  onRetry: () => Promise<void>;
};

export function SessionBootstrapNotice({ error, isRetrying, onRetry }: SessionBootstrapNoticeProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const messageKey = error === 'storage'
    ? 'auth.sessionStorageUnavailable'
    : error === 'network'
      ? 'auth.sessionNetworkUnavailable'
      : 'auth.sessionProfileUnavailable';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
          {t('auth.sessionCheckTitle')}
        </Text>
        <Text accessibilityRole="text" style={[styles.message, { color: colors.textSecondary }]}>
          {t(messageKey)}
        </Text>
        <Button
          title={t('common.retry')}
          onPress={() => { void onRetry(); }}
          loading={isRetrying}
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 21,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
});
