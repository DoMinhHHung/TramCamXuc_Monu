import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRoute } from '@react-navigation/native';

import { COLORS } from '../config/colors';
import { usePlayer } from '../context/PlayerContext';
import { getPlaylistBySlug, Playlist, PlaylistSong, reorderPlaylistSong, Song } from '../services/music';

export const PlaylistDetailScreen = () => {
  const route = useRoute<any>();
  const slug = route.params?.slug as string;
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const { playSong } = usePlayer();

  const loadPlaylist = async () => {
    try {
      setLoading(true);
      const data = await getPlaylistBySlug(slug);
      setPlaylist(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadPlaylist(); }, [slug]);

  const songQueue: Song[] = useMemo(() => {
    return (playlist?.songs ?? []).map((s) => ({
      id: s.songId,
      title: s.title,
      primaryArtist: { artistId: s.artistId || '', stageName: s.artistStageName || 'Unknown' },
      genres: [],
      durationSeconds: s.durationSeconds || 0,
      playCount: s.playCount || 0,
      status: 'PUBLIC',
      transcodeStatus: 'COMPLETED',
      thumbnailUrl: s.thumbnailUrl,
      createdAt: '',
      updatedAt: '',
    }));
  }, [playlist?.songs]);

  const moveSong = async (index: number, direction: 'up' | 'down') => {
    if (!playlist?.songs || !playlist.id) return;
    const songs = playlist.songs;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === songs.length - 1) return;

    const dragged = songs[index];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const prev = songs[targetIndex - 1] ?? null;
    const next = songs[targetIndex] ?? null;

    await reorderPlaylistSong(playlist.id, {
      draggedId: dragged.playlistSongId,
      prevId: prev?.playlistSongId ?? null,
      nextId: next?.playlistSongId ?? null,
    });
    await loadPlaylist();
  };

  if (loading) return <View style={[styles.root, styles.center]}><ActivityIndicator color={COLORS.accent} /></View>;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.title}>{playlist?.name}</Text>
        <Text style={styles.sub}>{playlist?.totalSongs ?? playlist?.songs?.length ?? 0} bài hát</Text>

        {(playlist?.songs ?? []).map((item, index) => (
          <View key={item.playlistSongId} style={styles.card}>
            <Pressable onPress={() => playSong(songQueue[index], songQueue)}>
              <Text style={styles.songTitle}>{item.title}</Text>
              <Text style={styles.songMeta}>{item.artistStageName} • {Math.floor((item.durationSeconds || 0) / 60)}:{((item.durationSeconds || 0) % 60).toString().padStart(2, '0')}</Text>
            </Pressable>
            <View style={styles.row}>
              <Pressable onPress={() => void moveSong(index, 'up')}><Text style={styles.action}>↑</Text></Pressable>
              <Pressable onPress={() => void moveSong(index, 'down')}><Text style={styles.action}>↓</Text></Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  center: { justifyContent: 'center', alignItems: 'center' },
  title: { color: COLORS.white, fontSize: 26, fontWeight: '800' },
  sub: { color: COLORS.glass60, marginTop: 4, marginBottom: 12 },
  card: { backgroundColor: COLORS.surface, borderRadius: 10, borderWidth: 1, borderColor: COLORS.glass10, padding: 12, marginBottom: 8 },
  songTitle: { color: COLORS.white, fontWeight: '700' },
  songMeta: { color: COLORS.glass50, marginTop: 2 },
  row: { flexDirection: 'row', gap: 16, marginTop: 8 },
  action: { color: COLORS.accent, fontSize: 16, fontWeight: '700' },
});
