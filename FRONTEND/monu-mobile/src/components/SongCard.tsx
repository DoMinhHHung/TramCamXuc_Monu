import React, { useMemo, useRef } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Song } from '../services/music';
import { useThemeColors } from '../config/colors';
import { HeartButton } from './HeartButton';
import { haptic } from '../utils/haptics';
import { AppIcon } from '../config/appIcons';

type Props = {
  song: Song;
  isActive: boolean;
  isPlaying: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  onMetaPress?: () => void;
  formatDuration: (s: number) => string;
  hideHeart?: boolean;
};

export const SongCard = ({
                           song, isActive, isPlaying, onPress, onLongPress,
                           onMetaPress, formatDuration, hideHeart = false,
                         }: Props) => {
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const longPressTriggeredRef = useRef(false);

  return (
    <View style={[styles.listCard, isActive && styles.listCardActive]}>
      <LinearGradient
        colors={isActive ? [colors.accentFill20, colors.accentFill20] : [colors.surface, colors.surfaceLow]}
        style={styles.listCardGradient}
      >
        <Pressable
          style={styles.mainArea}
          onPressIn={() => { longPressTriggeredRef.current = false; }}
          onPress={() => {
            if (longPressTriggeredRef.current) {
              longPressTriggeredRef.current = false;
              return;
            }
            haptic.light();
            onPress();
          }}
          onLongPress={() => {
            longPressTriggeredRef.current = true;
            onLongPress?.();
          }}
          delayLongPress={380}
        >
          <View style={[styles.listIconWrap, isActive && styles.listIconWrapActive]}>
            {song.thumbnailUrl
              ? <Image source={{ uri: song.thumbnailUrl }} style={styles.songThumbnail} />
              : (
                <View style={styles.thumbPlaceholder}>
                  <AppIcon name="musicNote" size={24} color={colors.textSecondary} />
                </View>
              )}
            {isActive && (
              <View style={styles.playingOverlay}>
                <AppIcon name={isPlaying ? "pause" : "play"} size={22} color="#FFF" />
              </View>
            )}
          </View>

          <View style={styles.listInfo}>
            <Text style={[styles.listTitle, isActive && styles.listTitleActive]} numberOfLines={1}>
              {song.title}
            </Text>
            <Text style={styles.listSubtitle} numberOfLines={1}>
              {song.primaryArtist.stageName}
            </Text>
          </View>
        </Pressable>

        {!hideHeart && (
          <HeartButton songId={song.id} size={24} variant="card" />
        )}

        <View style={styles.rightMeta}>
          <Text style={styles.listDuration}>{formatDuration(song.durationSeconds)}</Text>

          <Pressable
            onPress={onMetaPress}
            disabled={!onMetaPress}
            style={styles.moreBtn}
            hitSlop={8}
          >
            <AppIcon name="more" size={20} color={colors.muted} />
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
};

const getStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  listCard:            { marginBottom: 12, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'transparent' },
  listCardActive:      { borderColor: colors.accentBorder35 },
  listCardGradient:    { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 14 },
  mainArea:            { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 },
  listIconWrap:        { width: 56, height: 56, borderRadius: 12, backgroundColor: colors.surfaceMid, alignItems: 'center', justifyContent: 'center', marginRight: 14, overflow: 'hidden' },
  listIconWrapActive:  { borderWidth: 2, borderColor: colors.accent },
  thumbPlaceholder:    { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  songThumbnail:       { width: 56, height: 56, borderRadius: 12 },
  playingOverlay:      { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  listInfo:            { flex: 1 },
  listTitle:           { color: colors.text, fontWeight: '800', fontSize: 16, letterSpacing: -0.2 },
  listTitleActive:     { color: colors.accent },
  listSubtitle:        { color: colors.textSecondary, fontSize: 13, marginTop: 4, fontWeight: '500' },
  rightMeta:           { alignItems: 'flex-end', gap: 6 },
  listDuration:        { color: colors.textSecondary, fontSize: 12 },
  moreBtn:             { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceLow, borderWidth: 1, borderColor: colors.divider },
});
