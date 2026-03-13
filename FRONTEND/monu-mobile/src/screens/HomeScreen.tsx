import React, { useState, useEffect, useCallback } from 'react';
import {
  Pressable, ScrollView, StyleSheet, Text, View,
  ActivityIndicator, Alert, Modal, TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { COLORS } from '../config/colors';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { RootStackParamList } from '../navigation/AppNavigator';
import { addSongToPlaylist, createPlaylist, getMyPlaylists, getTrendingSongs, getNewestSongs, Playlist, Song } from '../services/music';
import { getPopularGenres } from '../services/favorites';
import { Genre } from '../types/favorites';
import { SongSection } from '../components/SongSection';

const PUBLIC_LINK_BASE = 'https://phazelsound.oopsgolden.id.vn';

type HomeNavigationProp = NativeStackNavigationProp<RootStackParamList, 'MainTabs'>;

const quickActions = [
  { title: 'Nhạc chữa lành', emoji: '🌙', color: [COLORS.cardHealingFrom, COLORS.gradPurple] as const },
  { title: 'Top Trending', emoji: '🔥', color: [COLORS.cardTrendingFrom, COLORS.cardTrendingTo] as const },
  { title: 'Acoustic', emoji: '🎸', color: [COLORS.cardAcousticFrom, COLORS.cardAcousticTo] as const },
  { title: 'Lofi Focus', emoji: '🎧', color: [COLORS.cardLofiFrom, COLORS.cardLofiTo] as const },
];

export const HomeScreen = () => {
  const navigation = useNavigation<HomeNavigationProp>();
  const { authSession } = useAuth();
  const { playSong, currentSong, isPlaying } = usePlayer();
  const insets = useSafeAreaInsets();

  const [trendingSongs, setTrendingSongs] = useState<Song[]>([]);
  const [newestSongs, setNewestSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [playlistPickerOpen, setPlaylistPickerOpen] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const fetchSongs = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [trending, newest, popularGenres] = await Promise.all([
        getTrendingSongs({ page: 1, size: 10 }),
        getNewestSongs({ page: 1, size: 10 }),
        getPopularGenres(12),
      ]);
      setTrendingSongs(trending.content);
      setNewestSongs(newest.content);
      setGenres(popularGenres);
    } catch {
      Alert.alert('Lỗi', 'Không thể tải danh sách nhạc');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    void fetchSongs(false);
    const id = setInterval(() => void fetchSongs(true), 12000);
    return () => clearInterval(id);
  }, []);

  const handlePressSong = useCallback((song: Song, queue: Song[]) => {
    playSong(song, queue);
  }, [playSong]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const displayName = authSession?.profile?.fullName || authSession?.profile?.email?.split('@')[0] || 'bạn';

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h >= 6 && h < 10) return 'Chào buổi sáng ☀';
    if (h >= 10 && h < 13) return 'Buổi trưa vui vẻ 🌤';
    if (h >= 13 && h < 17) return 'Good afternoon 🌤';
    if (h >= 17 && h < 22) return 'Chào buổi tối 🌆';
    return 'Chúc ngủ ngon 🌙';
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 90 }}>
        <LinearGradient colors={[COLORS.gradPurple, COLORS.gradIndigo, COLORS.bg]} style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Pressable style={styles.headerTop} onPress={() => navigation.navigate('Profile')}>
            <View>
              <Text style={styles.greeting}>{getGreeting()},</Text>
              <Text style={styles.name}>{displayName} 👋</Text>
            </View>
            <View style={styles.avatarCircle}><Text style={{ fontSize: 20 }}>👤</Text></View>
          </Pressable>

          <Pressable onPress={() => navigation.navigate('Search')} style={({ pressed }) => [styles.searchBar, { opacity: pressed ? 0.8 : 1 }]}>
            <Text style={styles.searchIcon}>🔍</Text>
            <Text style={styles.searchPlaceholder}>Tìm bài hát, nghệ sĩ...</Text>
          </Pressable>
        </LinearGradient>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Phát nhanh</Text>
          <View style={styles.grid}>
            {quickActions.map(item => (
              <Pressable key={item.title} style={styles.quickCard}>
                <LinearGradient colors={item.color} style={styles.quickCardGradient}>
                  <Text style={styles.cardEmoji}>{item.emoji}</Text>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                </LinearGradient>
              </Pressable>
            ))}
          </View>
        </View>

        {loading && <ActivityIndicator size="large" color={COLORS.accent} style={{ marginTop: 30 }} />}

        {!loading && (
          <>


        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎶 Thể loại nhạc</Text>
          <View style={styles.genreWrap}>
            {genres.map(g => (
              <View key={g.id} style={styles.genreChip}><Text style={styles.genreText}>{g.name}</Text></View>
            ))}
          </View>
        </View>
            <SongSection
              title="🔥 Trending"
              songs={trendingSongs}
              currentSong={currentSong}
              isPlaying={isPlaying}
              onPressSong={song => handlePressSong(song, trendingSongs)}
              onSongAction={setSelectedSong}
              formatDuration={formatDuration}
            />
            <SongSection
              title="✨ Mới phát hành"
              songs={newestSongs}
              currentSong={currentSong}
              isPlaying={isPlaying}
              onPressSong={song => handlePressSong(song, newestSongs)}
              onSongAction={setSelectedSong}
              formatDuration={formatDuration}
            />
          </>
        )}
      </ScrollView>

      <Modal visible={!!selectedSong} transparent animationType="slide" onRequestClose={() => setSelectedSong(null)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setSelectedSong(null)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{selectedSong?.title}</Text>
            <Text style={styles.sheetItem}>Chia sẻ: {PUBLIC_LINK_BASE}/song/{selectedSong?.id}</Text>
            <Pressable onPress={async () => {
              if (!selectedSong) return;
              try {
                const myPl = await getMyPlaylists({ page: 1, size: 50 });
                setPlaylists(myPl.content ?? []);
                setPlaylistPickerOpen(true);
              } catch {
                setPlaylists([]);
                setPlaylistPickerOpen(true);
              }
            }}><Text style={styles.sheetItem}>Thêm vào playlist</Text></Pressable>
            <Text style={styles.sheetItem}>Dislike: Không quan tâm</Text>
            <Text style={styles.sheetItem}>Tải xuống</Text>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={playlistPickerOpen} transparent animationType="slide" onRequestClose={() => setPlaylistPickerOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setPlaylistPickerOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Thêm vào playlist</Text>
            {playlists.map((p) => (
              <Pressable key={p.id} onPress={async () => {
                if (!selectedSong) return;
                try {
                  await addSongToPlaylist(p.id, selectedSong.id);
                  Alert.alert('Thành công', `Đã thêm vào ${p.name}`);
                  setPlaylistPickerOpen(false);
                } catch (error: any) {
                  Alert.alert('Lỗi', error?.message || 'Không thể thêm vào playlist');
                }
              }}><Text style={styles.sheetItem}>{p.name}</Text></Pressable>
            ))}
            <TextInput style={styles.playlistInput} value={newPlaylistName} onChangeText={setNewPlaylistName} placeholder="Tạo playlist mới" placeholderTextColor={COLORS.glass45} />
            <Pressable onPress={async () => {
              if (!selectedSong || !newPlaylistName.trim()) return;
              try {
                const pl = await createPlaylist({ name: newPlaylistName.trim(), visibility: 'PUBLIC' });
                await addSongToPlaylist(pl.id, selectedSong.id);
                setNewPlaylistName('');
                setPlaylistPickerOpen(false);
              } catch (error: any) {
                Alert.alert('Lỗi', error?.message || 'Không thể tạo playlist mới');
              }
            }}><Text style={styles.sheetItemAccent}>+ Tạo mới và thêm</Text></Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  greeting: { color: COLORS.glass50, fontSize: 14 },
  name: { color: COLORS.white, fontSize: 26, fontWeight: '800' },
  avatarCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.glass10, alignItems: 'center', justifyContent: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.glass08, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, gap: 10, borderWidth: 1, borderColor: COLORS.glass12 },
  searchIcon: { fontSize: 15 },
  searchPlaceholder: { color: COLORS.glass40, fontSize: 14, flex: 1 },
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionTitle: { color: COLORS.white, fontSize: 20, fontWeight: '800', marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickCard: { width: '47%', borderRadius: 14, overflow: 'hidden' },
  quickCardGradient: { padding: 16, minHeight: 90, justifyContent: 'space-between' },
  cardEmoji: { fontSize: 26 },
  cardTitle: { color: COLORS.white, fontWeight: '700' },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: COLORS.scrim },
  sheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18, gap: 10 },
  sheetTitle: { color: COLORS.white, fontSize: 17, fontWeight: '800' },
  sheetItem: { color: COLORS.glass85, fontSize: 14 },
  genreWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genreChip: { backgroundColor: COLORS.surface, borderRadius: 999, borderWidth: 1, borderColor: COLORS.glass15, paddingHorizontal: 12, paddingVertical: 6 },
  genreText: { color: COLORS.glass85, fontSize: 12 },
  playlistInput: { color: COLORS.white, borderWidth: 1, borderColor: COLORS.glass20, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 10 },
  sheetItemAccent: { color: COLORS.accent, fontSize: 14, fontWeight: '700' },
});
