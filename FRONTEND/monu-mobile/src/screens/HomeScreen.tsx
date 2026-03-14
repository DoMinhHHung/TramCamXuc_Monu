import React, { useState, useEffect, useCallback } from 'react';
import {
  Pressable, ScrollView, StyleSheet, Text, View,
  ActivityIndicator, Alert, Modal, TextInput, Image,
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
import { addSongToPlaylist, createPlaylist, getMyPlaylists, getTrendingSongs, getNewestSongs, Playlist, reportSong, searchSongs, Song } from '../services/music';
import { getPopularGenres } from '../services/favorites';
import { Genre } from '../types/favorites';
import { SongSection } from '../components/SongSection';
import { SongActionSheet } from '../components/SongActionSheet';
import { getSongShareQr } from '../services/social';

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
  const [songToAdd, setSongToAdd] = useState<Song | null>(null);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [genreSongs, setGenreSongs] = useState<Record<string, Song[]>>({});
  const [expandedGenreIds, setExpandedGenreIds] = useState<string[]>([]);
  const [loadingGenreId, setLoadingGenreId] = useState<string | null>(null);

  const [playlistPickerOpen, setPlaylistPickerOpen] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [qrModal, setQrModal] = useState<{ songTitle: string; qr?: string } | null>(null);

  const fetchHomeData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [trending, newest, popularGenres, myPlaylists] = await Promise.all([
        getTrendingSongs({ page: 1, size: 10 }),
        getNewestSongs({ page: 1, size: 10 }),
        getPopularGenres(12),
        getMyPlaylists({ page: 1, size: 50 }),
      ]);
      setTrendingSongs(trending.content);
      setNewestSongs(newest.content);
      setGenres(popularGenres);
      setPlaylists(myPlaylists.content ?? []);
    } catch {
      if (!silent) Alert.alert('Lỗi', 'Không thể tải dữ liệu trang chủ');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    void fetchHomeData(false);
    const id = setInterval(() => void fetchHomeData(true), 15000);
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

  const toggleGenre = async (genreId: string) => {
    if (expandedGenreIds.includes(genreId)) {
      setExpandedGenreIds(prev => prev.filter(id => id !== genreId));
      return;
    }

    try {
      if (!genreSongs[genreId]) {
        setLoadingGenreId(genreId);
        const res = await searchSongs({ genreId, page: 1, size: 8 });
        setGenreSongs(prev => ({ ...prev, [genreId]: res.content ?? [] }));
      }
      setExpandedGenreIds(prev => [...prev, genreId]);
    } finally {
      setLoadingGenreId(null);
    }
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
              <Pressable key={item.title} style={styles.quickCard}><LinearGradient colors={item.color} style={styles.quickCardGradient}><Text style={styles.cardEmoji}>{item.emoji}</Text><Text style={styles.cardTitle}>{item.title}</Text></LinearGradient></Pressable>
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
                  <Pressable key={g.id} style={[styles.genreChip, expandedGenreIds.includes(g.id) && styles.genreChipActive]} onPress={() => void toggleGenre(g.id)}>
                    <Text style={[styles.genreText, expandedGenreIds.includes(g.id) && styles.genreTextActive]}>{expandedGenreIds.includes(g.id) ? '▼ ' : '▶ '} {g.name}</Text>
                  </Pressable>
                ))}
              </View>

              {loadingGenreId && <ActivityIndicator color={COLORS.accent} style={{ marginTop: 10 }} />}

              {expandedGenreIds.map((id) => {
                const genre = genres.find(g => g.id === id);
                const songs = genreSongs[id] ?? [];
                return (
                  <SongSection
                    key={id}
                    title={`# ${genre?.name ?? 'Genre'}`}
                    songs={songs}
                    currentSong={currentSong}
                    isPlaying={isPlaying}
                    onPressSong={(song) => handlePressSong(song, songs)}
                    onSongAction={setSelectedSong}
                    formatDuration={formatDuration}
                  />
                );
              })}
            </View>

            <SongSection title="🔥 Trending" songs={trendingSongs} currentSong={currentSong} isPlaying={isPlaying} onPressSong={song => handlePressSong(song, trendingSongs)} onSongAction={setSelectedSong} formatDuration={formatDuration} />
            <SongSection title="✨ Mới phát hành" songs={newestSongs} currentSong={currentSong} isPlaying={isPlaying} onPressSong={song => handlePressSong(song, newestSongs)} onSongAction={setSelectedSong} formatDuration={formatDuration} />
          </>
        )}
      </ScrollView>

      <SongActionSheet
        visible={!!selectedSong}
        title={selectedSong?.title}
        onClose={() => setSelectedSong(null)}
        onShareQr={async () => {
          if (!selectedSong) return;
          const qr = await getSongShareQr(selectedSong.id);
          setQrModal({ songTitle: selectedSong.title, qr: qr.qrCodeBase64 });
          setSelectedSong(null);
        }}
        onAddToPlaylist={() => {
          if (!selectedSong) return;
          setSongToAdd(selectedSong);
          setSelectedSong(null);
          setPlaylistPickerOpen(true);
        }}
        onReportSong={async () => {
          if (!selectedSong) return;
          await reportSong(selectedSong.id, { reason: 'SPAM', description: 'User reported from action sheet' });
          Alert.alert('Đã báo cáo', 'Cảm ơn bạn, chúng tôi sẽ xem xét bài hát này.');
          setSelectedSong(null);
        }}
      />

      <Modal visible={playlistPickerOpen} transparent animationType="fade" onRequestClose={() => { setPlaylistPickerOpen(false); setSongToAdd(null); }}>
        <View style={styles.centerBackdrop}>
          <View style={styles.centerCard}>
            <Text style={styles.sheetTitle}>Thêm vào playlist</Text>
            <ScrollView style={{ maxHeight: 240 }}>
              {playlists.map((p) => (
                <Pressable key={p.id} onPress={async () => {
                  if (!songToAdd) return;
                  try {
                    await addSongToPlaylist(p.id, songToAdd.id);
                    Alert.alert('Thành công', `Đã thêm vào ${p.name}`);
                    setPlaylistPickerOpen(false);
                    setSongToAdd(null);
                  } catch (error: any) {
                    Alert.alert('Lỗi', error?.message || 'Không thể thêm vào playlist');
                  }
                }}><Text style={styles.sheetItem}>{p.name}</Text></Pressable>
              ))}
            </ScrollView>
            <TextInput style={styles.playlistInput} value={newPlaylistName} onChangeText={setNewPlaylistName} placeholder="Tạo playlist mới" placeholderTextColor={COLORS.glass45} />
            <Pressable onPress={async () => {
              if (!songToAdd || !newPlaylistName.trim()) return;
              try {
                const pl = await createPlaylist({ name: newPlaylistName.trim(), visibility: 'PUBLIC' });
                await addSongToPlaylist(pl.id, songToAdd.id);
                setNewPlaylistName('');
                setPlaylistPickerOpen(false);
                setSongToAdd(null);
              } catch (error: any) {
                Alert.alert('Lỗi', error?.message || 'Không thể tạo playlist mới');
              }
            }}><Text style={styles.sheetItemAccent}>+ Tạo mới và thêm</Text></Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={!!qrModal} transparent animationType="fade" onRequestClose={() => setQrModal(null)}>
        <View style={styles.centerBackdrop}>
          <View style={styles.centerCard}>
            <Text style={styles.sheetTitle}>QR Share • {qrModal?.songTitle}</Text>
            {qrModal?.qr ? <Image source={{ uri: qrModal.qr }} style={{ width: 220, height: 220, borderRadius: 8 }} /> : <Text style={styles.sheetItem}>Không tạo được QR</Text>}
          </View>
        </View>
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
  centerBackdrop: { flex: 1, backgroundColor: COLORS.scrim, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  centerCard: { width: '100%', backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: COLORS.glass10 },
  sheetTitle: { color: COLORS.white, fontSize: 17, fontWeight: '800' },
  sheetItem: { color: COLORS.glass85, fontSize: 14, marginTop: 8 },
  genreWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genreChip: { backgroundColor: COLORS.surface, borderRadius: 999, borderWidth: 1, borderColor: COLORS.glass15, paddingHorizontal: 12, paddingVertical: 6 },
  genreChipActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accentFill20 },
  genreText: { color: COLORS.glass85, fontSize: 12 },
  genreTextActive: { color: COLORS.accent, fontWeight: '700' },
  playlistInput: { color: COLORS.white, borderWidth: 1, borderColor: COLORS.glass20, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginTop: 10 },
  sheetItemAccent: { color: COLORS.accent, fontSize: 14, fontWeight: '700', marginTop: 10 },
});
