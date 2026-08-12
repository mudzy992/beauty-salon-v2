import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { borderRadius } from '../../theme';
import type { ReservationStatus } from '../../types';

interface BadgeProps {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  /** Ako je naveden, koriste se boje teme za status (zlatno/champagne/ružičasto). */
  status?: ReservationStatus;
  size?: 'sm' | 'md' | 'lg';
}

const STATUS_VARIANT_MAP: Record<ReservationStatus, NonNullable<BadgeProps['variant']>> = {
  PENDING: 'warning',
  STYLIST_REVIEW: 'info',
  CONFIRMED: 'success',
  ATTENDANCE_CONFIRMED: 'success',
  IN_PROGRESS: 'info',
  AWAITING_DAILY_LOG: 'warning',
  COMPLETED: 'default',
  CANCELLED_BY_CLIENT: 'error',
  CANCELLED_BY_STYLISTS: 'error',
  NO_SHOW: 'error',
};

export function getStatusVariant(status: ReservationStatus): NonNullable<BadgeProps['variant']> {
  return STATUS_VARIANT_MAP[status] ?? 'default';
}

export function Badge({ label, variant = 'default', status, size = 'sm' }: BadgeProps) {
  const { colors } = useTheme();

  const variantColors: Record<NonNullable<BadgeProps['variant']>, { bg: string; text: string }> = {
    default: { bg: colors.accent, text: colors.text },
    success: { bg: colors.successLight, text: colors.success },
    warning: { bg: colors.warningLight, text: colors.warning },
    error: { bg: colors.errorLight, text: colors.error },
    info: { bg: colors.infoLight, text: colors.info },
  };

  const effectiveVariant: NonNullable<BadgeProps['variant']> = status ? getStatusVariant(status) : variant;
  const v = variantColors[effectiveVariant];
  const isSmall = size === 'sm';
  const isLarge = size === 'lg';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: v.bg,
          paddingVertical: isSmall ? 2 : isLarge ? 6 : 4,
          paddingHorizontal: isSmall ? 8 : isLarge ? 14 : 12,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: v.text, fontSize: isSmall ? 11 : isLarge ? 14 : 13 },
        ]}
        selectable
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
