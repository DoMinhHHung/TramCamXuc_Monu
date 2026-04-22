/**
 * ─────────────────────────────────────────────────────────────────────────────
 * LuxuryButton – Premium-styled button component
 * Offers multiple variants with visual depth and smooth interactions
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  PressableProps,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import themeUtils from '../config/themeUtils';

interface LuxuryButtonProps extends Omit<PressableProps, 'style'> {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  isLoading?: boolean;
  disabled?: boolean;
}

const SIZE_CONFIG = {
  small: {
    paddingHorizontal: themeUtils.spacing.md,
    paddingVertical: themeUtils.spacing.sm,
    fontSize: themeUtils.fontSize.sm,
  },
  medium: {
    paddingHorizontal: themeUtils.spacing.lg,
    paddingVertical: themeUtils.spacing.md,
    fontSize: themeUtils.fontSize.md,
  },
  large: {
    paddingHorizontal: themeUtils.spacing.xl,
    paddingVertical: themeUtils.spacing.lg,
    fontSize: themeUtils.fontSize.lg,
  },
} as const;

export const LuxuryButton: React.FC<LuxuryButtonProps> = ({
  label,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  isLoading = false,
  disabled = false,
  ...pressableProps
}) => {
  const { colors } = useTheme();
  const [isPressed, setIsPressed] = useState(false);

  const variantConfig = useMemo(() => ({
    primary: {
      backgroundGradient: [colors.accent, colors.accentBorder35] as const,
      textColor: colors.text,
      borderColor: colors.accent,
      shadow: themeUtils.shadowPresets.md,
    },
    secondary: {
      backgroundGradient: [colors.surfaceMid, colors.surface] as const,
      textColor: colors.accent,
      borderColor: colors.accentBorder25,
      shadow: themeUtils.shadowPresets.sm,
    },
    ghost: {
      backgroundGradient: [colors.surface, colors.surfaceLow] as const,
      textColor: colors.textSecondary,
      borderColor: colors.border,
      shadow: { shadowOpacity: 0 } as const,
    },
    danger: {
      backgroundGradient: ['#FF6B6B', '#CC4444'] as const,
      textColor: colors.text,
      borderColor: '#FF6B6B',
      shadow: themeUtils.shadowPresets.md,
    },
  }), [colors]);

  const currentVariant = variantConfig[variant];
  const currentSize = SIZE_CONFIG[size];

  const containerStyle = useMemo(() => [
    staticStyles.container,
    { borderRadius: themeUtils.borderRadius.lg, ...currentVariant.shadow },
    fullWidth && staticStyles.fullWidth,
    { opacity: isPressed && !disabled ? 0.8 : disabled ? 0.5 : 1 },
  ], [currentVariant.shadow, fullWidth, isPressed, disabled]);

  const gradientStyle = useMemo(() => [
    staticStyles.gradient,
    {
      paddingHorizontal: currentSize.paddingHorizontal,
      paddingVertical: currentSize.paddingVertical,
      borderWidth: 1.5,
      borderColor: currentVariant.borderColor,
      borderRadius: themeUtils.borderRadius.lg,
    },
  ], [currentSize, currentVariant.borderColor]);

  return (
    <Pressable
      style={containerStyle}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      disabled={disabled || isLoading}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || isLoading }}
      {...pressableProps}
    >
      <LinearGradient
        colors={currentVariant.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={gradientStyle}
      >
        <Text style={[staticStyles.text, { fontSize: currentSize.fontSize, color: currentVariant.textColor }]}>
          {isLoading ? '...' : label}
        </Text>
      </LinearGradient>
    </Pressable>
  );
};

const staticStyles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  fullWidth: {
    width: '100%',
  },
  gradient: {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: themeUtils.spacing.sm,
  },
  text: {
    fontWeight: '600',
  },
});

export default LuxuryButton;
