import React from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message }: LoadingScreenProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator
        size="large"
        color={colors.primary}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={t('common.loading')}
        accessibilityState={{ busy: true }}
        accessibilityLiveRegion="polite"
      />
      {message && (
        <Text style={[styles.message, { color: colors.textSecondary }]} selectable>
          {message}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    marginTop: 24,
    fontSize: 16,
    paddingHorizontal: 32,
    textAlign: 'center',
  },
});
