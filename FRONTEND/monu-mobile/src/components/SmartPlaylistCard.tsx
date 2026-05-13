import React, { memo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors } from '../config/colors';
import { FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING } from '../config/design';
import type { SmartPlaylist } from '../hooks/useSmartPlaylists';

interface Props {
  playlist: SmartPlaylist;
  onPlay: (playlist: SmartPlaylist) => void;
  onDismiss: (playlistId: string) => void;
}

export const SmartPlaylistCard = memo(({ playlist, onPlay, onDismiss }: Props) => {
  const colors = useThemeColors();
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, tension: 120, friction: 8 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 120, friction: 8 }).start();
  };

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ scale }] }]}>
      <Pressable
        onPress={() => onPlay(playlist)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={`Phát playlist ${playlist.name}`}
      >
        <LinearGradient
          colors={[playlist.gradientFrom, playlist.gradientTo]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          {/* Dismiss button */}
          <Pressable
            onPress={(e) => { e.stopPropagation(); onDismiss(playlist.id); }}
            hitSlop={10}
            style={styles.dismissBtn}
            accessibilityLabel="Bỏ qua playlist này"
          >
            <Text style={styles.dismissIcon}>✕</Text>
          </Pressable>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.emoji}>{playlist.emoji}</Text>
            <View style={styles.systemBadge}>
              <Text style={styles.systemBadgeText}>Đề xuất</Text>
            </View>
          </View>

          {/* Content */}
          <Text style={styles.name} numberOfLines={1}>{playlist.name}</Text>
          <Text style={styles.description} numberOfLines={2}>{playlist.description}</Text>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.songCount}>{playlist.songs.length} bài hát</Text>
            <View style={styles.playBtn}>
              <Text style={styles.playBtnText}>▶  Phát</Text>
            </View>
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
});

SmartPlaylistCard.displayName = 'SmartPlaylistCard';

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: SPACING.lg,
  },
  card: {
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    minHeight: 140,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  emoji: {
    fontSize: 32,
  },
  systemBadge: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  systemBadgeText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FONT_SIZE.xxs,
    fontWeight: FONT_WEIGHT.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  name: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.black,
    color: '#FFFFFF',
    marginBottom: SPACING.xs,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: FONT_SIZE.sm,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: SPACING.lg,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  songCount: {
    fontSize: FONT_SIZE.xs,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: FONT_WEIGHT.semibold,
  },
  playBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  playBtnText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
  dismissBtn: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  dismissIcon: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '700',
  },
});
