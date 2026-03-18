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
import { COLORS } from '../config/colors';
import { ReasonBadge } from './ReasonBadge';
import { useSimilarSongs } from '../hooks/useSimilarSongs';
import { RecommendedSong } from '../services/recommendation';

interface SimilarSongsPanelProps {
  currentSongId: string;
  onPress: (song: RecommendedSong) => void;
}

export const SimilarSongsPanel = ({ currentSongId, onPress }: SimilarSongsPanelProps) => {
  const [expanded, setExpanded] = useState(true);
  const { songs, loading } = useSimilarSongs(currentSongId, 8);

  if (!loading && !songs.length) return null;

  return (
    <View style={styles.root}>
      <Pressable style={styles.header} onPress={() => setExpanded((v) => !v)}>
        <Text style={styles.headerTitle}>💡 Có thể bạn thích</Text>
        <Text style={styles.chevron}>{expanded ? '⌃' : '⌄'}</Text>
      </Pressable>

      {expanded && (loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={COLORS.accent} />
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
                <ReasonBadge reasonType={item.reasonType} />
              </View>
              <Text style={styles.arrow}>›</Text>
            </Pressable>
          )}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.glass10,
    paddingTop: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    color: COLORS.glass50,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  chevron: { color: COLORS.glass30, fontSize: 16 },
  loading: { paddingVertical: 16, alignItems: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glass06,
  },
  thumb: { width: 44, height: 44, borderRadius: 8 },
  thumbFallback: { backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  fallbackIcon: { fontSize: 18 },
  info: { flex: 1, gap: 3 },
  title: { color: COLORS.white, fontSize: 13, fontWeight: '600' },
  artist: { color: COLORS.glass40, fontSize: 11 },
  arrow: { color: COLORS.glass20, fontSize: 20 },
});
