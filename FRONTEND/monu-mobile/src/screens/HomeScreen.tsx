import React, { useState, useEffect, useCallback } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { COLORS } from "../config/colors";
import { useAuth } from "../context/AuthContext";
import { RootStackParamList } from "../navigation/AppNavigator";
import { getTrendingSongs, getNewestSongs, Song } from "../services/music";

type HomeNavigationProp = NativeStackNavigationProp<RootStackParamList, "MainTabs">;

const quickActions = [
  { title: "Nhạc chữa lành", emoji: "🌙", color: [COLORS.cardHealingFrom, COLORS.gradPurple] as const },
  { title: "Top Trending", emoji: "🔥", color: [COLORS.cardTrendingFrom, COLORS.cardTrendingTo] as const },
  { title: "Acoustic", emoji: "🎸", color: [COLORS.cardAcousticFrom, COLORS.cardAcousticTo] as const },
  { title: "Lofi Focus", emoji: "🎧", color: [COLORS.cardLofiFrom, COLORS.cardLofiTo] as const },
];

export const HomeScreen = () => {
  const navigation = useNavigation<HomeNavigationProp>();
  const { authSession } = useAuth();
  const insets = useSafeAreaInsets();

  const [trendingSongs, setTrendingSongs] = useState<Song[]>([]);
  const [newestSongs, setNewestSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);

  useEffect(() => {
    fetchSongs();
  }, []);

  const fetchSongs = async () => {
    try {
      setLoading(true);

      const [trending, newest] = await Promise.all([
        getTrendingSongs({ page: 1, size: 10 }),
        getNewestSongs({ page: 1, size: 10 }),
      ]);

      setTrendingSongs(trending.content);
      setNewestSongs(newest.content);
    } catch (err) {
      console.error(err);
      Alert.alert("Lỗi", "Không thể tải danh sách nhạc");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSong = useCallback((song: Song) => {
    setSelectedSong(song);
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const displayName =
      authSession?.profile?.fullName ||
      authSession?.profile?.email?.split("@")[0] ||
      "bạn";

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 10) return "Chào buổi sáng ☀";
    if (hour >= 10 && hour < 13) return "Buổi trưa vui vẻ 🌤";
    if (hour >= 13 && hour < 17) return "Good afternoon 🌤";
    if (hour >= 17 && hour < 22) return "Chào buổi tối 🌆";
    return "Chúc ngủ ngon 🌙";
  };

  return (
      <View style={styles.container}>
        <StatusBar style="light" />

        <ScrollView showsVerticalScrollIndicator={false}>
          <LinearGradient
              colors={[COLORS.gradPurple, COLORS.gradIndigo, COLORS.bg]}
              style={[styles.header, { paddingTop: insets.top + 16 }]}
          >
            <Pressable
                style={styles.headerTop}
                onPress={() => navigation.navigate("Profile")}
            >
              <View>
                <Text style={styles.greeting}>{getGreeting()},</Text>
                <Text style={styles.name}>{displayName} 👋</Text>
              </View>

              <View style={styles.avatarCircle}>
                <Text style={{ fontSize: 20 }}>👤</Text>
              </View>
            </Pressable>
          </LinearGradient>

          {/* Quick actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Phát nhanh</Text>

            <View style={styles.grid}>
              {quickActions.map((item) => (
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
              <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 30 }} />
          )}

          {!loading && (
              <>
                <SongSection
                    title="🔥 Trending"
                    songs={trendingSongs}
                    onPressSong={handleSelectSong}
                    formatDuration={formatDuration}
                />

                <SongSection
                    title="✨ Mới phát hành"
                    songs={newestSongs}
                    onPressSong={handleSelectSong}
                    formatDuration={formatDuration}
                />
              </>
          )}
        </ScrollView>
      </View>
  );
};

const SongSection = ({
                       title,
                       songs,
                       onPressSong,
                       formatDuration,
                     }: {
  title: string;
  songs: Song[];
  onPressSong: (song: Song) => void;
  formatDuration: (s: number) => string;
}) => {
  if (!songs.length) return null;

  return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>

        {songs.slice(0, 5).map((song) => (
            <SongCard
                key={song.id}
                song={song}
                onPress={onPressSong}
                formatDuration={formatDuration}
            />
        ))}
      </View>
  );
};

const SongCard = ({
                    song,
                    onPress,
                    formatDuration,
                  }: {
  song: Song;
  onPress: (song: Song) => void;
  formatDuration: (s: number) => string;
}) => {
  return (
      <Pressable style={styles.listCard} onPress={() => onPress(song)}>
        <LinearGradient
            colors={[COLORS.surface, COLORS.surfaceLow]}
            style={styles.listCardGradient}
        >
          <View style={styles.listIconWrap}>
            {song.thumbnailUrl ? (
                <Image source={{ uri: song.thumbnailUrl }} style={styles.songThumbnail} />
            ) : (
                <Text style={styles.listIcon}>🎵</Text>
            )}
          </View>

          <View style={styles.listInfo}>
            <Text style={styles.listTitle} numberOfLines={1}>
              {song.title}
            </Text>

            <Text style={styles.listSubtitle} numberOfLines={1}>
              {song.primaryArtist.stageName}
            </Text>
          </View>

          <View style={styles.listMeta}>
            <Text style={styles.listCount}>
              {formatDuration(song.durationSeconds)}
            </Text>
            <Text style={styles.listArrow}>▶</Text>
          </View>
        </LinearGradient>
      </Pressable>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  header: { paddingHorizontal: 20, paddingBottom: 24 },

  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  greeting: { color: COLORS.glass50, fontSize: 14 },

  name: { color: COLORS.white, fontSize: 26, fontWeight: "800" },

  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.glass10,
    alignItems: "center",
    justifyContent: "center",
  },

  section: { paddingHorizontal: 20, marginTop: 24 },

  sectionTitle: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 14,
  },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },

  quickCard: { width: "47%", borderRadius: 14, overflow: "hidden" },

  quickCardGradient: { padding: 16, minHeight: 90, justifyContent: "space-between" },

  cardEmoji: { fontSize: 26 },

  cardTitle: { color: COLORS.white, fontWeight: "700" },

  listCard: { marginBottom: 10, borderRadius: 14, overflow: "hidden" },

  listCardGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },

  listIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: COLORS.accentBorder25,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  listIcon: { fontSize: 24 },

  listInfo: { flex: 1 },

  listTitle: { color: COLORS.white, fontWeight: "700" },

  listSubtitle: { color: COLORS.glass45, fontSize: 12 },

  listMeta: { alignItems: "flex-end" },

  listCount: { color: COLORS.glass35, fontSize: 12 },

  listArrow: { color: COLORS.glass30, fontSize: 20 },

  songThumbnail: { width: 50, height: 50, borderRadius: 12 },
});