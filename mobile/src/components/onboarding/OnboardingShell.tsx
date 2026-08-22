import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { spacing } from '../../theme';
import { fontFamily } from '../../theme/fonts';

type Props = {
  step: number;
  totalSteps: number;
  title: string;
  subtitle: string;
  tip?: string;
  children: React.ReactNode;
  /** Large faint icons behind content */
  heroDecoration?: 'lock' | 'gender' | 'mail' | 'phone' | 'none';
};

export function OnboardingShell({
  step,
  totalSteps,
  title,
  subtitle,
  tip,
  children,
  heroDecoration = 'none',
}: Props) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const decoSize = Math.min(220, width * 0.55);
  const mainOp = isDark ? 0.12 : 0.07;
  const accentOp = isDark ? 0.2 : 0.11;

  const deco =
    heroDecoration === 'lock'
      ? { main: 'lock-closed-outline' as const, accent: 'key-outline' as const, accentScale: 0.28 }
      : heroDecoration === 'gender'
        ? { main: 'male-female-outline' as const, accent: 'person-outline' as const, accentScale: 0.3 }
        : heroDecoration === 'mail'
          ? { main: 'mail-outline' as const, accent: 'send-outline' as const, accentScale: 0.26 }
          : heroDecoration === 'phone'
            ? { main: 'call-outline' as const, accent: 'chatbubble-ellipses-outline' as const, accentScale: 0.28 }
            : null;

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + spacing.md,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      {deco ? (
        <View style={styles.decoLayer} pointerEvents="none">
          <Ionicons
            name={deco.main}
            size={decoSize}
            color={colors.primary}
            style={[styles.decoIconMain, { opacity: mainOp }]}
          />
          <Ionicons
            name={deco.accent}
            size={decoSize * deco.accentScale}
            color={colors.primary}
            style={[styles.decoIconAccent, { opacity: accentOp }]}
          />
        </View>
      ) : null}

      <View style={styles.foreground}>
        <View style={styles.progressRow}>
          {Array.from({ length: totalSteps }, (_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i < step ? colors.primary : colors.border,
                  opacity: i < step ? 1 : 0.35,
                },
              ]}
            />
          ))}
          <Text style={[styles.stepLabel, { color: colors.textSecondary }]}>
            {step}/{totalSteps}
          </Text>
        </View>

        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>

        {tip ? (
          <View style={[styles.tipBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="bulb-outline" size={20} color={colors.primary} />
            <Text style={[styles.tipText, { color: colors.text }]}>{tip}</Text>
          </View>
        ) : null}

        <View style={styles.body}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    overflow: 'hidden',
  },
  foreground: {
    flex: 1,
    zIndex: 1,
  },
  decoLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  decoIconMain: {
    position: 'absolute',
    right: -28,
    bottom: '12%',
  },
  decoIconAccent: {
    position: 'absolute',
    right: spacing.xxl + 8,
    top: '18%',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.lg,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stepLabel: {
    marginLeft: 'auto',
    fontSize: 13,
    fontFamily: fontFamily.bodyMedium,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    marginBottom: spacing.sm,
    fontFamily: fontFamily.heading,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  body: {
    flex: 1,
    marginTop: spacing.xs,
  },
});
