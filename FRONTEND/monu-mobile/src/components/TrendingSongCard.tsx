import React, { memo, useRef } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors, type ColorScheme } from '../config/colors';
import { FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING } from '../config/design';
import type { RecommendedSong } from '../services/recommendation';

interface Props {
  song: RecommendedSong;
  onPress: (song: RecommendedSong) => void;
  isPlaying?: boolean;
}

const RANK_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

// Left border accent color for top 3
const TOP3_ACCENT: Record<number, [string, string]> = {
  1: ['#FFD700', '#FFA500'],
  2: ['#C0C0C0', '#A8A8A8'],
  3: ['#CD7F32', '#A0522D'],
};

const formatPlayCount = (n?: number | null): string => {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
};

export const TrendingSongCard = memo(({ song, onPress, isPlaying }: Props) => {
  const palette = useThemeColors();
  const styles = getStyles(palette);
  const rank = song.rank ?? 0;
  const isTop3 = rank >= 1 && rank <= 3;
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, tension: 120, friction: 8 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 120, friction: 8 }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }]}>
      <Pressable
        style={[styles.card, isPlaying && styles.cardActive]}
        onPress={() => onPress(song)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {/* Top-3 gradient left border strip */}
        {isTop3 && (
          <LinearGradient
            colors={TOP3_ACCENT[rank]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.rankStrip}
          />
        )}

        {/* Rank badge */}
        <View style={[styles.rankBadge, isTop3 && styles.rankBadgeTop3]}>
          {isTop3 ? (
            <Text style={styles.rankMedal}>{RANK_MEDAL[rank]}</Text>
          ) : (
            <Text style={[styles.rankNum, isPlaying && { color: palette.accent }]}>
              {rank}
            </Text>
          )}
        </View>

        {/* Thumbnail */}
        <View style={styles.thumbWrap}>
          {song.thumbnailUrl ? (
            <Image source={{ uri: song.thumbnailUrl }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, styles.thumbPlaceholder]}>
              <MaterialCommunityIcons name="music" size={20} color={palette.muted} />
            </View>
          )}
          {isPlaying && (
            <LinearGradient
              colors={['transparent', `${palette.accent}90`]}
              style={StyleSheet.absoluteFill}
            />
          )}
          {isPlaying && (
            <View style={styles.playingIndicator}>
              <MaterialCommunityIcons name="waveform" size={14} color={palette.accent} />
            </View>
          )}
        </View>

        {/* Song info */}
        <View style={styles.info}>
          <Text style={[styles.title, isPlaying && { color: palette.accent }]} numberOfLines={1}>
            {song.title}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {song.primaryArtist?.stageName ?? ''}
          </Text>

          {/* Trend badge + play count */}
          <View style={styles.metaRow}>
            {song.trendBadge ? (
              <View style={styles.badgePill}>
                <Text style={styles.badgeText}>{song.trendBadge}</Text>
              </View>
            ) : null}
            <View style={styles.playCountRow}>
              <MaterialCommunityIcons name="play-circle-outline" size={11} color={palette.muted} />
              <Text style={styles.playCountText}>{formatPlayCount(song.playCount)}</Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
});

TrendingSongCard.displayName = 'TrendingSongCard';

const getStyles = (c: ColorScheme) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      borderRadius: RADIUS.md,
      backgroundColor: 'transparent',
      overflow: 'hidden',
    },
    cardActive: {
      backgroundColor: `${c.accent}12`,
    },
    rankStrip: {
      position: 'absolute',
      left: 0,
      top: 6,
      bottom: 6,
      width: 3,
      borderRadius: 3,
    },
    rankBadge: {
      width: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rankBadgeTop3: {},
    rankMedal: {
      fontSize: 20,
    },
    rankNum: {
      fontSize: FONT_SIZE.md,
      fontWeight: FONT_WEIGHT.black,
      color: c.muted,
      lineHeight: 24,
    },
    thumbWrap: {
      width: 54,
      height: 54,
      borderRadius: RADIUS.sm,
      overflow: 'hidden',
      marginLeft: SPACING.sm,
      backgroundColor: c.surfaceMid,
    },
    thumb: {
      width: '100%',
      height: '100%',
    },
    thumbPlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    playingIndicator: {
      position: 'absolute',
      bottom: 3,
      right: 3,
    },
    info: {
      flex: 1,
      marginLeft: SPACING.md,
      gap: 3,
    },
    title: {
      fontSize: FONT_SIZE.body,
      fontWeight: FONT_WEIGHT.bold,
      color: c.white,
    },
    artist: {
      fontSize: FONT_SIZE.sm,
      color: c.textSecondary,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      marginTop: 2,
    },
    badgePill: {
      backgroundColor: `${c.accent}20`,
      borderRadius: RADIUS.full,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderWidth: 1,
      borderColor: `${c.accent}30`,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: FONT_WEIGHT.bold,
      color: c.accent,
    },
    playCountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    playCountText: {
      fontSize: 10,
      color: c.muted,
    },
  });
