import React, { useEffect, useRef } from 'react';
import {
  Animated,
  DimensionValue,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { useThemeColors } from '../config/colors';

const usePulse = () => {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return opacity;
};

type SkeletonBlockProps = {
  width: DimensionValue;
  height: number;
  radius?: number;
  style?: ViewStyle;
};

const SkeletonBlock = ({ width, height, radius = 6, style }: SkeletonBlockProps) => {
  const colors = useThemeColors();
  const opacity = usePulse();
  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: colors.glass12,
          opacity,
        },
        style,
      ]}
    />
  );
};

/** Hàng card ngang giống HorizontalSongScroll (width 148). */
export const HorizontalRecommendationSkeleton = () => (
  <View style={styles.horizontalRow}>
    {[0, 1, 2].map((i) => (
      <View key={i} style={styles.horizontalCard}>
        <SkeletonBlock width={148} height={148} radius={0} style={styles.horizontalThumb} />
        <SkeletonBlock width="92%" height={13} radius={4} style={styles.horizontalLine} />
        <SkeletonBlock width="65%" height={11} radius={4} />
      </View>
    ))}
  </View>
);

export const SongCardSkeleton = () => (
  <View style={styles.songRow}>
    <SkeletonBlock width={50} height={50} radius={12} />
    <View style={styles.songTextCol}>
      <SkeletonBlock width="70%" height={14} />
      <SkeletonBlock width="45%" height={11} />
    </View>
  </View>
);

export const HomeHeaderSkeleton = () => (
  <View style={styles.headerPad}>
    <SkeletonBlock width={180} height={28} radius={8} />
    <SkeletonBlock width="100%" height={44} radius={14} />
  </View>
);

export const SectionSkeleton = ({ rows = 3 }: { rows?: number }) => (
  <View style={styles.sectionPad}>
    <SkeletonBlock width={160} height={20} radius={6} style={styles.sectionTitle} />
    {Array.from({ length: rows }, (_, i) => (
      <SongCardSkeleton key={i} />
    ))}
  </View>
);

/** Gợi ý stats (album / artist) đang tải */
export const StatsStripSkeleton = () => (
  <View style={styles.statsPad}>
    <SkeletonBlock width="36%" height={18} radius={6} />
    <SkeletonBlock width="100%" height={76} radius={12} />
    <SkeletonBlock width="100%" height={76} radius={12} />
  </View>
);

const styles = StyleSheet.create({
  horizontalRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    paddingVertical: 12,
  },
  horizontalCard: { width: 148 },
  horizontalThumb: { marginBottom: 10 },
  horizontalLine: { marginBottom: 4 },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 14,
  },
  songTextCol: { flex: 1, gap: 8 },
  headerPad: { padding: 20, gap: 12 },
  sectionPad: { paddingHorizontal: 20, marginTop: 24 },
  sectionTitle: { marginBottom: 14 },
  statsPad: { paddingHorizontal: 20, paddingVertical: 16, gap: 12 },
});
