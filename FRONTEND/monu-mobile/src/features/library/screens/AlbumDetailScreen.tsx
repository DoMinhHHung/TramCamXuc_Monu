import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ColorScheme, useThemeColors } from '../config/colors';
import { BackButton } from '../components/BackButton';
import { SongCard } from '../components/SongCard';
import { usePlayer } from '../context/PlayerContext';
import { useTranslation } from '../context/LocalizationContext';
import { Album, getAlbumById, getMyAlbumById, Song } from '../services/music';

export const AlbumDetailScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { playSong, currentSong, isPlaying } = usePlayer();
  const themeColors = useThemeColors();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const albumId = route.params?.albumId as string;

  const [album, setAlbum] = useState<Album | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!albumId) return;
      try {
        setLoading(true);
        try {
          setAlbum(await getMyAlbumById(albumId));
        } catch {
          setAlbum(await getAlbumById(albumId));
        }
      } catch (error: any) {
        Alert.alert(t('common.error'), error?.message || t('errors.loadingFailed'));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [albumId]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const queue: Song[] = album?.songs ?? [];

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        <LinearGradient colors={[themeColors.gradIndigo, themeColors.bg]} style={[styles.header, { paddingTop: insets.top + 14 }]}> 
          <View style={styles.backRow}><BackButton onPress={() => navigation.goBack()} /></View>
          <Text style={styles.title}>{album?.title ?? t('labels.album')}</Text>
          <Text style={styles.sub}>{album?.status ?? 'PUBLIC'} • {album?.songs?.length ?? 0} {t('albumDetails.songs')}</Text>
        </LinearGradient>

        <View style={styles.body}>
          {loading ? <ActivityIndicator color={themeColors.accent} /> : null}
          {!loading && !(album?.songs?.length) ? <Text style={styles.empty}>{t('messages.emptyPlaylist')}</Text> : null}

          {(album?.songs ?? []).map((song) => (
            <SongCard
              key={song.id}
              song={song}
              isActive={currentSong?.id === song.id}
              isPlaying={currentSong?.id === song.id && isPlaying}
              onPress={() => playSong(song, queue)}
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
  backRow: { marginBottom: 12 },
  title: { color: colors.white, fontSize: 28, fontWeight: '800' },
  sub: { color: colors.glass60, marginTop: 6 },
  body: { paddingHorizontal: 20, paddingTop: 14, gap: 10 },
  empty: { color: colors.glass60, marginTop: 18 },
});
