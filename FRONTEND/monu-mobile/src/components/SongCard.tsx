import React, { useMemo, useRef } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign } from '@expo/vector-icons';

import { Song } from '../services/music';
import { useThemeColors } from '../config/colors';
import { MUSIC_EMOJIS } from '../config/emojis';
import { HeartButton } from './HeartButton';

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
    <Pressable
      style={[styles.listCard, isActive && styles.listCardActive]}
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
      <LinearGradient
        colors={isActive ? [colors.accentFill20, colors.accentFill20] : [colors.surface, colors.surfaceLow]}
        style={styles.listCardGradient}
      >
        <View style={[styles.listIconWrap, isActive && styles.listIconWrapActive]}>
          {song.thumbnailUrl
            ? <Image source={{ uri: song.thumbnailUrl }} style={styles.songThumbnail} />
            : <Text style={styles.listIcon}>{MUSIC_EMOJIS.song}</Text>}
        </View>

        <View style={styles.listInfo}>
          <Text style={[styles.listTitle, isActive && styles.listTitleActive]} numberOfLines={1}>
            {song.title}
          </Text>
          <Text style={styles.listSubtitle} numberOfLines={1}>
            {song.primaryArtist.stageName}
          </Text>
        </View>

        {!hideHeart && (
          <HeartButton songId={song.id} size={18} />
        )}

        <Pressable style={styles.listMeta} onPress={onMetaPress}>
          <Text style={styles.listDuration}>{formatDuration(song.durationSeconds)}</Text>
          <Text style={[styles.listArrow, isActive && styles.listArrowActive]}>
            {isPlaying ? (
              <AntDesign name="pause-circle" size={26} color={colors.text} />
            ) : (
              <AntDesign name="play-circle" size={26} color={colors.text} />
            )}
          </Text>
        </Pressable>
      </LinearGradient>
    </Pressable>
  );
};

const getStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  listCard:            { marginBottom: 10, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'transparent' },
  listCardActive:      { borderColor: colors.accentBorder35 },
  listCardGradient:    { flexDirection: 'row', alignItems: 'center', padding: 14 },
  listIconWrap:        { width: 50, height: 50, borderRadius: 12, backgroundColor: colors.accentBorder25, alignItems: 'center', justifyContent: 'center', marginRight: 14, overflow: 'hidden' },
  listIconWrapActive:  { borderWidth: 1.5, borderColor: colors.accent },
  listIcon:            { fontSize: 24 },
  songThumbnail:       { width: 50, height: 50, borderRadius: 12 },
  listInfo:            { flex: 1 },
  listTitle:           { color: colors.text, fontWeight: '700' },
  listTitleActive:     { color: colors.accent },
  listSubtitle:        { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  listMeta:            { alignItems: 'flex-end', gap: 4, marginLeft: 8 },
  listDuration:        { color: colors.textSecondary, fontSize: 12 },
  listArrow:           { color: colors.textSecondary, fontSize: 18 },
  listArrowActive:     { color: colors.accent },
});
