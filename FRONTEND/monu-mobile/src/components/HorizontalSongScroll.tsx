import React, { memo, useMemo, useRef } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors } from '../config/colors';
import { HorizontalRecommendationSkeleton } from './SkeletonLoader';
import { FeedbackType, RecommendedSong } from '../services/recommendation';
import { AppIcon } from '../config/appIcons';
import { uiPresets } from '../config/uiPresets';

const formatDuration = (seconds: number): string => {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const formatPlayCount = (count: number): string => {
  if (!count) return '';
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K`;
  return `${count}`;
};

interface CardProps {
  item: RecommendedSong;
  isActive: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  onFeedback?: (songId: string, feedback: FeedbackType) => void;
}

const SongCard = memo(({ item, isActive, onPress, onLongPress, onFeedback }: CardProps) => {
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const longPressTriggeredRef = useRef(false);

  return (
    <Pressable
      style={[styles.card, isActive && styles.cardActive]}
      onPressIn={() => {
        longPressTriggeredRef.current = false;
      }}
      onPress={() => {
        if (longPressTriggeredRef.current) {
          longPressTriggeredRef.current = false;
          return;
        }
        onPress();
      }}
      onLongPress={() => {
        longPressTriggeredRef.current = true;
        onLongPress?.();
      }}
      delayLongPress={380}
    >
      <View style={styles.thumbWrap}>
        {item.thumbnailUrl ? (
          <Image source={{ uri: item.thumbnailUrl }} style={styles.thumb} />
        ) : (
          <LinearGradient
            colors={[colors.gradPurple, colors.gradIndigo]}
            style={[styles.thumb, styles.thumbFallback]}
          >
            <AppIcon name="musicNote" size={34} color={colors.glass70} />
          </LinearGradient>
        )}
        {isActive && (
          <View style={styles.activeOverlay}>
            <AppIcon name="play" size={18} color={colors.text} />
          </View>
        )}
      </View>

      <View style={styles.info}>
        {/* Title */}
        <Text style={[styles.title, isActive && styles.titleActive]} numberOfLines={2}>
          {item.title}
        </Text>

        {/* Artist */}
        <Text style={[styles.artist, isActive && styles.artistActive]} numberOfLines={1}>
          {item.primaryArtist?.stageName ?? ''}
        </Text>

        {/* Stats row: duration + play count */}
        <View style={styles.statsRow}>
          {!!item.durationSeconds && (
            <View style={styles.statChip}>
              <AppIcon name="headset" size={9} color={colors.muted} />
              <Text style={styles.statText}>{formatDuration(item.durationSeconds)}</Text>
            </View>
          )}
          {!!item.playCount && (
            <View style={styles.statChip}>
              <AppIcon name="play" size={9} color={colors.muted} />
              <Text style={styles.statText}>{formatPlayCount(item.playCount)}</Text>
            </View>
          )}
        </View>
      </View>

      {onFeedback && (
        <Pressable
          style={styles.dislikeBtn}
          onPress={() => onFeedback(item.songId, 'DISLIKE')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <AppIcon name="close" size={14} color={colors.textSecondary} />
        </Pressable>
      )}
    </Pressable>
  );
});

interface HorizontalSongScrollProps {
  songs: RecommendedSong[];
  activeSongId?: string;
  onPress: (song: RecommendedSong) => void;
  onLongPress?: (song: RecommendedSong) => void;
  onFeedback?: (songId: string, feedback: FeedbackType) => void;
  loading?: boolean;
  emptyText?: string;
}

export const HorizontalSongScroll = ({
  songs,
  activeSongId,
  onPress,
  onLongPress,
  onFeedback,
  loading = false,
  emptyText = 'Đang cập nhật...'
}: HorizontalSongScrollProps) => {
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);

  if (loading) {
    return <HorizontalRecommendationSkeleton />;
  }

  if (!songs.length) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyText}>{emptyText}</Text>
      </View>
    );
  }

  return (
    <FlashList
      horizontal
      data={songs}
      keyExtractor={(item) => item.songId}
      drawDistance={500}
      renderItem={({ item }) => (
        <SongCard
          item={item}
          isActive={item.songId === activeSongId}
          onPress={() => onPress(item)}
          onLongPress={onLongPress ? () => onLongPress(item) : undefined}
          onFeedback={onFeedback}
        />
      )}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.listContent}
    />
  );
};

const CARD_WIDTH = 152;

const getStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  listContent: { paddingHorizontal: 20, gap: 10 },
  card: {
    width: CARD_WIDTH,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glass12,
    backgroundColor: uiPresets.glassSurface(colors, { intensity: 'subtle', radius: 16 }).backgroundColor,
  },
  cardActive: { borderColor: colors.accentBorder35 },
  thumbWrap: { position: 'relative' },
  thumb: { width: CARD_WIDTH, height: CARD_WIDTH, borderRadius: 0 },
  thumbFallback: { alignItems: 'center', justifyContent: 'center' },
  activeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    padding: 10,
    paddingBottom: 12,
    gap: 5,
  },
  title: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
  },
  titleActive: { color: colors.accent },
  artist: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  artistActive: { color: colors.accent, opacity: 0.85 },
  statsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.glass06,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.glass10,
  },
  statText: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  dislikeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  emptyText: { color: colors.textSecondary, fontSize: 13 },
});
