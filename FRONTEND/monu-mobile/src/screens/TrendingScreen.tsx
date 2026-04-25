import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { useThemeColors, type ColorScheme } from '../config/colors';
import { FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING } from '../config/design';
import { usePlayerControls, usePlayerState } from '../context/PlayerContext';
import { getTop10Trending } from '../services/recommendation';
import type { RecommendedSong } from '../services/recommendation';
import { TrendingSongCard } from '../components/TrendingSongCard';
import type { Song } from '../services/music';

const toSong = (r: RecommendedSong): Song => ({
  id: r.songId,
  title: r.title,
  primaryArtist: r.primaryArtist,
  genres: r.genres ?? [],
  thumbnailUrl: r.thumbnailUrl,
  durationSeconds: r.durationSeconds,
  playCount: r.playCount,
  status: 'PUBLIC',
  transcodeStatus: 'COMPLETED',
  createdAt: '',
  updatedAt: '',
});

export const TrendingScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const palette = useThemeColors();
  const styles = useMemo(() => getStyles(palette), [palette]);
  const { playSong } = usePlayerControls();
  const { currentSong } = usePlayerState();
  const scrollY = useRef(new Animated.Value(0)).current;

  const [songs, setSongs] = useState<RecommendedSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getTop10Trending();
      setSongs(data);
      setUpdatedAt(new Date());
    } catch {
      // keep existing data
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void load();
  }, [load]);

  const handlePlay = useCallback((song: RecommendedSong) => {
    playSong(toSong(song), songs.map(toSong));
  }, [songs, playSong]);

  const updatedLabel = updatedAt
    ? (() => {
        const diff = Math.floor((Date.now() - updatedAt.getTime()) / 60_000);
        return diff < 1 ? 'Vừa cập nhật' : `Cập nhật ${diff} phút trước`;
      })()
    : undefined;

  const headerBg = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: ['rgba(13,13,20,0)', 'rgba(2,6,23,0.95)'],
    extrapolate: 'clamp',
  });

  return (
    <LinearGradient
      colors={[palette.gradViolet || '#1a0533', palette.bg]}
      locations={[0, 0.45]}
      style={styles.root}
    >
      <StatusBar style="light" />

      {/* ── Sticky Header ─────────────────────────────────────────────────── */}
      <Animated.View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: headerBg }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={palette.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <MaterialCommunityIcons name="fire" size={18} color="#FF3B30" />
          <Text style={styles.headerTitle}>Top 10 Xu Hướng</Text>
        </View>
        <View style={{ width: 44 }} />
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 70, paddingBottom: 140 }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={palette.accent}
          />
        }
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>🔥 Top 10 Xu Hướng</Text>
          <Text style={styles.heroSub}>
            Bảng xếp hạng theo lượt nghe, tương tác & đà tăng trưởng
          </Text>
          {updatedLabel && (
            <View style={styles.updateRow}>
              <View style={styles.liveDot} />
              <Text style={styles.updateLabel}>{updatedLabel}</Text>
            </View>
          )}
        </View>

        {/* Score legend */}
        <View style={styles.legendRow}>
          {[
            { icon: '🎧', label: 'Lượt nghe', weight: '50%' },
            { icon: '❤️', label: 'Tương tác', weight: '30%' },
            { icon: '📈', label: 'Đà tăng', weight: '15%' },
            { icon: '✨', label: 'Độ mới', weight: '5%' },
          ].map((item) => (
            <View key={item.label} style={styles.legendItem}>
              <Text style={styles.legendIcon}>{item.icon}</Text>
              <Text style={styles.legendLabel}>{item.label}</Text>
              <Text style={styles.legendWeight}>{item.weight}</Text>
            </View>
          ))}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Song list */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={palette.accent} />
            <Text style={styles.loadingText}>Đang tải bảng xếp hạng...</Text>
          </View>
        ) : songs.length === 0 ? (
          <View style={styles.emptyWrap}>
            <MaterialCommunityIcons name="music-off" size={48} color={palette.muted} />
            <Text style={styles.emptyText}>Chưa có dữ liệu xu hướng</Text>
            <Text style={styles.emptySubText}>Hãy nghe nhạc để bảng xếp hạng hoạt động!</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {songs.map((song) => (
              <TrendingSongCard
                key={song.songId}
                song={song}
                onPress={handlePlay}
                isPlaying={currentSong?.id === song.songId}
              />
            ))}
          </View>
        )}

        {/* Footer note */}
        {songs.length > 0 && (
          <Text style={styles.footerNote}>
            Bảng xếp hạng cập nhật mỗi 2 phút · Decay score mỗi giờ
          </Text>
        )}
      </Animated.ScrollView>
    </LinearGradient>
  );
};

const getStyles = (c: ColorScheme) =>
  StyleSheet.create({
    root: { flex: 1 },
    header: {
      position: 'absolute',
      top: 0, left: 0, right: 0,
      zIndex: 100,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg,
      paddingBottom: 12,
    },
    backBtn: {
      width: 44,
      height: 44,
      borderRadius: RADIUS.full,
      backgroundColor: c.glass08,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.border,
    },
    headerCenter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    headerTitle: {
      fontSize: FONT_SIZE.body_md,
      fontWeight: FONT_WEIGHT.extrabold,
      color: c.white,
      letterSpacing: -0.3,
    },
    hero: {
      paddingHorizontal: SPACING.xxl,
      paddingTop: SPACING.xl,
      paddingBottom: SPACING.lg,
    },
    heroTitle: {
      fontSize: FONT_SIZE.xxl,
      fontWeight: FONT_WEIGHT.black,
      color: c.white,
      letterSpacing: -0.8,
      marginBottom: 8,
    },
    heroSub: {
      fontSize: FONT_SIZE.sm,
      color: c.textSecondary,
      lineHeight: 19,
    },
    updateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 10,
    },
    liveDot: {
      width: 7,
      height: 7,
      borderRadius: RADIUS.full,
      backgroundColor: '#34C759',
    },
    updateLabel: {
      fontSize: FONT_SIZE.xxs,
      color: c.muted,
    },
    legendRow: {
      flexDirection: 'row',
      paddingHorizontal: SPACING.xxl,
      gap: 8,
      marginBottom: SPACING.md,
    },
    legendItem: {
      flex: 1,
      backgroundColor: c.glass08,
      borderRadius: RADIUS.sm,
      paddingVertical: 8,
      paddingHorizontal: 6,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.border,
      gap: 2,
    },
    legendIcon: { fontSize: 14 },
    legendLabel: { fontSize: 9, color: c.muted, textAlign: 'center' },
    legendWeight: {
      fontSize: 11,
      fontWeight: FONT_WEIGHT.extrabold,
      color: c.accent,
    },
    divider: {
      height: 1,
      backgroundColor: c.border,
      marginHorizontal: SPACING.xl,
      marginBottom: SPACING.xs,
    },
    list: { paddingVertical: SPACING.xs },
    loadingWrap: { alignItems: 'center', paddingTop: 60, gap: 12 },
    loadingText: { color: c.textSecondary, fontSize: FONT_SIZE.sm },
    emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 10 },
    emptyText: { color: c.text, fontSize: FONT_SIZE.body, fontWeight: FONT_WEIGHT.bold },
    emptySubText: { color: c.muted, fontSize: FONT_SIZE.sm },
    footerNote: {
      textAlign: 'center',
      color: c.muted,
      fontSize: 10,
      marginTop: SPACING.xxl,
      paddingHorizontal: SPACING.xxl,
    },
  });
