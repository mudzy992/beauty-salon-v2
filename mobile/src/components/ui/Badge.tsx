import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { borderRadius } from '../../theme';
import { statusBadgeColors } from '../../theme/colors';
import type { ReservationStatus } from '../../types';

interface BadgeProps {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  /** Ako je naveden, koriste se boje teme za status (zlatno/champagne/ružičasto). */
  status?: ReservationStatus;
  size?: 'sm' | 'md';
}

const STATUS_VARIANT_MAP: Record<ReservationStatus, BadgeProps['variant']> = {
  PENDING: 'warning',
  STYLIST_REVIEW: 'info',
  CONFIRMED: 'success',
  ATTENDANCE_CONFIRMED: 'success',
  IN_PROGRESS: 'info',
  COMPLETED: 'default',
  CANCELLED_BY_CLIENT: 'error',
  CANCELLED_BY_STYLISTS: 'error',
  NO_SHOW: 'error',
};

export function getStatusVariant(status: ReservationStatus): BadgeProps['variant'] {
  return STATUS_VARIANT_MAP[status] || 'default';
}

export function Badge({ label, variant = 'default', status, size = 'sm' }: BadgeProps) {
  const { colors } = useTheme();

  const variantColors: Record<string, { bg: string; text: string }> = {
    default: { bg: colors.accent, text: colors.text },
    success: { bg: colors.successLight, text: colors.success },
    warning: { bg: colors.warningLight, text: colors.warning },
    error: { bg: colors.errorLight, text: colors.error },
    info: { bg: colors.infoLight, text: colors.info },
  };

  const themeStatusColors = status ? statusBadgeColors[status] : null;
  const v = themeStatusColors ?? variantColors[variant];
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: v.bg,
          paddingVertical: isSmall ? 2 : 4,
          paddingHorizontal: isSmall ? 8 : 12,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: v.text, fontSize: isSmall ? 11 : 13 },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '600',
  },
});
