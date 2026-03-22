import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ColorScheme, useThemeColors } from '../config/colors';
import { BackButton } from '../components/BackButton';
import { SongCard } from '../components/SongCard';
import { usePlayer } from '../context/PlayerContext';
import { useTranslation } from '../context/LocalizationContext';
import { getPlaylistBySlug, Playlist, reorderPlaylistSong, removeSongFromPlaylist, Song } from '../services/music';

export const PlaylistDetailScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const slug = route.params?.slug as string;
  const fallbackName = route.params?.name as string | undefined;
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [armedSongId, setArmedSongId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const { playSong, currentSong, isPlaying } = usePlayer();
  const themeColors = useThemeColors();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  const loadPlaylist = async () => {
    if (!slug) return;
    try {
      setLoading(true);
      const data = await getPlaylistBySlug(slug);
      setPlaylist(data);
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.message || t('errors.loadingFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadPlaylist(); }, [slug]);

  const songQueue: Song[] = useMemo(() => (
    (playlist?.songs ?? []).map((s) => ({
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
    }))
  ), [playlist?.songs]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const reorderToIndex = async (fromIndex: number, toIndex: number) => {
    if (!playlist?.songs || !playlist.id) return;
    const songs = playlist.songs;
    if (fromIndex === toIndex) return;
    const dragged = songs[fromIndex];
    const movingDown = toIndex > fromIndex;
    const prev = movingDown ? songs[toIndex] : songs[toIndex - 1] ?? null;
    const next = movingDown ? songs[toIndex + 1] ?? null : songs[toIndex] ?? null;

    setReordering(true);
    try {
      await reorderPlaylistSong(playlist.id, {
        draggedId: dragged.playlistSongId,
        prevId: prev?.playlistSongId ?? null,
        nextId: next?.playlistSongId ?? null,
      });
      setArmedSongId(null);
      await loadPlaylist();
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.message || t('playlistDetails.reorderingFailed', 'Could not reorder songs.'));
    } finally {
      setReordering(false);
    }
  };

  const removeSong = async (songId: string, songTitle: string) => {
    if (!playlist?.id) return;
    Alert.alert(t('actions.deletePlaylist'), `"${songTitle}" ${t('actions.confirmDelete').toLowerCase()}`, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await removeSongFromPlaylist(playlist.id, songId);
            await loadPlaylist();
          } catch (error: any) {
            Alert.alert(t('common.error'), error?.message || t('errors.somethingWentWrong'));
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
        <LinearGradient colors={[themeColors.gradIndigo, themeColors.bg]} style={[styles.header, { paddingTop: insets.top + 14 }]}> 
          <View style={styles.backRow}><BackButton onPress={() => navigation.goBack()} /></View>
          <Text style={styles.title}>{playlist?.name || fallbackName || t('labels.title')}</Text>
          <Text style={styles.sub}>{playlist?.totalSongs ?? playlist?.songs?.length ?? 0} {t('playlistDetails.songs')}</Text>
          <Text style={styles.hint}>↕️ Giữ nút kéo ở mép phải để chọn bài, rồi chạm vào vị trí mới để sắp xếp.</Text>
        </LinearGradient>

        <View style={styles.body}>
          {loading ? <View style={styles.center}><ActivityIndicator color={themeColors.accent} /></View> : null}
          {!loading && !(playlist?.songs?.length) ? (
            <View style={styles.emptyCard}><Text style={styles.emptyText}>{t('playlistDetails.addSongsToGetStarted')}</Text></View>
          ) : null}

          {songQueue.map((song, index) => {
            const node = playlist?.songs?.[index];
            const isArmed = armedSongId === node?.playlistSongId;
            return (
              <Pressable
                key={node?.playlistSongId || song.id}
                style={[styles.card, isArmed && styles.cardActive]}
                disabled={reordering}
                onPress={() => {
                  if (!node) return;
                  if (armedSongId && armedSongId !== node.playlistSongId) {
                    const fromIndex = playlist?.songs?.findIndex((item) => item.playlistSongId === armedSongId) ?? -1;
                    if (fromIndex >= 0) {
                      void reorderToIndex(fromIndex, index);
                    }
                    return;
                  }
                  playSong(song, songQueue);
                }}
              >
                <SongCard
                  song={song}
                  isActive={currentSong?.id === song.id}
                  isPlaying={currentSong?.id === song.id && isPlaying}
                  onPress={() => {
                    if (!armedSongId) {
                      playSong(song, songQueue);
                    }
                  }}
                  formatDuration={formatDuration}
                />
                <View style={styles.row}>
                  <Pressable
                    style={[styles.dragHandle, isArmed && styles.dragHandleActive]}
                    onLongPress={() => setArmedSongId(isArmed ? null : node?.playlistSongId ?? null)}
                    delayLongPress={180}
                  >
                    <Text style={styles.dragHandleText}>{isArmed ? '✅ Đang kéo' : '↕️ Kéo'}</Text>
                  </Pressable>
                  <Pressable onPress={() => void removeSong(song.id, song.title)}><Text style={styles.actionDelete}>🗑️</Text></Pressable>
                </View>
              </Pressable>
            );
          })}

          {armedSongId && playlist?.songs?.length ? (
            <View style={styles.dropFooter}>
              <Text style={styles.dropFooterText}>Chạm vào bài muốn đặt vị trí trước nó, hoặc huỷ để tiếp tục nghe nhạc.</Text>
              <Pressable style={styles.cancelDragBtn} onPress={() => setArmedSongId(null)}>
                <Text style={styles.cancelDragText}>Huỷ sắp xếp</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
};

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 20, paddingBottom: 22 },
  backRow: { marginBottom: 12 },
  body: { paddingHorizontal: 20, paddingTop: 14 },
  center: { justifyContent: 'center', alignItems: 'center', paddingTop: 28 },
  title: { color: colors.white, fontSize: 28, fontWeight: '800' },
  sub: { color: colors.glass60, marginTop: 6 },
  hint: { color: colors.glass45, marginTop: 10, fontSize: 13, lineHeight: 18 },
  card: { marginBottom: 10, borderRadius: 14 },
  cardActive: { backgroundColor: colors.accentFill20, borderWidth: 1, borderColor: colors.accentBorder25, paddingBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, marginHorizontal: 8 },
  dragHandle: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.glass15 },
  dragHandleActive: { backgroundColor: colors.accentFill20, borderColor: colors.accentBorder25 },
  dragHandleText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  actionDelete: { color: colors.error, fontSize: 18, fontWeight: '700' },
  emptyCard: { borderRadius: 12, borderWidth: 1, borderColor: colors.glass10, padding: 14, backgroundColor: colors.surface },
  emptyText: { color: colors.glass60 },
  dropFooter: { marginTop: 12, padding: 14, borderRadius: 14, backgroundColor: colors.surface },
  dropFooterText: { color: colors.glass60, lineHeight: 18, marginBottom: 10 },
  cancelDragBtn: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.glass08 },
  cancelDragText: { color: colors.white, fontWeight: '700' },
});
