import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign } from '@expo/vector-icons';

import { Song } from '../services/music';
import { COLORS } from '../config/colors';
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
                         }: Props) => (
    <Pressable
        style={[styles.listCard, isActive && styles.listCardActive]}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={1000}
    >
      <LinearGradient
          colors={isActive ? [COLORS.accentFill20, COLORS.accentFill20] : [COLORS.surface, COLORS.surfaceLow]}
          style={styles.listCardGradient}
      >
        <View style={[styles.listIconWrap, isActive && styles.listIconWrapActive]}>
          {song.thumbnailUrl
              ? <Image source={{ uri: song.thumbnailUrl }} style={styles.songThumbnail} />
              : <Text style={styles.listIcon}>🎵</Text>}
        </View>

        <View style={styles.listInfo}>
          <Text style={[styles.listTitle, isActive && styles.listTitleActive]} numberOfLines={1}>
            {song.title}
          </Text>
          <Text style={styles.listSubtitle} numberOfLines={1}>
            {song.primaryArtist.stageName}
          </Text>
        </View>

        {/* Heart button */}
        {!hideHeart && (
            <HeartButton songId={song.id} size={18} />
        )}

        <Pressable style={styles.listMeta} onPress={onMetaPress}>
          <Text style={styles.listDuration}>{formatDuration(song.durationSeconds)}</Text>
          <Text style={[styles.listArrow, isActive && styles.listArrowActive]}>
            {
              isPlaying ? (
                <AntDesign name="pause-circle" size={26} color="#fff" />
            ) : (
                <AntDesign name="play-circle" size={26} color="#fff" />
            )}
          </Text>
        </Pressable>
      </LinearGradient>
    </Pressable>
);

const styles = StyleSheet.create({
  listCard:            { marginBottom: 10, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'transparent' },
  listCardActive:      { borderColor: COLORS.accentBorder35 },
  listCardGradient:    { flexDirection: 'row', alignItems: 'center', padding: 14 },
  listIconWrap:        { width: 50, height: 50, borderRadius: 12, backgroundColor: COLORS.accentBorder25, alignItems: 'center', justifyContent: 'center', marginRight: 14, overflow: 'hidden' },
  listIconWrapActive:  { borderWidth: 1.5, borderColor: COLORS.accent },
  listIcon:            { fontSize: 24 },
  songThumbnail:       { width: 50, height: 50, borderRadius: 12 },
  listInfo:            { flex: 1 },
  listTitle:           { color: COLORS.white, fontWeight: '700' },
  listTitleActive:     { color: COLORS.accent },
  listSubtitle:        { color: COLORS.glass45, fontSize: 12, marginTop: 2 },
  listMeta:            { alignItems: 'flex-end', gap: 4, marginLeft: 8 },
  listDuration:        { color: COLORS.glass35, fontSize: 12 },
  listArrow:           { color: COLORS.glass30, fontSize: 18 },
  listArrowActive:     { color: COLORS.accent },
});