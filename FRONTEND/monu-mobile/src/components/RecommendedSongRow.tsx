import React, { memo, useMemo } from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors } from '../config/colors';
import { ReasonBadge } from './ReasonBadge';
import { AppIcon } from '../config/appIcons';
import { FeedbackType, RecommendedSong } from '../services/recommendation';
import { SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '../config/design';

interface RecommendedSongRowProps {
  item: RecommendedSong;
  isActive: boolean;
  isPlaying: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  onFeedback?: (songId: string, fb: FeedbackType) => void;
}

export const RecommendedSongRow = memo(({
  item,
  isActive,
  isPlaying,
  onPress,
  onLongPress,
  onFeedback,
}: RecommendedSongRowProps) => {
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const formatDur = () => {
    const m = Math.floor(item.durationSeconds / 60);
    const s = item.durationSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <Pressable
      style={[styles.row, isActive && styles.rowActive]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={500}
      accessibilityRole="button"
      accessibilityLabel={`${item.title} - ${item.primaryArtist?.stageName}`}
    >
      <LinearGradient
        colors={isActive ? [colors.accentFill20, colors.accentFill20] : [colors.surface, colors.surfaceLow]}
        style={styles.gradient}
      >
        <View style={[styles.thumbWrap, isActive && styles.thumbActive]}>
          {item.thumbnailUrl ? (
            <Image source={{ uri: item.thumbnailUrl }} style={styles.thumb} contentFit="cover" cachePolicy="memory-disk" />
          ) : (
            <View style={styles.thumbFallback}>
              <AppIcon name="musicNote" size={22} color={colors.textSecondary} />
            </View>
          )}
          {isActive && (
            <View style={styles.activeOverlay}>
              <AppIcon name={isPlaying ? 'pause' : 'play'} size={18} color={colors.white} />
            </View>
          )}
        </View>

        <View style={styles.info}>
          <Text style={[styles.title, isActive && styles.titleActive]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {item.primaryArtist?.stageName}
          </Text>
          {/* <ReasonBadge reasonType={item.reasonType} reason={item.reason} /> */}
        </View>

        <View style={styles.right}>
          <Text style={styles.duration}>{formatDur()}</Text>
        </View>

        {onFeedback && (
          <Pressable
            hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
            onPress={() => onFeedback(item.songId, 'DISLIKE')}
            style={styles.dislikeBtn}
            accessibilityRole="button"
            accessibilityLabel="Không thích bài này"
          >
            <AppIcon name="close" size={14} color={colors.muted} />
          </Pressable>
        )}
      </LinearGradient>
    </Pressable>
  );
});

const getStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  row: {
    marginBottom: SPACING.sm,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  rowActive: { borderColor: colors.accentBorder35 },
  gradient: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: SPACING.md },
  thumbWrap: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.sm,
    backgroundColor: colors.surfaceMid,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbActive: { borderWidth: 2, borderColor: colors.accent },
  thumb: { width: 52, height: 52, borderRadius: RADIUS.sm },
  thumbFallback: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMid,
  },
  activeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: 3 },
  title: { color: colors.text, fontWeight: FONT_WEIGHT.bold, fontSize: FONT_SIZE.body_sm },
  titleActive: { color: colors.accent },
  artist: { color: colors.textSecondary, fontSize: FONT_SIZE.xs },
  right: { alignItems: 'flex-end', gap: SPACING.xs, marginLeft: SPACING.sm },
  duration: { color: colors.muted, fontSize: FONT_SIZE.xxs },
  dislikeBtn: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.full,
    backgroundColor: colors.surfaceMid,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.xs,
  },
});
