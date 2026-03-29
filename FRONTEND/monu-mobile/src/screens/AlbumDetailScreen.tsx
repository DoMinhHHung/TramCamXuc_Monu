import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ColorScheme, useThemeColors } from '../config/colors';
import { BackButton } from '../components/BackButton';
import { SongCard } from '../components/SongCard';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { useTranslation } from '../context/LocalizationContext';
import {
  Album,
  albumTracksAsPlayableSongs,
  favoriteAlbum,
  getAlbumById,
  getMyAlbumById,
  isAlbumFavoritedByMe,
  Song,
  unfavoriteAlbum,
} from '../services/music';

export const AlbumDetailScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { authSession } = useAuth();
  const { playSong, currentSong, isPlaying } = usePlayer();
  const themeColors = useThemeColors();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const albumId = route.params?.albumId as string;

  const [album, setAlbum] = useState<Album | null>(null);
  const [loading, setLoading] = useState(true);
  const [favorited, setFavorited] = useState(false);

  const loadAlbum = useCallback(async () => {
    if (!albumId) return;
    try {
      setLoading(true);
      let data: Album | null = null;
      try {
        data = await getMyAlbumById(albumId);
      } catch {
        data = await getAlbumById(albumId);
      }
      setAlbum(data);
      if (authSession && data?.status === 'PUBLIC') {
        try {
          setFavorited(await isAlbumFavoritedByMe(albumId));
        } catch {
          setFavorited(false);
        }
      } else {
        setFavorited(false);
      }
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.message || t('errors.loadingFailed'));
    } finally {
      setLoading(false);
    }
  }, [albumId, authSession]);

  useEffect(() => {
    void loadAlbum();
  }, [loadAlbum]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const queue: Song[] = albumTracksAsPlayableSongs(album);

  const toggleFavorite = async () => {
    if (!authSession || !albumId || album?.status !== 'PUBLIC') {
      Alert.alert(t('common.error'), t('albumDetails.loginToFavorite', 'Sign in to favorite albums.'));
      return;
    }
    try {
      if (favorited) {
        await unfavoriteAlbum(albumId);
        setFavorited(false);
      } else {
        await favoriteAlbum(albumId);
        setFavorited(true);
      }
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.response?.data?.message ?? e?.message ?? '');
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        <LinearGradient colors={[themeColors.gradIndigo, themeColors.bg]} style={[styles.header, { paddingTop: insets.top + 14 }]}>
          <View style={styles.backRow}>
            <BackButton onPress={() => navigation.goBack()} />
            {authSession && album?.status === 'PUBLIC' ? (
              <Pressable onPress={() => void toggleFavorite()} style={styles.favBtn} hitSlop={10}>
                <Text style={styles.favBtnText}>{favorited ? '♥' : '♡'}</Text>
              </Pressable>
            ) : null}
          </View>
          <Text style={styles.title}>{album?.title ?? t('labels.album')}</Text>
          <Text style={styles.sub}>
            {album?.ownerStageName ? `${album.ownerStageName} · ` : ''}
            {album?.status ?? '—'} · {album?.songs?.length ?? 0} {t('albumDetails.songs')}
          </Text>
          {album?.credits ? (
            <Text style={styles.credits} numberOfLines={4}>{album.credits}</Text>
          ) : null}
        </LinearGradient>

        <View style={styles.body}>
          {loading ? <ActivityIndicator color={themeColors.accent} /> : null}
          {!loading && !(album?.songs?.length) ? <Text style={styles.empty}>{t('messages.emptyPlaylist')}</Text> : null}

          {queue.map((song) => (
            <SongCard
              key={song.id}
              song={song}
              isActive={currentSong?.id === song.id}
              isPlaying={currentSong?.id === song.id && isPlaying}
              onPress={() => {
                if (song.transcodeStatus !== 'COMPLETED') return;
                playSong(song, queue);
              }}
              formatDuration={formatDuration}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 20, paddingBottom: 22 },
  backRow: { marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  favBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favBtnText: { fontSize: 22, color: colors.accent },
  title: { color: colors.white, fontSize: 28, fontWeight: '800' },
  sub: { color: colors.glass60, marginTop: 6 },
  credits: { color: colors.glass60, fontSize: 12, marginTop: 10, lineHeight: 18 },
  body: { paddingHorizontal: 20, paddingTop: 14, gap: 10 },
  empty: { color: colors.glass60, marginTop: 18 },
});
