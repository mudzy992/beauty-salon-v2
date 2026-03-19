import React from 'react';
import { View, StyleSheet, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { borderRadius, spacing } from '../../theme';
import { cardElevationStyle } from '../../theme/shadows';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padded?: boolean;
}

export function Card({ children, style, onPress, padded = true }: CardProps) {
  const { colors, isDark } = useTheme();

  const cardStyle: ViewStyle = {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: isDark ? 0 : 1,
    borderColor: colors.borderLight,
    borderCurve: 'continuous',
    ...cardElevationStyle(isDark),
  };

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [cardStyle, padded && styles.padded, { opacity: pressed ? 0.92 : 1 }, style]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={[cardStyle, padded && styles.padded, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  padded: {
    padding: spacing.md,
  },
});
