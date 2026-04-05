import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { COLORS } from '../config/colors';

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
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>

      <View style={styles.buttonContainer}>
        {onRetry && (
          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.primaryButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={onRetry}
          >
            <Text style={styles.primaryButtonText}>{retryLabel}</Text>
          </Pressable>
        )}

        {onFallback && (
          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.secondaryButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={onFallback}
          >
            <Text style={styles.secondaryButtonText}>{fallbackLabel}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  icon: {
    fontSize: 56,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  buttonContainer: {
    gap: 12,
    width: '100%',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: COLORS.accent,
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  primaryButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
});
