/**
 * ─────────────────────────────────────────────────────────────────────────────
 * LuxuryButton – Premium-styled button component
 * Offers multiple variants with visual depth and smooth interactions
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
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

  const sizeConfig = {
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
  };

  const current = sizeConfig[size];

  const variantConfig = {
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
      shadow: { shadowOpacity: 0 },
    },
    danger: {
      backgroundGradient: ['#FF6B6B', '#CC4444'] as const,
      textColor: colors.text,
      borderColor: '#FF6B6B',
      shadow: themeUtils.shadowPresets.md,
    },
  };

  const currentVariant = variantConfig[variant];

  const styles = StyleSheet.create({
    container: {
      width: fullWidth ? '100%' : 'auto',
      borderRadius: themeUtils.borderRadius.lg,
      overflow: 'hidden',
      ...currentVariant.shadow,
    },
    gradient: {
      paddingHorizontal: current.paddingHorizontal,
      paddingVertical: current.paddingVertical,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      gap: themeUtils.spacing.sm,
    },
    text: {
      fontSize: current.fontSize,
      fontWeight: '600',
      color: currentVariant.textColor,
    },
    border: {
      borderWidth: 1.5,
      borderColor: currentVariant.borderColor,
    },
  });

  const opacity = isPressed && !disabled ? 0.8 : disabled ? 0.5 : 1;

  return (
    <Pressable
      style={[styles.container, { opacity }, fullWidth && { width: '100%' }]}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      disabled={disabled || isLoading}
      {...pressableProps}
    >
      <LinearGradient
        colors={currentVariant.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, styles.border]}
      >
        {isLoading ? (
          <Text style={styles.text}>...</Text>
        ) : (
          <Text style={styles.text}>{label}</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
};

export default LuxuryButton;
