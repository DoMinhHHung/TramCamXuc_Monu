import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useThemeColors } from '../config/colors';
import { useSimilarSongs } from '../hooks/useSimilarSongs';
import { RecommendedSong } from '../services/recommendation';
import { uiPresets } from '../config/uiPresets';

interface SimilarSongsPanelProps {
  currentSongId: string;
  onPress: (song: RecommendedSong) => void;
}

export const SimilarSongsPanel = ({ currentSongId, onPress }: SimilarSongsPanelProps) => {
  const [expanded, setExpanded] = useState(true);
  const { songs, loading } = useSimilarSongs(currentSongId, 8);
  const colors = useThemeColors();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  if (!loading && !songs.length) return null;

  return (
    <View style={styles.root}>
      <Pressable style={styles.header} onPress={() => setExpanded((v) => !v)}>
        <Text style={styles.headerTitle}>💡 Có thể bạn thích</Text>
        <Text style={styles.chevron}>{expanded ? '⌃' : '⌄'}</Text>
      </Pressable>

      {expanded && (loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={songs}
          keyExtractor={(s) => s.songId}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => onPress(item)}>
              {item.thumbnailUrl ? (
                <Image source={{ uri: item.thumbnailUrl }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbFallback]}>
                  <Text style={styles.fallbackIcon}>🎵</Text>
                </View>
              )}
              <View style={styles.info}>
                <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.artist} numberOfLines={1}>
                  {item.primaryArtist?.stageName}
                </Text>
                {/* <ReasonBadge reasonType={item.reasonType} /> */}
              </View>
              <Text style={styles.arrow}>›</Text>
            </Pressable>
          )}
        />
      ))}
    </View>
  );
};

const createStyles = (c: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  root: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: c.glass10,
    paddingTop: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    color: c.glass50,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  chevron: { color: c.glass30, fontSize: 16 },
  loading: { paddingVertical: 16, alignItems: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.glass06,
  },
  thumb: { width: 44, height: 44, borderRadius: 8 },
  thumbFallback: { backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
  fallbackIcon: { fontSize: 18 },
  info: { flex: 1, gap: 3 },
  title: { color: c.white, fontSize: 13, fontWeight: '700' },
  artist: { color: c.glass45, fontSize: 11 },
  arrow: { color: c.glass20, fontSize: 20 },
});
