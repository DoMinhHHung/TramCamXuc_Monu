import React, { useState, useEffect, useCallback } from 'react';
import {
  Pressable, ScrollView, StyleSheet, Text, View,
  Image, ActivityIndicator, Alert,
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
import { getTrendingSongs, getNewestSongs, Song } from '../services/music';

type HomeNavigationProp = NativeStackNavigationProp<RootStackParamList, 'MainTabs'>;

const quickActions = [
  { title: 'Nhạc chữa lành', emoji: '🌙', color: [COLORS.cardHealingFrom, COLORS.gradPurple] as const },
  { title: 'Top Trending',   emoji: '🔥', color: [COLORS.cardTrendingFrom, COLORS.cardTrendingTo] as const },
  { title: 'Acoustic',       emoji: '🎸', color: [COLORS.cardAcousticFrom, COLORS.cardAcousticTo] as const },
  { title: 'Lofi Focus',     emoji: '🎧', color: [COLORS.cardLofiFrom, COLORS.cardLofiTo] as const },
];

export const HomeScreen = () => {
  const navigation  = useNavigation<HomeNavigationProp>();
  const { authSession } = useAuth();
  const { playSong, currentSong, isPlaying } = usePlayer();
  const insets      = useSafeAreaInsets();

  const [trendingSongs, setTrendingSongs] = useState<Song[]>([]);
  const [newestSongs,   setNewestSongs]   = useState<Song[]>([]);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => { fetchSongs(); }, []);

  const fetchSongs = async () => {
    try {
      setLoading(true);
      const [trending, newest] = await Promise.all([
        getTrendingSongs({ page: 1, size: 10 }),
        getNewestSongs({ page: 1, size: 10 }),
      ]);
      setTrendingSongs(trending.content);
      setNewestSongs(newest.content);
    } catch {
      Alert.alert('Lỗi', 'Không thể tải danh sách nhạc');
    } finally {
      setLoading(false);
    }
  };

  const handlePressSong = useCallback((song: Song, queue: Song[]) => {
    playSong(song, queue);
  }, [playSong]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const displayName =
      authSession?.profile?.fullName ||
      authSession?.profile?.email?.split('@')[0] ||
      'bạn';

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h >= 6  && h < 10) return 'Chào buổi sáng ☀';
    if (h >= 10 && h < 13) return 'Buổi trưa vui vẻ 🌤';
    if (h >= 13 && h < 17) return 'Good afternoon 🌤';
    if (h >= 17 && h < 22) return 'Chào buổi tối 🌆';
    return 'Chúc ngủ ngon 🌙';
  };

  return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 90 }}
        >
          {/* Header */}
          <LinearGradient
              colors={[COLORS.gradPurple, COLORS.gradIndigo, COLORS.bg]}
              style={[styles.header, { paddingTop: insets.top + 16 }]}
          >
            <Pressable style={styles.headerTop} onPress={() => navigation.navigate('Profile')}>
              <View>
                <Text style={styles.greeting}>{getGreeting()},</Text>
                <Text style={styles.name}>{displayName} 👋</Text>
              </View>
              <View style={styles.avatarCircle}>
                <Text style={{ fontSize: 20 }}>👤</Text>
              </View>
            </Pressable>

            {/* Search bar giả — bấm vào navigate sang SearchScreen */}
            <Pressable
                onPress={() => navigation.navigate('Search')}
                style={({ pressed }) => [
                  styles.searchBar,
                  { opacity: pressed ? 0.8 : 1 }
                ]}
            >
              <Text style={styles.searchIcon}>🔍</Text>
              <Text style={styles.searchPlaceholder}>Tìm bài hát, nghệ sĩ...</Text>
            </Pressable>
          </LinearGradient>

          {/* Quick actions */}
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

          {loading && (
              <ActivityIndicator size="large" color={COLORS.accent} style={{ marginTop: 30 }} />
          )}

          {!loading && (
              <>
                <SongSection
                    title="🔥 Trending"
                    songs={trendingSongs}
                    currentSong={currentSong}
                    isPlaying={isPlaying}
                    onPressSong={song => handlePressSong(song, trendingSongs)}
                    formatDuration={formatDuration}
                />
                <SongSection
                    title="✨ Mới phát hành"
                    songs={newestSongs}
                    currentSong={currentSong}
                    isPlaying={isPlaying}
                    onPressSong={song => handlePressSong(song, newestSongs)}
                    formatDuration={formatDuration}
                />
              </>
          )}
        </ScrollView>
      </View>
  );
};

// ─── SongSection ──────────────────────────────────────────────────────────────
const SongSection = ({
                       title, songs, currentSong, isPlaying, onPressSong, formatDuration,
                     }: {
  title: string; songs: Song[]; currentSong: Song | null;
  isPlaying: boolean; onPressSong: (song: Song) => void;
  formatDuration: (s: number) => string;
}) => {
  if (!songs.length) return null;
  return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {songs.slice(0, 5).map(song => (
            <SongCard
                key={song.id}
                song={song}
                isActive={currentSong?.id === song.id}
                isPlaying={currentSong?.id === song.id && isPlaying}
                onPress={() => onPressSong(song)}
                formatDuration={formatDuration}
            />
        ))}
      </View>
  );
};

// ─── SongCard ─────────────────────────────────────────────────────────────────
const SongCard = ({
                    song, isActive, isPlaying, onPress, formatDuration,
                  }: {
  song: Song; isActive: boolean; isPlaying: boolean;
  onPress: () => void; formatDuration: (s: number) => string;
}) => (
    <Pressable style={[styles.listCard, isActive && styles.listCardActive]} onPress={onPress}>
      <LinearGradient
          colors={isActive ? [COLORS.accentFill20, COLORS.accentFill20] : [COLORS.surface, COLORS.surfaceLow]}
          style={styles.listCardGradient}
      >
        <View style={[styles.listIconWrap, isActive && styles.listIconWrapActive]}>
          {song.thumbnailUrl
              ? <Image source={{ uri: song.thumbnailUrl }} style={styles.songThumbnail} />
              : <Text style={styles.listIcon}>🎵</Text>
          }
        </View>
        <View style={styles.listInfo}>
          <Text style={[styles.listTitle, isActive && styles.listTitleActive]} numberOfLines={1}>
            {song.title}
          </Text>
          <Text style={styles.listSubtitle} numberOfLines={1}>{song.primaryArtist.stageName}</Text>
        </View>
        <View style={styles.listMeta}>
          <Text style={styles.listDuration}>{formatDuration(song.durationSeconds)}</Text>
          <Text style={[styles.listArrow, isActive && styles.listArrowActive]}>
            {isPlaying ? '⏸' : '▶'}
          </Text>
        </View>
      </LinearGradient>
    </Pressable>
);

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: COLORS.bg },
  header:     { paddingHorizontal: 20, paddingBottom: 20 },
  headerTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  greeting:   { color: COLORS.glass50, fontSize: 14 },
  name:       { color: COLORS.white, fontSize: 26, fontWeight: '800' },
  avatarCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.glass10, alignItems: 'center', justifyContent: 'center' },

  searchBar:         { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.glass08, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, gap: 10, borderWidth: 1, borderColor: COLORS.glass12 },
  searchIcon:        { fontSize: 15 },
  searchPlaceholder: { color: COLORS.glass40, fontSize: 14, flex: 1 },

  section:      { paddingHorizontal: 20, marginTop: 24 },
  sectionTitle: { color: COLORS.white, fontSize: 20, fontWeight: '800', marginBottom: 14 },
  grid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickCard:    { width: '47%', borderRadius: 14, overflow: 'hidden' },
  quickCardGradient: { padding: 16, minHeight: 90, justifyContent: 'space-between' },
  cardEmoji:    { fontSize: 26 },
  cardTitle:    { color: COLORS.white, fontWeight: '700' },

  listCard:           { marginBottom: 10, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'transparent' },
  listCardActive:     { borderColor: COLORS.accentBorder35 },
  listCardGradient:   { flexDirection: 'row', alignItems: 'center', padding: 14 },
  listIconWrap:       { width: 50, height: 50, borderRadius: 12, backgroundColor: COLORS.accentBorder25, alignItems: 'center', justifyContent: 'center', marginRight: 14, overflow: 'hidden' },
  listIconWrapActive: { borderWidth: 1.5, borderColor: COLORS.accent },
  listIcon:           { fontSize: 24 },
  songThumbnail:      { width: 50, height: 50, borderRadius: 12 },
  listInfo:           { flex: 1 },
  listTitle:          { color: COLORS.white, fontWeight: '700' },
  listTitleActive:    { color: COLORS.accent },
  listSubtitle:       { color: COLORS.glass45, fontSize: 12, marginTop: 2 },
  listMeta:           { alignItems: 'flex-end', gap: 4 },
  listDuration:       { color: COLORS.glass35, fontSize: 12 },
  listArrow:          { color: COLORS.glass30, fontSize: 18 },
  listArrowActive:    { color: COLORS.accent },
});