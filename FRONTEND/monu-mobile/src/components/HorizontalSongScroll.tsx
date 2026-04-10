import React, { memo, useMemo, useRef } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors } from '../config/colors';
import { HorizontalRecommendationSkeleton } from './SkeletonLoader';
import { ReasonBadge } from './ReasonBadge';
import { FeedbackType, RecommendedSong } from '../services/recommendation';
import { AppIcon } from '../config/appIcons';

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
        <Text style={[styles.title, isActive && styles.titleActive]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {item.primaryArtist?.stageName}
        </Text>
        <View style={styles.reasonWrap}>
          <ReasonBadge reasonType={item.reasonType} reason={item.reason} variant="full" />
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
    <FlatList
      horizontal
      data={songs}
      keyExtractor={(item) => item.songId}
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

const CARD_WIDTH = 148;

const getStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  listContent: { paddingHorizontal: 20, gap: 10 },
  card: {
    width: CARD_WIDTH,
    height: 220,
    backgroundColor: colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
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
  info: { padding: 10, height: 72, justifyContent: 'space-between' },
  title: { color: colors.text, fontSize: 13, fontWeight: '700', lineHeight: 17 },
  titleActive: { color: colors.accent },
  artist: { color: colors.textSecondary, fontSize: 11 },
  reasonWrap: { minHeight: 20, justifyContent: 'flex-end' },
  dislikeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surfaceDim,
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
