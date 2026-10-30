import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/Button';
import { useTheme } from '../hooks/useTheme';

type ProfileRefreshNoticeProps = {
  loading: boolean;
  onRetry: () => void;
};

export function ProfileRefreshNotice({ loading, onRetry }: ProfileRefreshNoticeProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text accessibilityRole="text" style={[styles.message, { color: colors.text }]}>
        {t('auth.profileRefreshUnavailable')}
      </Text>
      <Button title={t('common.retry')} onPress={onRetry} loading={loading} variant="outline" size="sm" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  message: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
