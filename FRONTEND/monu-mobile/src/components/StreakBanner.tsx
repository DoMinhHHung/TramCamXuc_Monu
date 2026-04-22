import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useThemeColors } from '../config/colors';
import { SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '../config/design';
import { AppIcon } from '../config/appIcons';

interface StreakBannerProps {
  streakDays: number;
  totalMinutesToday: number;
  onPress: () => void;
}

export const StreakBanner = ({ streakDays, totalMinutesToday, onPress }: StreakBannerProps) => {
  const colors = useThemeColors();
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const styles = useMemo(() => getStyles(colors), [colors]);

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 60,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  if (streakDays < 2) return null;

  const isFireStreak = streakDays >= 7;

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => pressed && styles.pressed}
        accessibilityRole="button"
        accessibilityLabel={`Streak ${streakDays} ngày liên tiếp`}
      >
        <LinearGradient
          colors={isFireStreak
            ? [colors.cardTrendingFrom, colors.cardTrendingTo]
            : [colors.gradPurple, colors.gradIndigo]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.banner,
            { borderColor: isFireStreak ? 'rgba(251,191,36,0.3)' : colors.accentBorder25 },
          ]}
        >
          <Text style={styles.emoji}>
            {isFireStreak ? '🔥' : '⚡'}
          </Text>
          <View style={styles.textBlock}>
            <Text style={styles.title}>
              {streakDays} ngày liên tiếp!
            </Text>
            <Text style={styles.subtitle}>
              {totalMinutesToday > 0
                ? `Hôm nay nghe ${totalMinutesToday} phút · Duy trì nhé!`
                : 'Nghe 1 bài để giữ streak hôm nay!'}
            </Text>
          </View>
          <AppIcon name="chevronRight" size={20} color={colors.accent} />
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
};

const getStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  wrapper: {
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.md,
  },
  pressed: {
    opacity: 0.85,
  },
  banner: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    gap: SPACING.md,
  },
  emoji: {
    fontSize: 28,
  },
  textBlock: {
    flex: 1,
  },
  title: {
    color: colors.white,
    fontSize: FONT_SIZE.body,
    fontWeight: FONT_WEIGHT.bold,
  },
  subtitle: {
    color: colors.glass60,
    fontSize: FONT_SIZE.xs,
    marginTop: 2,
  },
});
