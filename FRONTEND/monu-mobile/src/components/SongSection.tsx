import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Song } from '../services/music';
import { useThemeColors } from '../config/colors';
import { SongCard } from './SongCard';

type Props = {
  title?: string;
  songs: Song[];
  currentSong: Song | null;
  isPlaying: boolean;
  onPressSong: (song: Song) => void;
  onSongAction?: (song: Song) => void;
  formatDuration: (s: number) => string;
};

export const SongSection = ({ title, songs, currentSong, isPlaying, onPressSong, onSongAction, formatDuration }: Props) => {
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);

  if (!songs.length) return null;

  return (
    <View style={styles.section}>
      {!!title && <Text style={styles.sectionTitle}>{title}</Text>}
      {songs.slice(0, 5).map(song => (
        <SongCard
          key={song.id}
          song={song}
          isActive={currentSong?.id === song.id}
          isPlaying={currentSong?.id === song.id && isPlaying}
          onPress={() => onPressSong(song)}
          onLongPress={onSongAction ? () => onSongAction(song) : undefined}
          onMetaPress={onSongAction ? () => onSongAction(song) : undefined}
          formatDuration={formatDuration}
        />
      ))}
    </View>
  );
};

const getStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: '800', marginBottom: 14 },
});
