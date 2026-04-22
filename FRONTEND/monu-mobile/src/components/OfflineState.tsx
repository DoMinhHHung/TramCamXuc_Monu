import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '../config/colors';
import { AnimatedDecorIcon } from './AnimatedDecorIcon';
import { SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '../config/design';

interface OfflineStateProps {
  onRetry: () => void;
}

export const OfflineState = ({ onRetry }: OfflineStateProps) => {
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <AnimatedDecorIcon intensity="soft">
        <Text style={styles.icon}>📡</Text>
      </AnimatedDecorIcon>
      <Text style={styles.title}>Mất kết nối rồi</Text>
      <Text style={styles.body}>
        Đừng lo, nhạc đã tải xuống vẫn phát được.{'\n'}Kiểm tra WiFi rồi thử lại nhé!
      </Text>
      <Pressable
        onPress={onRetry}
        style={({ pressed }) => [styles.retryBtn, pressed && styles.retryBtnPressed]}
        accessibilityRole="button"
        accessibilityLabel="Thử lại kết nối"
      >
        <Text style={styles.retryText}>Thử lại</Text>
      </Pressable>
    </View>
  );
};

const getStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: SPACING.section * 2,
    paddingHorizontal: SPACING.section,
  },
  icon: {
    fontSize: 56,
    marginBottom: SPACING.lg,
  },
  title: {
    color: colors.white,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  body: {
    color: colors.glass50,
    fontSize: FONT_SIZE.body_sm,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xxl,
  },
  retryBtn: {
    backgroundColor: colors.accent,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.md,
  },
  retryBtnPressed: {
    opacity: 0.8,
  },
  retryText: {
    color: colors.white,
    fontWeight: FONT_WEIGHT.bold,
    fontSize: FONT_SIZE.body,
  },
});
