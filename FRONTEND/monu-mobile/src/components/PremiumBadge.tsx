/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PremiumBadge – Visual indicator for premium/luxury content
 * Displays with luxurious styling and glow effects
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import themeUtils from '../config/themeUtils';

interface PremiumBadgeProps {
  label?: string;
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  withGlow?: boolean;
}

export const PremiumBadge: React.FC<PremiumBadgeProps> = ({
  label = 'PREMIUM',
  size = 'medium',
  style,
  withGlow = true,
}) => {
  const { colors } = useTheme();

  const sizeConfig = {
    small: {
      paddingHorizontal: themeUtils.spacing.sm,
      paddingVertical: 2,
      fontSize: themeUtils.fontSize.xs,
      iconSize: 12,
    },
    medium: {
      paddingHorizontal: themeUtils.spacing.md,
      paddingVertical: 4,
      fontSize: themeUtils.fontSize.sm,
      iconSize: 14,
    },
    large: {
      paddingHorizontal: themeUtils.spacing.lg,
      paddingVertical: 6,
      fontSize: themeUtils.fontSize.md,
      iconSize: 16,
    },
  };

  const current = sizeConfig[size];

  const styles = StyleSheet.create({
    container: {
      borderRadius: themeUtils.borderRadius.full,
      overflow: 'hidden',
      ...(withGlow ? {
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 4,
      } : {}),
    },
    gradient: {
      paddingHorizontal: current.paddingHorizontal,
      paddingVertical: current.paddingVertical,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderWidth: 0.5,
      borderColor: colors.accent,
    },
    label: {
      fontSize: current.fontSize,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: 0.5,
    },
  });

  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={[colors.accentFill35, colors.accentFill20]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <MaterialCommunityIcons
          name="star"
          size={current.iconSize}
          color={colors.accent}
        />
        <Text style={styles.label}>{label}</Text>
      </LinearGradient>
    </View>
  );
};

export default PremiumBadge;
