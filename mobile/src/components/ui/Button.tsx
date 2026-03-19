import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
  type StyleProp,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import { borderRadius, spacing } from '../../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
  icon,
}: ButtonProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const sizeStyles: Record<string, { paddingVertical: number; paddingHorizontal: number; fontSize: number }> = {
    sm: { paddingVertical: 8, paddingHorizontal: 16, fontSize: 14 },
    md: { paddingVertical: 14, paddingHorizontal: 24, fontSize: 16 },
    lg: { paddingVertical: 18, paddingHorizontal: 32, fontSize: 18 },
  };

  const variantStyles: Record<string, { bg: string; text: string; border?: string }> = {
    primary: { bg: colors.primary, text: colors.primaryText },
    secondary: { bg: colors.secondary, text: colors.white },
    outline: { bg: 'transparent', text: colors.primary, border: colors.primary },
    ghost: { bg: 'transparent', text: colors.primary },
  };

  const s = sizeStyles[size];
  const v = variantStyles[variant];

  const inactive = disabled || loading;

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={inactive}
      onPressIn={() => {
        if (!inactive) scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 14, stiffness: 320 });
      }}
      style={[
        styles.base,
        animatedStyle,
        {
          backgroundColor: v.bg,
          paddingVertical: s.paddingVertical,
          paddingHorizontal: s.paddingHorizontal,
          borderColor: v.border || 'transparent',
          borderWidth: v.border ? 1.5 : 0,
          opacity: inactive ? 0.42 : 1,
          borderCurve: 'continuous',
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text} size="small" />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              { color: v.text, fontSize: s.fontSize },
              icon ? { marginLeft: spacing.sm } : undefined,
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    fontWeight: '600',
  },
});
