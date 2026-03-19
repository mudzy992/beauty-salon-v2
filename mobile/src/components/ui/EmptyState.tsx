import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { borderRadius, spacing } from '../../theme';
import { Button } from './Button';
import { subtleShadow } from '../../theme/shadows';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = 'albums-outline', title, message, actionLabel, onAction }: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: colors.surface },
          subtleShadow(),
        ]}
      >
        <Ionicons name={icon} size={40} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.text }]} selectable>
        {title}
      </Text>
      {message && (
        <Text style={[styles.message, { color: colors.textSecondary }]} selectable>
          {message}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button title={actionLabel} onPress={onAction} variant="outline" size="sm" style={{ marginTop: spacing.lg }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    borderCurve: 'continuous',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 19,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
});
