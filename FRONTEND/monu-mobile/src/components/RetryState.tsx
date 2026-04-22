import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useThemeColors } from '../config/colors';
import { SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '../config/design';

interface RetryStateProps {
  title: string;
  description: string;
  icon?: string;
  onRetry?: () => void;
  retryLabel?: string;
  onFallback?: () => void;
  fallbackLabel?: string;
}

export const RetryState = ({
  title,
  description,
  icon = '⚠️',
  onRetry,
  retryLabel = 'Thử lại',
  onFallback,
  fallbackLabel = 'Quay lại',
}: RetryStateProps) => {
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>

      <View style={styles.buttonContainer}>
        {onRetry && (
          <Pressable
            style={({ pressed }) => [styles.button, styles.primaryButton, pressed && styles.buttonPressed]}
            onPress={onRetry}
            accessibilityRole="button"
          >
            <Text style={styles.primaryButtonText}>{retryLabel}</Text>
          </Pressable>
        )}

        {onFallback && (
          <Pressable
            style={({ pressed }) => [styles.button, styles.secondaryButton, pressed && styles.buttonPressed]}
            onPress={onFallback}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryButtonText}>{fallbackLabel}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const getStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  icon: {
    fontSize: 56,
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: colors.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  description: {
    fontSize: FONT_SIZE.body_sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xxl,
    lineHeight: 22,
  },
  buttonContainer: {
    gap: SPACING.md,
    width: '100%',
  },
  button: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: colors.accent,
  },
  secondaryButton: {
    backgroundColor: colors.surfaceMid,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonPressed: {
    opacity: 0.75,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: FONT_SIZE.body_sm,
    fontWeight: FONT_WEIGHT.bold,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: FONT_SIZE.body_sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
});
