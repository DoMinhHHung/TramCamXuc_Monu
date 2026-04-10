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
                  <AppIcon name="musicNote" size={22} color={colors.textSecondary} />
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
  listCard:            { marginBottom: 10, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'transparent' },
  listCardActive:      { borderColor: colors.accentBorder35 },
  listCardGradient:    { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  mainArea:            { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 },
  listIconWrap:        { width: 50, height: 50, borderRadius: 14, backgroundColor: colors.accentBorder25, alignItems: 'center', justifyContent: 'center', marginRight: 14, overflow: 'hidden' },
  listIconWrapActive:  { borderWidth: 1.5, borderColor: colors.accent },
  thumbPlaceholder:    { width: 50, height: 50, alignItems: 'center', justifyContent: 'center' },
  songThumbnail:       { width: 50, height: 50, borderRadius: 14 },
  listInfo:            { flex: 1 },
  listTitle:           { color: colors.text, fontWeight: '700', fontSize: 15, letterSpacing: -0.2 },
  listTitleActive:     { color: colors.accent },
  listSubtitle:        { color: colors.textSecondary, fontSize: 12, marginTop: 3 },
  rightMeta:           { alignItems: 'flex-end', gap: 6 },
  listDuration:        { color: colors.textSecondary, fontSize: 12 },
  moreBtn:             { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.glass08, borderWidth: 1, borderColor: colors.glass12 },
});
