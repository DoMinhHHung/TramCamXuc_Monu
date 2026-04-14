
import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
  PressableProps,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import themeUtils from '../config/themeUtils';

interface GlassCardProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: 'light' | 'medium' | 'strong';
  variant?: 'default' | 'luxury' | 'accent';
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  intensity = 'medium',
  variant = 'default',
  ...pressableProps
}) => {
  const { colors } = useTheme();

  const intensityMap = {
    light: 0.05,
    medium: 0.1,
    strong: 0.2,
  };

  const variantStyles = {
    default: {
      backgroundColor: `rgba(255, 255, 255, ${intensityMap[intensity]})`,
      borderColor: colors.accentBorder25,
    },
    luxury: {
      backgroundColor: `rgba(255, 255, 255, ${intensityMap[intensity] * 1.5})`,
      borderColor: colors.accent,
    },
    accent: {
      backgroundColor: `rgba(${parseInt(colors.accent.slice(1, 3), 16)}, ${parseInt(colors.accent.slice(3, 5), 16)}, ${parseInt(colors.accent.slice(5, 7), 16)}, ${intensityMap[intensity]})`,
      borderColor: colors.accent,
    },
  };

  const currentVariant = variantStyles[variant];

  const styles = StyleSheet.create({
    pressable: {
      borderRadius: themeUtils.borderRadius.lg,
      overflow: 'hidden',
    },
    container: {
      borderColor: currentVariant.borderColor,
      borderWidth: 0.5,
      borderRadius: themeUtils.borderRadius.lg,
      padding: themeUtils.spacing.md,
      ...themeUtils.shadowPresets.md,
    },
    linearGradient: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: themeUtils.borderRadius.lg,
      opacity: intensityMap[intensity] * 10,
    },
    glassOverlay: {
      backgroundColor: `rgba(255, 255, 255, 0.03)`,
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '50%',
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      borderTopLeftRadius: themeUtils.borderRadius.lg,
      borderTopRightRadius: themeUtils.borderRadius.lg,
    },
  });

  return (
    <Pressable
      style={[styles.pressable, style]}
      {...pressableProps}
    >
      <View style={styles.container}>
        <LinearGradient
          colors={[currentVariant.backgroundColor, 'rgba(0,0,0,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.linearGradient}
        />
        <View style={styles.glassOverlay} />
        {children}
      </View>
    </Pressable>
  );
};

export default GlassCard;
