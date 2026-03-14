import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '../config/colors';
import { usePlayer } from '../context/PlayerContext';
import { getPlaylistBySlug, Playlist, reorderPlaylistSong, Song } from '../services/music';

export const PlaylistDetailScreen = () => {
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const slug = route.params?.slug as string;
  const fallbackName = route.params?.name as string | undefined;
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const { playSong, currentSong, isPlaying } = usePlayer();

  const loadPlaylist = async () => {
    if (!slug) return;
    try {
      setLoading(true);
      const data = await getPlaylistBySlug(slug);
      setPlaylist(data);
    } catch (error: any) {
      Alert.alert('Lỗi', error?.message || 'Không thể tải playlist detail.');
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

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
        <LinearGradient colors={[COLORS.gradIndigo, COLORS.bg]} style={[styles.header, { paddingTop: insets.top + 14 }]}> 
          <Text style={styles.title}>{playlist?.name || fallbackName || 'Playlist detail'}</Text>
          <Text style={styles.sub}>{playlist?.totalSongs ?? playlist?.songs?.length ?? 0} bài hát</Text>
        </LinearGradient>

        <View style={styles.body}>
          {loading ? <View style={styles.center}><ActivityIndicator color={COLORS.accent} /></View> : null}
          {!loading && !(playlist?.songs?.length) ? (
            <View style={styles.emptyCard}><Text style={styles.emptyText}>Playlist chưa có bài hát hoặc backend chưa trả về danh sách songs.</Text></View>
          ) : null}

          {(playlist?.songs ?? []).map((item, index) => {
            const active = currentSong?.id === item.songId;
            return (
              <View key={item.playlistSongId} style={[styles.card, active && styles.cardActive]}>
                <Pressable onPress={() => playSong(songQueue[index], songQueue)}>
                  <Text style={[styles.songTitle, active && styles.songTitleActive]}>{item.title}</Text>
                  <Text style={styles.songMeta}>{item.artistStageName || 'Unknown'} • {Math.floor((item.durationSeconds || 0) / 60)}:{((item.durationSeconds || 0) % 60).toString().padStart(2, '0')} {active && isPlaying ? '• ⏸' : active ? '• ▶' : ''}</Text>
                </Pressable>
                <View style={styles.row}>
                  <Pressable onPress={() => void moveSong(index, 'up')}><Text style={styles.action}>↑</Text></Pressable>
                  <Pressable onPress={() => void moveSong(index, 'down')}><Text style={styles.action}>↓</Text></Pressable>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: 20, paddingBottom: 22 },
  body: { paddingHorizontal: 20, paddingTop: 14 },
  center: { justifyContent: 'center', alignItems: 'center', paddingTop: 28 },
  title: { color: COLORS.white, fontSize: 28, fontWeight: '800' },
  sub: { color: COLORS.glass60, marginTop: 6 },
  card: { backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.glass10, padding: 12, marginBottom: 10 },
  cardActive: { borderColor: COLORS.accentBorder35, backgroundColor: COLORS.accentFill20 },
  songTitle: { color: COLORS.white, fontWeight: '700' },
  songTitleActive: { color: COLORS.accent },
  songMeta: { color: COLORS.glass50, marginTop: 4, fontSize: 12 },
  row: { flexDirection: 'row', gap: 18, marginTop: 10 },
  action: { color: COLORS.accent, fontSize: 16, fontWeight: '700' },
  emptyCard: { borderRadius: 12, borderWidth: 1, borderColor: COLORS.glass10, padding: 14, backgroundColor: COLORS.surface },
  emptyText: { color: COLORS.glass60 },
});
