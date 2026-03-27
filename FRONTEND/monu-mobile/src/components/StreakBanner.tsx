import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useThemeColors } from '../config/colors';

interface StreakBannerProps {
  streakDays: number;
  totalMinutesToday: number;
  onPress: () => void;
}

export const StreakBanner = ({ streakDays, totalMinutesToday, onPress }: StreakBannerProps) => {
  const colors = useThemeColors();
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

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
    <Animated.View style={{ transform: [{ scale: scaleAnim }], marginHorizontal: 20, marginTop: 12 }}>
      <Pressable onPress={onPress}>
        <LinearGradient
          colors={isFireStreak
            ? [colors.cardTrendingFrom, colors.cardTrendingTo]
            : [colors.gradPurple, colors.gradIndigo]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            borderRadius: 16,
            padding: 14,
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: isFireStreak ? 'rgba(251,191,36,0.3)' : colors.accentBorder25,
          }}
        >
          <Text style={{ fontSize: 28, marginRight: 12 }}>
            {isFireStreak ? '🔥' : '⚡'}
          </Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.white, fontSize: 15, fontWeight: '700' }}>
              {streakDays} ngày liên tiếp!
            </Text>
            <Text style={{ color: colors.glass60, fontSize: 12, marginTop: 2 }}>
              {totalMinutesToday > 0
                ? `Hôm nay nghe ${totalMinutesToday} phút · Duy trì nhé!`
                : 'Nghe 1 bài để giữ streak hôm nay!'}
            </Text>
          </View>
          <Text style={{ color: colors.accent, fontSize: 18, fontWeight: '300' }}>›</Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
};
