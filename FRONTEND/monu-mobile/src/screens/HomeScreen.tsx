import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AntDesign, FontAwesome, Fontisto, MaterialIcons, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useThemeColors, type ColorScheme } from '../config/colors';
import { MOOD_EMOJIS, MUSIC_EMOJIS } from '../config/emojis';
import { useAuth } from '../context/AuthContext';
import { usePlayerControls, usePlayerState, usePlayerStatus } from '../context/PlayerContext';
import { useDownload } from '../context/DownloadContext';
import { useTranslation } from '../context/LocalizationContext';
import { RootStackParamList } from '../navigation/AppNavigator';
import { RecommendationSection } from '../components/RecommendationSection';
import { TrendingSongCard } from '../components/TrendingSongCard';
import {
  SectionSkeleton,
  SongCardSkeleton,
  StatsStripSkeleton,
} from '../components/SkeletonLoader';
import { SongSection } from '../components/SongSection';
import { AddToPlaylistSheet } from '../components/AddToPlaylistSheet';
import { SongActionSheet } from '../components/SongActionSheet';
import { AnimatedDecorIcon } from '../components/AnimatedDecorIcon';
import {
  addSongToPlaylist,
  createPlaylist,
  getNewestSongs,
  getTrendingSongs,
  isSoundCloudExternalSong,
  searchSongs,
  getMyPlaylists,
  Song,
} from '../services/music';
import { type FeedbackType, RecommendedSong, getTop10Trending } from '../services/recommendation';
import { getSongShareQr } from '../services/social';
import { buildGenreSectionsFromPool, useHomeDataPriority } from '../hooks/useHomeDataPriority';
import { useRecommendations } from '../hooks/useRecommendations';
import { useExternalMusicSections } from '../hooks/useExternalMusicSections';
import { AlbumCard } from '../components/AlbumCard';
import { ArtistCardEnhanced } from '../components/ArtistCardEnhanced';
import { MonuBrandHeaderTitle } from '../components/MonuBrandHeaderTitle';
import { StreakBanner } from '../components/StreakBanner';
import { ContinueListeningSection } from '../components/ContinueListeningSection';
import { MoodPickerSection, type MoodItem } from '../components/MoodPickerSection';
import { ReportReasonSheet } from '../components/ReportReasonSheet';
import { openInSpotify, soundCloudTrackToSong } from '../services/externalMusic';
import { moderateScale } from '../utils/responsive';
import { uiPresets } from '../config/uiPresets';

type HomeNavigationProp = NativeStackNavigationProp<RootStackParamList, 'MainTabs'>;
const TOP_ARTIST_CARD_STEP = 112; // 96px card + 16px gap
const HEADER_COLLAPSE_DISTANCE = 118;

const getStatusBarStyle = (backgroundColor: string): 'light' | 'dark' => {
  const hex = backgroundColor.replace('#', '');
  if (hex.length !== 6) return 'light';
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance > 0.6 ? 'dark' : 'light';
};

const toSong = (r: RecommendedSong): Song => ({
  id: r.songId,
  title: r.title,
  primaryArtist: r.primaryArtist,
  genres: r.genres,
  thumbnailUrl: r.thumbnailUrl,
  durationSeconds: r.durationSeconds,
  playCount: r.playCount,
  status: 'PUBLIC',
  transcodeStatus: 'COMPLETED',
  createdAt: '',
  updatedAt: '',
});

const shuffleInSession = <T,>(items: T[]): T[] => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

export const HomeScreen = () => {
  const navigation = useNavigation<HomeNavigationProp>();
  const { authSession } = useAuth();
  const { playSong } = usePlayerControls();
  const { currentSong } = usePlayerState();
  const { isPlaying } = usePlayerStatus();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { startDownload, isDownloaded, getJobStatus } = useDownload();
  const { t } = useTranslation();
  const palette = useThemeColors();
  const headerPadTop = insets.top + (windowWidth < 360 ? 8 : 12);
  const headerPadH = windowWidth < 360 ? 14 : 20;
  const greetingFontSize = windowWidth < 340 ? 16 : windowWidth < 400 ? 19 : 22;
  const greetingSubFontSize = windowWidth < 340 ? 11 : 13;
  const avatarSize = windowWidth < 360 ? 34 : 38;
  /** Reserve space under sticky header so content does not sit underneath */
  const headerSpacer = useMemo(
    () => headerPadTop + 124,
    [headerPadTop],
  );

  const rec = useRecommendations();

  // Lấy language để truyền vào hook (vi/en)
  const { language } = useTranslation();
  const externalSections = useExternalMusicSections(language === 'en' ? 'en' : 'vi');

  const {
    legacyTrendingSongs,
    legacyNewestSongs,
    playlists,
    genres,
    genreSections,
    homeStats,
    phase3Loading,
    refresh: refreshHomePriority,
    setGenreSections,
  } = useHomeDataPriority();

  const [localPlaylists, setLocalPlaylists] = useState(playlists || []);
  useEffect(() => {
    if (playlists) setLocalPlaylists(playlists);
  }, [playlists]);

  const genreBatchGenRef = useRef(0);

  const fetchGenreSectionsLazy = useCallback(async () => {
    if (!genres.length) return;
    const batch = ++genreBatchGenRef.current;
    try {
      const [trending, newest] = await Promise.all([
        getTrendingSongs({ page: 1, size: 60 }),
        getNewestSongs({ page: 1, size: 40 }),
      ]);
      if (batch !== genreBatchGenRef.current) return;
      const allSongs = [...(trending.content ?? []), ...(newest.content ?? [])];
      const shuffled = shuffleInSession(allSongs);
      setGenreSections(buildGenreSectionsFromPool(genres, shuffled, 2));
    } catch {
      /* keep existing genre sections / cache */
    }
  }, [genres, setGenreSections]);

  useEffect(() => {
    const t = setTimeout(() => {
      void fetchGenreSectionsLazy();
    }, 1500);
    return () => clearTimeout(t);
  }, [genres, fetchGenreSectionsLazy]);

  const [pullRefreshing, setPullRefreshing] = useState(false);

  const styles = useMemo(() => getStyles(palette), [palette]);
  const scrollY = useRef(new Animated.Value(0)).current;

  const [top10Songs, setTop10Songs] = useState<RecommendedSong[]>([]);
  const [top10Loading, setTop10Loading] = useState(true);

  useEffect(() => {
    getTop10Trending()
      .then(setTop10Songs)
      .finally(() => setTop10Loading(false));
  }, []);

  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [selectedRecSong, setSelectedRecSong] = useState<RecommendedSong | null>(null);
  const [songToAdd, setSongToAdd] = useState<Song | null>(null);
  const [playlistPickerOpen, setPlaylistPickerOpen] = useState(false);
  const [reportSheetOpen, setReportSheetOpen] = useState(false);
  const [reportSongId, setReportSongId] = useState<string | null>(null);
  const [qrModal, setQrModal] = useState<{ title: string; qr?: string } | null>(null);
  const [headerAvatarFailed, setHeaderAvatarFailed] = useState(false);

  const topArtistsScrollRef = useRef<ScrollView | null>(null);
  const topArtistsPausedRef = useRef(false);
  const topArtistIndexRef = useRef(0);

  const playRec = useCallback((r: RecommendedSong, queue: RecommendedSong[]) => {
    playSong(toSong(r), queue.map(toSong));
  }, [playSong]);

  const openRecActionSheet = useCallback((r: RecommendedSong) => {
    setSelectedRecSong(r);
    setSelectedSong(toSong(r));
  }, []);

  const openSongActionSheet = useCallback((song: Song) => {
    setSelectedRecSong(null);
    setSelectedSong(song);
  }, []);

  const handlePressSong = useCallback((song: Song, queue: Song[]) => {
    playSong(song, queue);
  }, [playSong]);

  const handleOpenProfile = useCallback(() => {
    const parentNavigation = navigation.getParent();
    const rootNavigation = parentNavigation?.getParent?.();

    if (rootNavigation && 'navigate' in rootNavigation) {
      (rootNavigation as { navigate: (route: 'Profile') => void }).navigate('Profile');
      return;
    }

    if (parentNavigation && 'navigate' in parentNavigation) {
      (parentNavigation as { navigate: (route: 'Profile') => void }).navigate('Profile');
      return;
    }

    (navigation as unknown as { navigate: (route: 'Profile') => void }).navigate('Profile');
  }, [navigation]);

  const handleOpenSearch = useCallback((initialQuery?: string) => {
    const parentNavigation = navigation.getParent();
    const rootNavigation = parentNavigation?.getParent?.();
    type SearchNav = { navigate: (route: 'Search', params?: { initialQuery?: string }) => void };

    if (rootNavigation && 'navigate' in rootNavigation) {
      (rootNavigation as unknown as SearchNav).navigate('Search', initialQuery ? { initialQuery } : undefined);
      return;
    }
    if (parentNavigation && 'navigate' in parentNavigation) {
      (parentNavigation as unknown as SearchNav).navigate('Search', initialQuery ? { initialQuery } : undefined);
      return;
    }
    (navigation as unknown as SearchNav).navigate('Search', initialQuery ? { initialQuery } : undefined);
  }, [navigation]);

  const handleSelectMood = useCallback((mood: MoodItem) => {
    handleOpenSearch(mood.query);
  }, [handleOpenSearch]);

  const handleOpenInsights = useCallback(() => {
    const parentNavigation = navigation.getParent();
    const rootNavigation = parentNavigation?.getParent?.();

    if (rootNavigation && 'navigate' in rootNavigation) {
      (rootNavigation as { navigate: (route: 'Insights') => void }).navigate('Insights');
      return;
    }

    if (parentNavigation && 'navigate' in parentNavigation) {
      (parentNavigation as { navigate: (route: 'Insights') => void }).navigate('Insights');
      return;
    }

    (navigation as unknown as { navigate: (route: 'Insights') => void }).navigate('Insights');
  }, [navigation]);

  const handleFeedback = useCallback((songId: string, feedback: FeedbackType) => {
    void rec.sendFeedback(songId, feedback, 'home');
  }, [rec]);

  const handleDownloadSong = useCallback(async (song: Song) => {
    try {
      await startDownload(song);
    } catch {
      Alert.alert('Cần nâng cấp', 'Tính năng tải nhạc cần gói Premium.');
    }
  }, [startDownload]);

  const handleAddToPlaylist = useCallback(async (playlistId: string) => {
    if (!songToAdd) return;
    if (isSoundCloudExternalSong(songToAdd)) {
      Alert.alert('Không hỗ trợ', 'Bài hát SoundCloud hiện không hỗ trợ thêm vào playlist nội bộ.');
      setPlaylistPickerOpen(false);
      setSongToAdd(null);
      return;
    }
    try {
      await addSongToPlaylist(playlistId, songToAdd.id);
      Alert.alert('Thành công', 'Đã thêm vào playlist.');
      setPlaylistPickerOpen(false);
      setSongToAdd(null);
    } catch (e: unknown) {
      Alert.alert('Lỗi', e instanceof Error ? e.message : 'Không thể thêm');
    }
  }, [songToAdd]);

  const handleCreateAndAdd = useCallback(async (name: string) => {
    if (!songToAdd || !name.trim()) return;
    if (isSoundCloudExternalSong(songToAdd)) {
      Alert.alert('Không hỗ trợ', 'Bài hát SoundCloud hiện không hỗ trợ thêm vào playlist nội bộ.');
      setPlaylistPickerOpen(false);
      setSongToAdd(null);
      return;
    }
    try {
      const pl = await createPlaylist({ name: name.trim(), visibility: 'PUBLIC' });
      await addSongToPlaylist(pl.id, songToAdd.id);
      setPlaylistPickerOpen(false);
      setSongToAdd(null);
    } catch (e: unknown) {
      Alert.alert('Lỗi', e instanceof Error ? e.message : 'Không thể tạo playlist');
    }
  }, [songToAdd]);

  const openReportReasonPicker = useCallback((songId: string) => {
    setReportSongId(songId);
    setReportSheetOpen(true);
  }, []);

  useEffect(() => {
    const artistsCount = homeStats?.topArtists?.length ?? 0;
    if (artistsCount < 2) return;

    const intervalId = setInterval(() => {
      if (topArtistsPausedRef.current || !topArtistsScrollRef.current) return;

      topArtistIndexRef.current = (topArtistIndexRef.current + 1) % artistsCount;
      topArtistsScrollRef.current.scrollTo({
        x: topArtistIndexRef.current * TOP_ARTIST_CARD_STEP,
        y: 0,
        animated: true,
      });
    }, 3200);

    return () => clearInterval(intervalId);
  }, [homeStats?.topArtists]);

  const handleSeeMoreGenre = useCallback(async (genreId: string) => {
    const section = genreSections[genreId];
    if (!section) return;

    if (section.expanded) {
      setGenreSections((prev) => ({
        ...prev,
        [genreId]: {
          ...prev[genreId],
          expanded: false,
        },
      }));
      return;
    }

    setGenreSections((prev) => ({
      ...prev,
      [genreId]: {
        ...prev[genreId],
        loading: true,
      },
    }));

    try {
      const res = await searchSongs({ genreId, page: 1, size: 20 });
      const allSongs = shuffleInSession(res.content ?? []);

      setGenreSections((prev) => ({
        ...prev,
        [genreId]: {
          ...prev[genreId],
          songs: allSongs,
          hasMore: allSongs.length > 5,
          expanded: true,
          loading: false,
        },
      }));
    } catch {
      setGenreSections((prev) => ({
        ...prev,
        [genreId]: {
          ...prev[genreId],
          loading: false,
        },
      }));
      Alert.alert('Lỗi', 'Không thể tải thêm bài hát theo thể loại');
    }
  }, [genreSections]);

  const handleRefresh = useCallback(async () => {
    setPullRefreshing(true);
    try {
      await Promise.all([
        rec.refresh(),
        refreshHomePriority(),
        externalSections.refresh(),
        getTop10Trending().then(setTop10Songs),
      ]);
    } finally {
      setPullRefreshing(false);
    }
  }, [rec, refreshHomePriority, externalSections]);

  const formatDuration = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, []);

  const displayName = authSession?.profile?.fullName
    || authSession?.profile?.email?.split('@')[0]
    || 'bạn';

  const greetingNameMax = windowWidth < 360 ? 20 : windowWidth < 400 ? 26 : 34;

  const getContextualGreeting = () => {
    const h = new Date().getHours();
    let name = displayName.trim().replace(/\s+/g, ' ') || displayName;
    if (name.length > greetingNameMax) {
      name = `${name.slice(0, Math.max(10, greetingNameMax - 1))}…`;
    }

    const slots: Array<{
      from: number;
      to: number;
      greeting: string;
      suggest: string;
      emoji: string;
    }> = [
      {
        from: 5,
        to: 10,
        greeting: `Chào buổi sáng, ${name}!`,
        suggest: 'Khởi động ngày mới với Monu',
        emoji: '☀️',
      },
      {
        from: 10,
        to: 13,
        greeting: `Chào ${name}!`,
        suggest: 'Buổi trưa vui vẻ',
        emoji: '🌤',
      },
      {
        from: 13,
        to: 17,
        greeting: `Chào buổi trưa, ${name}! 🌤`,
        suggest: 'Nghỉ trưa cùng Monu!!!',
        emoji: '🌤',
      },
      {
        from: 17,
        to: 22,
        greeting: `Chào buổi tối, ${name}! 🌆`,
        suggest: 'Thư giãn chút',
        emoji: '🌆',
      },
    ];

    const match = slots.find((s) => h >= s.from && h < s.to);
    if (match) {
      return {
        greeting: match.greeting,
        suggest: match.suggest,
        emoji: match.emoji,
      };
    }

    return {
      greeting: `Chúc ngủ ngon, ${name}! 🌙`,
      suggest: 'Chill chút, rồi đi ngủ',
      emoji: '🌙',
    };
  };

  const homeGreeting = getContextualGreeting();
  const streakDays = homeStats?.currentStreakDays ?? 0;
  const streakIsZero = streakDays === 0;

  const updatedLabel = rec.lastUpdatedAt
    ? (() => {
      const diff = Math.floor((Date.now() - rec.lastUpdatedAt.getTime()) / 60_000);
      return diff < 1 ? 'Vừa cập nhật' : `Cập nhật ${diff} phút trước`;
    })()
    : undefined;

  const headerAvatarUrl = authSession?.profile?.avatarUrl?.trim() || null;

  useEffect(() => {
    setHeaderAvatarFailed(false);
  }, [headerAvatarUrl]);


  return (
    <LinearGradient
      colors={[palette.gradViolet || '#1a0533', palette.bg]}
      style={styles.root}
    >
      <StatusBar style="light" />

      {/* ── MODERN STICKY HEADER ────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.stickyHeader,
          {
            paddingTop: insets.top + 8,
            transform: [
              {
                translateY: scrollY.interpolate({
                  inputRange: [0, 80],
                  outputRange: [0, -10],
                  extrapolate: 'clamp',
                }),
              },
            ],
            backgroundColor: scrollY.interpolate({
              inputRange: [0, 100],
              outputRange: ['rgba(13,13,20,0)', 'rgba(2,6,23,0.8)'],
              extrapolate: 'clamp',
            }),
          },
        ]}
      >
        <View style={[styles.headerContent, { paddingHorizontal: windowWidth < 360 ? 14 : 22 }]}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={handleOpenProfile} accessibilityLabel="Open profile">
              {headerAvatarUrl && !headerAvatarFailed ? (
                <Image
                  source={{ uri: headerAvatarUrl }}
                  style={styles.headerAvatarImage}
                  onError={() => setHeaderAvatarFailed(true)}
                />
              ) : (
                <View style={styles.headerAvatarFallback}>
                  <MaterialIcons name="person" size={20} color={palette.accent} />
                </View>
              )}
            </TouchableOpacity>
            <MonuBrandHeaderTitle accentColor={palette.accent} layout="shrink">
              {t('navigation.headerHome')}
            </MonuBrandHeaderTitle>
          </View>
          <TouchableOpacity style={styles.headerSearchBtn} onPress={handleOpenSearch}>
            <Ionicons name="search" size={24} color={palette.accent} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 70, paddingBottom: 120 }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
        refreshControl={(
          <RefreshControl
            refreshing={pullRefreshing}
            onRefresh={handleRefresh}
            tintColor={palette.accent}
          />
        )}
      >
        {/* ── PERSONALIZED GREETING ─────────────────────────────────────── */}
        <View style={styles.heroSection}>
          <Text
            style={[
              styles.greetingText,
              {
                fontSize:
                  windowWidth < 340 ? moderateScale(22) : windowWidth < 400 ? moderateScale(26) : moderateScale(30),
                lineHeight:
                  windowWidth < 340 ? moderateScale(28) : windowWidth < 400 ? moderateScale(32) : moderateScale(36),
              },
            ]}
            numberOfLines={3}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            maxFontSizeMultiplier={1.2}
          >
            {homeGreeting.greeting}
          </Text>
        </View>

        {/* ── 1. STREAK BANNER ─────────────────────────────────────────── */}
        <StreakBanner
          streakDays={streakDays}
          totalMinutesToday={homeStats?.listeningMinutesToday ?? 0}
          onPress={handleOpenInsights}
        />


        {/* ── 2. TOP 10 XU HƯỚNG (INLINE) ─────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MaterialCommunityIcons name="fire" size={22} color="#FF3B30" />
            <Text style={styles.sectionTitle}>Xu Hướng</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              const parentNav = navigation.getParent();
              const rootNav = parentNav?.getParent?.();
              const nav: any = rootNav ?? parentNav ?? navigation;
              nav.navigate('TrendingChart');
            }}
          >
            <Text style={styles.seeAllText}>Chi tiết →</Text>
          </TouchableOpacity>
        </View>

        {top10Loading ? (
          <View style={{ paddingHorizontal: 20, gap: 8, marginBottom: 24 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <View
                key={i}
                style={{
                  height: 66,
                  borderRadius: 14,
                  backgroundColor: palette.glass08,
                  borderWidth: 1,
                  borderColor: palette.border,
                }}
              />
            ))}
          </View>
        ) : top10Songs.length > 0 ? (
          <View style={[styles.top10List, { marginBottom: 28 }]}>
            {top10Songs.map((song) => (
              <TrendingSongCard
                key={song.songId}
                song={song}
                onPress={(s) => playSong(toSong(s), top10Songs.map(toSong))}
                isPlaying={currentSong?.id === song.songId}
              />
            ))}
          </View>
        ) : null}

        {/* ── 3. DÀNH CHO BẠN (GRID/FEATURED) ──────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('screens.home.recommendForYou')}</Text>
        </View>
        <View style={styles.quickPicksGrid}>
           {legacyTrendingSongs.slice(0, 5).map((song) => (
               <TouchableOpacity key={song.id} style={styles.quickPickItem} onPress={() => playSong(song, legacyTrendingSongs)}>
                   <Image source={{ uri: song.thumbnailUrl }} style={styles.quickPickImg} />
                   <Text style={styles.quickPickTitle} numberOfLines={2}>{song.title}</Text>
               </TouchableOpacity>
           ))}
           <TouchableOpacity style={styles.quickPickItem} onPress={handleOpenSearch}>
               <View style={[styles.quickPickImg, { backgroundColor: palette.accent, alignItems: 'center', justifyContent: 'center'}]}>
                   <MaterialCommunityIcons name="auto-fix" size={24} color={palette.bg} />
               </View>
               <Text style={styles.quickPickTitle} numberOfLines={2}>{t('screens.home.discoveryNew')}</Text>
           </TouchableOpacity>
        </View>

        {/* ── 3b. TÂM TRẠNG ────────────────────────────────────────────── */}
        <MoodPickerSection onSelectMood={handleSelectMood} />

        {/* ── 4. NGHỆ SĨ YÊU THÍCH (CIRCLES) ───────────────────────────── */}
        {homeStats?.topArtists && homeStats.topArtists.length > 0 && (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('homeScreen.topArtists')}</Text>
          </View>
        )}
        {homeStats?.topArtists && homeStats.topArtists.length > 0 && (
          <ScrollView ref={topArtistsScrollRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.artistList}>
            {homeStats.topArtists.map((artist, idx) => (
              <TouchableOpacity 
                key={idx} 
                style={styles.artistCircleCard}
                onPress={() => navigation.navigate('ArtistProfile', { artistId: artist.id })}
              >
                <View style={styles.artistImageWrap}>
                   {artist.avatarUrl || (artist as any).imageUrl ? (
                     <Image source={{ uri: artist.avatarUrl || (artist as any).imageUrl }} style={styles.artistImage} />
                   ) : (
                     <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarEmoji}>🎤</Text>
                     </View>
                   )}
                </View>
                <Text style={styles.artistName} numberOfLines={1}>{artist.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* ... existing recommendation blocks ... */}
        {authSession && (
          <RecommendationSection
            icon="✨"
            title={t('screens.home.recommendBasicForYou')}
            subtitle={updatedLabel}
            songs={rec.basicHomeFeed?.forYou ?? []}
            activeSongId={currentSong?.id}
            loading={rec.loading && !rec.basicHomeFeed}
            onPress={(s) => playRec(s, rec.basicHomeFeed?.forYou ?? [])}
            onLongPress={openRecActionSheet}
            onFeedback={handleFeedback}
            hasBadge={!!rec.basicHomeFeed?.forYou?.length}
          />
        )}

        {authSession && rec.advancedRecEnabled ? (
          <RecommendationSection
            icon="🤖"
            title={t('screens.home.recommendAdvancedForYou')}
            subtitle={updatedLabel}
            songs={rec.advanceHomeFeed?.forYou ?? []}
            activeSongId={currentSong?.id}
            loading={rec.loading && !rec.advanceHomeFeed}
            onPress={(s) => playRec(s, rec.advanceHomeFeed?.forYou ?? [])}
            onLongPress={openRecActionSheet}
            onFeedback={handleFeedback}
            hasBadge={!!rec.advanceHomeFeed?.forYou?.length}
          />
        ) : null}

        {/* ── CONTEXTUAL (time/mood) ───────────────────────── */}
        {authSession && (() => {
          const feed = rec.advancedRecEnabled ? rec.advanceHomeFeed : rec.basicHomeFeed;
          const songs = feed?.contextual ?? [];
          const label = feed?.contextualLabel ?? 'Phù hợp lúc này 🕐';
          if (!songs.length) return null;
          return (
            <RecommendationSection
              icon="🕐"
              title={label}
              songs={songs}
              activeSongId={currentSong?.id}
              onPress={(s) => playRec(s, songs)}
              onLongPress={openRecActionSheet}
              onFeedback={handleFeedback}
              hasBadge
            />
          );
        })()}

        {/* ── CROWD PICKS (social graph) ───────────────────── */}
        {authSession && rec.advancedRecEnabled && (() => {
          const songs = rec.advanceHomeFeed?.crowdPicks ?? [];
          if (!songs.length) return null;
          return (
            <RecommendationSection
              icon="👥"
              title="Người gu giống bạn"
              songs={songs}
              activeSongId={currentSong?.id}
              onPress={(s) => playRec(s, songs)}
              onLongPress={openRecActionSheet}
              onFeedback={handleFeedback}
              hasBadge
            />
          );
        })()}

        {/* ── DISCOVERY (explore new music) ───────────────── */}
        {authSession && rec.advancedRecEnabled && (() => {
          const songs = rec.advanceHomeFeed?.discover ?? [];
          if (!songs.length) return null;
          return (
            <RecommendationSection
              icon="🔭"
              title="Khám phá mới"
              songs={songs}
              activeSongId={currentSong?.id}
              onPress={(s) => playRec(s, songs)}
              onLongPress={openRecActionSheet}
              onFeedback={handleFeedback}
              hasBadge
            />
          );
        })()}

        <SongSection
          title={`✨ ${t('screens.home.newReleases')}`}
            songs={legacyNewestSongs}
            currentSong={currentSong}
            isPlaying={isPlaying}
            onPressSong={(song) => handlePressSong(song, legacyNewestSongs)}
            onSongAction={openSongActionSheet}
            formatDuration={formatDuration}
        />

        {/* ... remaining legacy sections ... */}

        {/* ── NGOẠI NỀN TẢNG (cuối trang) ──────────────────────────────── */}
        {(externalSections.soundcloudTracks.length > 0 || externalSections.spotifyTracks.length > 0) && (
          <View style={styles.platformWrapper}>
            <View style={[styles.sectionHeader, { marginBottom: 14 }]}>
              <Text style={styles.sectionTitle}>Khám phá ngoài Monu</Text>
            </View>
            <View style={styles.platformRow}>
              {externalSections.soundcloudTracks.length > 0 && (
                <View style={styles.platformCol}>
                  <View style={styles.platformHeader}>
                    <View style={[styles.platformIcon, { backgroundColor: '#ff5708' }]}>
                      <Ionicons name="cloud" size={16} color="#fff" />
                    </View>
                    <Text style={styles.platformTitle}>SoundCloud</Text>
                  </View>
                  {externalSections.soundcloudTracks.slice(0, 3).map(track => (
                    <TouchableOpacity
                      key={track.id}
                      style={styles.platformItem}
                      onPress={() => {
                        const song = soundCloudTrackToSong(track) as any;
                        playSong(song, externalSections.soundcloudTracks.map(t2 => soundCloudTrackToSong(t2) as any));
                      }}
                    >
                      <Image source={{ uri: track.thumbnailUrl }} style={styles.platformThumb} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.platformItemTitle} numberOfLines={1}>{track.title}</Text>
                        <Text style={styles.platformItemSub} numberOfLines={1}>{track.artistUsername}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {externalSections.spotifyTracks.length > 0 && (
                <View style={styles.platformCol}>
                  <View style={styles.platformHeader}>
                    <View style={[styles.platformIcon, { backgroundColor: '#1DB954' }]}>
                      <Ionicons name="musical-notes" size={16} color="#fff" />
                    </View>
                    <Text style={styles.platformTitle}>Spotify</Text>
                  </View>
                  {externalSections.spotifyTracks.slice(0, 3).map(track => (
                    <TouchableOpacity key={track.id} style={styles.platformItem} onPress={() => openInSpotify(track)}>
                      <Image source={{ uri: track.thumbnailUrl }} style={styles.platformThumb} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.platformItemTitle} numberOfLines={1}>{track.name}</Text>
                        <Text style={styles.platformItemSub} numberOfLines={1}>{track.artistName}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>    <MaterialCommunityIcons name="music-box-multiple" color={palette.accent} size={30} /> {t('screens.home.expandedSections')}</Text>
        </View>

        {genres.map((genre) => {
          const section = genreSections[genre.id];
          const songs = section?.songs ?? [];
          const showSeeMore = !!section?.hasMore;

          if (!section?.loading && songs.length === 0) {
            return null;
          }

          return (
            <View key={genre.id}>
              <View style={styles.genreHeaderRow}>
                <Text style={styles.genreSectionTitle}># {genre.name}</Text>
                {showSeeMore && (
                  <Pressable onPress={() => { void handleSeeMoreGenre(genre.id); }} hitSlop={8}>
                    <Text style={styles.seeMoreText}>{section?.expanded ? t('screens.home.showLess') : t('screens.home.showMore')}</Text>
                  </Pressable>
                )}
              </View>

              {section?.loading && (
                <View style={{ paddingHorizontal: 6, marginTop: 6 }}>
                  <SongCardSkeleton />
                  <SongCardSkeleton />
                </View>
              )}

              <SongSection
                title=""
                songs={songs}
                currentSong={currentSong}
                isPlaying={isPlaying}
                onPressSong={(song) => handlePressSong(song, songs)}
                onSongAction={openSongActionSheet}
                formatDuration={formatDuration}
              />
            </View>
          );
        })}
      </Animated.ScrollView>

      <SongActionSheet
        visible={!!selectedSong}
        title={selectedSong?.title}
        subtitle={selectedSong?.primaryArtist?.stageName}
        thumbnailUrl={selectedSong?.thumbnailUrl}
        onClose={() => {
          setSelectedSong(null);
          setSelectedRecSong(null);
        }}
        actions={[
          {
            icon: '↗',
            label: 'Chia sẻ qua QR',
            onPress: async () => {
              if (!selectedSong) return;
              const qr = await getSongShareQr(selectedSong.id);
              setQrModal({ title: selectedSong.title, qr: qr.qrCodeBase64 });
            },
          },
          {
            icon: <AntDesign name="appstore-add" size={20} color={palette.text} />,
            label: 'Thêm vào playlist',
            disabled: isSoundCloudExternalSong(selectedSong),
            sublabel: isSoundCloudExternalSong(selectedSong)
              ? 'Bài hát SoundCloud không thể lưu vào playlist nội bộ'
              : undefined,
            onPress: async () => {
              if (!selectedSong) return;
              if (isSoundCloudExternalSong(selectedSong)) {
                Alert.alert('Không hỗ trợ', 'Bài hát SoundCloud hiện không hỗ trợ thêm vào playlist nội bộ.');
                return;
              }
              try {
                const refreshed = await getMyPlaylists();
                setLocalPlaylists((refreshed as any).content || refreshed || []);
              } catch {}
              setSongToAdd(selectedSong);
              setPlaylistPickerOpen(true);
            },
          },
          {
            icon: isDownloaded(selectedSong?.id ?? '')
              ? <AntDesign name="check-circle" size={20} color={palette.success} />
              : getJobStatus(selectedSong?.id ?? '').state === 'downloading'
                ? <Text style={{ fontSize: 18, color: palette.text }}>⏳</Text>
                : <AntDesign name="download" size={20} color={palette.text} />,
            label: isDownloaded(selectedSong?.id ?? '')
              ? 'Đã tải xuống'
              : getJobStatus(selectedSong?.id ?? '').state === 'downloading'
                ? `Đang tải... ${(getJobStatus(selectedSong?.id ?? '') as { progress?: number }).progress ?? 0}%`
                : 'Tải xuống (Offline)',
            sublabel: isDownloaded(selectedSong?.id ?? '') ? 'Có thể nghe offline' : 'Cần gói Premium',
            disabled: isDownloaded(selectedSong?.id ?? ''),
            onPress: () => { if (selectedSong) void handleDownloadSong(selectedSong); },
          },
          ...(selectedRecSong
            ? [
              {
                icon: '👎',
                label: 'Không muốn nghe bài này',
                onPress: () => selectedRecSong && handleFeedback(selectedRecSong.songId, 'DISLIKE'),
              },
            ]
            : []),
          {
            icon: <AntDesign name="flag" size={20} color={palette.error} />,
            label: 'Báo cáo bài hát',
            separator: true,
            destructive: true,
            onPress: async () => {
              if (!selectedSong) return;
              const songId = selectedSong.id;
              setSelectedSong(null);
              setSelectedRecSong(null);
              setTimeout(() => openReportReasonPicker(songId), 350);
            },
          },
        ]}
      />

      <ReportReasonSheet
        visible={reportSheetOpen && !!reportSongId}
        songId={reportSongId ?? ''}
        source="home"
        onClose={() => {
          setReportSheetOpen(false);
          setReportSongId(null);
        }}
        onReported={() => {
          if (reportSongId) {
            void rec.sendFeedback(reportSongId, 'DISLIKE');
          }
        }}
        t={t}
      />

      <AddToPlaylistSheet
        visible={playlistPickerOpen}
        songTitle={songToAdd?.title ?? ''}
        songSubtitle={songToAdd?.primaryArtist?.stageName}
        thumbnailUrl={songToAdd?.thumbnailUrl}
        playlists={(localPlaylists || []).map(p => ({
          id: p.id,
          name: p.name,
          totalSongs: p.totalSongs,
        }))}
        onClose={() => {
          setPlaylistPickerOpen(false);
          setSongToAdd(null);
        }}
        onSelectPlaylist={(id) => handleAddToPlaylist(id)}
        onCreateAndAdd={(name) => handleCreateAndAdd(name)}
        addDisabled={songToAdd ? isSoundCloudExternalSong(songToAdd) : false}
      />

      <Modal
        visible={!!qrModal}
        transparent
        animationType="fade"
        onRequestClose={() => setQrModal(null)}
      >
        <View style={styles.backdrop}>
          <View style={styles.modalCard}>
            <Pressable style={styles.modalClose} onPress={() => setQrModal(null)}>
              <Text style={styles.modalCloseIcon}>✕</Text>
            </Pressable>
            <Text style={styles.modalTitle}>QR Share · {qrModal?.title}</Text>
            {qrModal?.qr ? (
              <Image source={{ uri: qrModal.qr }} style={styles.qrImage} />
            ) : (
              <Text style={styles.modalItem}>Không tạo được QR</Text>
            )}
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
};

const getStyles = (colors: ColorScheme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  stickyHeader: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 100,
    height: 118,
    justifyContent: 'flex-end',
    paddingBottom: 14,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  headerLeft: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatarImage: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.accentBorder25,
    backgroundColor: colors.surfaceMid,
  },
  headerAvatarFallback: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.accentBorder25,
    backgroundColor: colors.surfaceMid,
  },
  headerSearchBtn: {
    padding: 10,
    borderRadius: 999,
    backgroundColor: colors.glass08,
    borderWidth: 1,
    borderColor: colors.border,
    flexShrink: 0,
  },
  heroSection: { paddingHorizontal: 24, marginTop: 24, marginBottom: 30 },
  overline: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 3,
    marginBottom: 4,
  },
  greetingText: {
    fontWeight: '900',
    color: colors.white,
    letterSpacing: -0.8,
  },
  sectionContainer: { paddingHorizontal: 20, marginBottom: 30 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    marginBottom: 18,
  },
  sectionTitle: { fontSize: 23, fontWeight: '800', color: colors.white, letterSpacing: -0.4 },
  seeAllText: { color: colors.accent, fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  quickPicksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 30,
  },
  quickPickItem: {
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: '45%',
    ...uiPresets.glassSurface(colors, { intensity: 'default', radius: 16 }),
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  quickPickImg: { width: 56, height: 56, backgroundColor: colors.glass08 },
  quickPickTitle: { color: colors.white, flex: 1, fontSize: 13, fontWeight: '700', marginLeft: 10, paddingRight: 8, fontFamily: 'Plus Jakarta Sans' },
  artistList: { paddingLeft: 20, paddingRight: 10, gap: 16 },
  artistCircleCard: { alignItems: 'center', width: 96 },
  artistImageWrap: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 1.5,
    borderColor: colors.accent,
    padding: 2,
    backgroundColor: 'rgba(192,132,252,0.1)',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
  },
  artistImage: { width: '100%', height: '100%', borderRadius: 40 },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    backgroundColor: colors.surfaceMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 24 },
  artistName: { color: colors.text, fontSize: 12, fontWeight: '600', marginTop: 8 },
  top10List: {
    paddingHorizontal: 8,
    marginBottom: 10,
    backgroundColor: 'transparent',
  },
  top10SeeMoreBtn: {
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 20,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.accentBorder25,
    alignItems: 'center',
    backgroundColor: colors.glass08,
  },
  top10SeeMoreText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  platformWrapper: { marginTop: 32, marginBottom: 8 },
  platformRow: { paddingHorizontal: 20, flexDirection: 'row', gap: 14, marginTop: 8, marginBottom: 24 },
  platformCol: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.glass10,
  },
  platformHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  platformIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  platformTitle: { color: colors.white, fontSize: 15, fontWeight: '800' },
  platformItem: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  platformThumb: { width: 50, height: 50, borderRadius: 10, backgroundColor: colors.surfaceMid },
  platformItemTitle: { color: colors.white, fontSize: 14, fontWeight: '700' },
  platformItemSub: { color: colors.muted, fontSize: 11 },
  section: { paddingHorizontal: 20, marginTop: 22 },
  externalSectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionSubtitle: { color: colors.muted, fontSize: 11, marginBottom: 10, paddingLeft: 1 },
  // ── Existing styles...
  genreHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  genreSectionTitle: { color: colors.white, fontSize: 18, fontWeight: '800' },
  seeMoreText: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  loadingWrap: { alignItems: 'center', paddingVertical: 32 },
  loadingText: { color: colors.textSecondary, fontSize: 13, marginTop: 10 },
  backdrop: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.glass10,
  },
  modalTitle: { color: colors.white, fontSize: 17, fontWeight: '800', marginBottom: 10 },
  modalClose: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceMid,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  modalCloseIcon: { color: colors.white, fontSize: 16, fontWeight: '700' },
  modalItem: { color: colors.textSecondary, fontSize: 14, marginTop: 8 },
  qrImage: { width: 220, height: 220, borderRadius: 14, alignSelf: 'center', marginTop: 12 },
});
