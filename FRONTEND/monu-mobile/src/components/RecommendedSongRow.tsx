import React, { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../config/colors';
import { ReasonBadge } from './ReasonBadge';
import { FeedbackType, RecommendedSong } from '../services/recommendation';

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
    >
      <LinearGradient
        colors={isActive ? [COLORS.accentFill20, COLORS.accentFill20] : [COLORS.surface, COLORS.surfaceLow]}
        style={styles.gradient}
      >
        <View style={[styles.thumbWrap, isActive && styles.thumbActive]}>
          {item.thumbnailUrl ? (
            <Image source={{ uri: item.thumbnailUrl }} style={styles.thumb} />
          ) : (
            <Text style={styles.thumbIcon}>🎵</Text>
          )}
        </View>

        <View style={styles.info}>
          <Text style={[styles.title, isActive && styles.titleActive]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {item.primaryArtist?.stageName}
          </Text>
          <ReasonBadge reasonType={item.reasonType} reason={item.reason} />
        </View>

        <View style={styles.right}>
          <Text style={styles.duration}>{formatDur()}</Text>
          <Text style={[styles.playIcon, isActive && styles.playIconActive]}>
            {isPlaying ? '⏸' : '▶'}
          </Text>
        </View>

        {onFeedback && (
          <Pressable
            hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
            onPress={() => onFeedback(item.songId, 'DISLIKE')}
          >
            <Text style={styles.dislike}>✕</Text>
          </Pressable>
        )}
      </LinearGradient>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    marginBottom: 8,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  rowActive: { borderColor: COLORS.accentBorder35 },
  gradient: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  thumbWrap: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.accentBorder25,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbActive: { borderWidth: 2, borderColor: COLORS.accent },
  thumb: { width: 52, height: 52, borderRadius: 12 },
  thumbIcon: { fontSize: 24 },
  info: { flex: 1, gap: 3 },
  title: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  titleActive: { color: COLORS.accent },
  artist: { color: COLORS.glass45, fontSize: 12 },
  right: { alignItems: 'flex-end', gap: 4, marginLeft: 8 },
  duration: { color: COLORS.glass35, fontSize: 11 },
  playIcon: { color: COLORS.glass30, fontSize: 18 },
  playIconActive: { color: COLORS.accent },
  dislike: { color: COLORS.glass25, fontSize: 14, paddingHorizontal: 4 },
});
