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

import { ThemeName, ThemeColors, THEMES } from '../config/themes';
import { useTheme } from '../context/ThemeContext';
import { MOOD_EMOJIS, MUSIC_EMOJIS } from '../config/emojis';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { useDownload } from '../context/DownloadContext';
import { useTranslation } from '../context/LocalizationContext';
import { RootStackParamList } from '../navigation/AppNavigator';
import { RecommendationSection } from '../components/RecommendationSection';
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
import { FeedbackType, RecommendedSong } from '../services/recommendation';
import { getSongShareQr } from '../services/social';
import { buildGenreSectionsFromPool, useHomeDataPriority } from '../hooks/useHomeDataPriority';
import { useRecommendations } from '../hooks/useRecommendations';
import { useExternalMusicSections } from '../hooks/useExternalMusicSections';
import { AlbumCard } from '../components/AlbumCard';
import { ArtistCardEnhanced } from '../components/ArtistCardEnhanced';
import { StreakBanner } from '../components/StreakBanner';
import { ContinueListeningSection } from '../components/ContinueListeningSection';
import { ReportReasonSheet } from '../components/ReportReasonSheet';
import { openInSpotify, soundCloudTrackToSong } from '../services/externalMusic';

type HomeNavigationProp = NativeStackNavigationProp<RootStackParamList, 'MainTabs'>;
const TOP_ARTIST_CARD_STEP = 292;
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
  const { playSong, currentSong, isPlaying } = usePlayer();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { startDownload, isDownloaded, getJobStatus } = useDownload();
  const { t } = useTranslation();
  const { colors: themeColors, theme: currentThemeName } = useTheme();
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

  const styles = useMemo(() => getStyles(themeColors), [themeColors]);
  const scrollY = useRef(new Animated.Value(0)).current;

  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [selectedRecSong, setSelectedRecSong] = useState<RecommendedSong | null>(null);
  const [songToAdd, setSongToAdd] = useState<Song | null>(null);
  const [playlistPickerOpen, setPlaylistPickerOpen] = useState(false);
  const [reportSheetOpen, setReportSheetOpen] = useState(false);
  const [reportSongId, setReportSongId] = useState<string | null>(null);
  const [qrModal, setQrModal] = useState<{ title: string; qr?: string } | null>(null);

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

  const handleOpenSearch = useCallback(() => {
    const parentNavigation = navigation.getParent();
    const rootNavigation = parentNavigation?.getParent?.();

    if (rootNavigation && 'navigate' in rootNavigation) {
      (rootNavigation as { navigate: (route: 'Search') => void }).navigate('Search');
      return;
    }

    if (parentNavigation && 'navigate' in parentNavigation) {
      (parentNavigation as { navigate: (route: 'Search') => void }).navigate('Search');
      return;
    }

    (navigation as unknown as { navigate: (route: 'Search') => void }).navigate('Search');
  }, [navigation]);

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
      await Promise.all([rec.refresh(), refreshHomePriority(), externalSections.refresh()]);
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
        greeting: `Chào buổi sáng, ${name}! ☀️`,
        suggest: 'Khởi động ngày mới với Monu',
        emoji: '☀️',
      },
      {
        from: 10,
        to: 13,
        greeting: `Chào ${name}! 🌤`,
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

  const updatedLabel = rec.lastUpdatedAt
    ? (() => {
      const diff = Math.floor((Date.now() - rec.lastUpdatedAt.getTime()) / 60_000);
      return diff < 1 ? 'Vừa cập nhật' : `Cập nhật ${diff} phút trước`;
    })()
    : undefined;


  return (
    <LinearGradient
      colors={[themeColors.gradViolet || '#1a0533', themeColors.bg]}
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
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={handleOpenProfile}>
              <MaterialIcons name="person" size={26} color={themeColors.accent} />
            </TouchableOpacity>
            <Text style={styles.logoText}>{t('navigation.headerHome')}</Text>
          </View>
          <TouchableOpacity style={styles.headerSearchBtn} onPress={handleOpenSearch}>
            <Ionicons name="search" size={24} color={themeColors.accent} />
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
            tintColor={themeColors.accent}
          />
        )}
      >
        {/* ── PERSONALIZED GREETING ─────────────────────────────────────── */}
        <View style={styles.heroSection}>
          <Text style={styles.greetingText}>{homeGreeting.greeting}</Text>
        </View>

        {/* ── 1. STREAK BANNER ─────────────────────────────────────────── */}
        <View style={styles.sectionContainer}>
          <LinearGradient
            colors={[themeColors.cardTrendingFrom || '#1a1040', themeColors.cardTrendingTo || '#2D1B69']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.streakCard}
          >
            <View style={styles.streakContent}>
              <View style={styles.streakLabelRow}>
                <MaterialCommunityIcons name="fire" size={18} color={themeColors.accent} />
                <Text style={styles.streakLabel}>{t('screens.home.streakLabel')}</Text>
              </View>
              <Text style={styles.streakValue}>{t('screens.home.streakValue', { days: homeStats?.currentStreakDays ?? 0 })}</Text>
              <Text style={styles.streakSub}>{t('screens.home.streakSub')}</Text>
            </View>
            <TouchableOpacity style={styles.streakBtn} onPress={handleOpenInsights}>
              <Text style={styles.streakBtnText}>{t('screens.home.streakDetail')}</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>      

        {/* ── 3. DÀNH CHO BẠN (GRID/FEATURED) ──────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('screens.home.recommendForYou')}</Text>
        </View>
        <View style={styles.featuredGrid}>
          <TouchableOpacity 
            style={styles.featuredMainCard}
            onPress={() => {
              const topSongs = legacyTrendingSongs.slice(0, 10);
              if (topSongs.length > 0) playSong(topSongs[0], topSongs);
            }}
          >
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800' }} 
              style={StyleSheet.absoluteFill} 
            />
            <LinearGradient colors={['transparent', 'rgba(22,19,42,0.9)']} style={styles.cardOverlay}>
              <View style={styles.badge}><Text style={styles.badgeText}>{t('screens.home.dailyMix')}</Text></View>
              <Text style={styles.cardMainTitle}>{t('screens.home.topHits')}</Text>
              <Text style={styles.cardSub}>{t('screens.home.yourMusicGu')}</Text>
              
              <View style={styles.playBadge}>
                <Ionicons name="play" size={16} color="#1a0533" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.discoveryCard}
            onPress={handleOpenSearch}
          >
             <MaterialCommunityIcons name="auto-fix" size={32} color={themeColors.accent} />
             <Text style={styles.discoveryTitle}>{t('screens.home.discoveryNew')}</Text>
             <Text style={styles.discoverySub}>{t('screens.home.discoverySub')}</Text>
          </TouchableOpacity>
        </View>

        {/* ── 4. NGHỆ SĨ YÊU THÍCH (CIRCLES) ───────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('homeScreen.topArtists')}</Text>
        </View>
        {homeStats?.topArtists && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.artistList}>
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

        {/* ── PLATFORM CURATION ───────────────────────── */}
        <View style={styles.platformRow}>
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
        </View>
        
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎶 {t('screens.home.expandedSections')}</Text>
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
            icon: <AntDesign name="appstore-add" size={20} color={themeColors.text} />,
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
              ? <AntDesign name="check-circle" size={20} color={themeColors.success} />
              : getJobStatus(selectedSong?.id ?? '').state === 'downloading'
                ? <Text style={{ fontSize: 18, color: themeColors.text }}>⏳</Text>
                : <AntDesign name="download" size={20} color={themeColors.text} />,
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
            icon: <AntDesign name="flag" size={20} color={themeColors.error} />,
            label: 'Báo cáo bài hát',
            separator: true,
            destructive: true,
            onPress: async () => {
              if (!selectedSong) return;
              openReportReasonPicker(selectedSong.id);
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

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  stickyHeader: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 100,
    height: 110,
    justifyContent: 'flex-end',
    paddingBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  logoText: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.accent,
    letterSpacing: 4,
    fontStyle: 'italic',
  },
  headerSearchBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  heroSection: { paddingHorizontal: 24, marginTop: 20, marginBottom: 24 },
  overline: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 3,
    marginBottom: 4,
  },
  greetingText: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  sectionContainer: { paddingHorizontal: 20, marginBottom: 32 },
  streakCard: {
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(192,132,252,0.15)',
    elevation: 10,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  streakContent: { flex: 1 },
  streakLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  streakLabel: { color: colors.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  streakValue: { fontSize: 42, fontWeight: '900', color: colors.white, letterSpacing: -1 },
  streakSub: { color: colors.textSecondary, fontSize: 13, marginTop: 4, maxWidth: '80%' },
  streakBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 30,
  },
  streakBtnText: { color: '#1a0533', fontSize: 11, fontWeight: '800' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 22, fontWeight: '700', color: colors.text },
  seeAllText: { color: colors.accent, fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  featuredGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    height: 240,
    marginBottom: 32,
  },
  featuredMainCard: {
    flex: 2,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  cardOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', padding: 16 },
  badge: {
    backgroundColor: colors.accent,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  badgeText: { color: '#1a0533', fontSize: 9, fontWeight: '900' },
  cardMainTitle: { fontSize: 24, fontWeight: '800', color: colors.white },
  cardSub: { color: colors.textSecondary, fontSize: 12 },
  playBadge: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  discoveryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
  },
  discoveryTitle: { fontSize: 16, fontWeight: '700', color: colors.white, marginTop: 12 },
  discoverySub: { fontSize: 11, color: colors.muted, marginTop: 4 },
  artistList: { paddingLeft: 24, paddingRight: 10, gap: 20 },
  artistCircleCard: { alignItems: 'center', width: 100 },
  artistImageWrap: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 2,
    borderColor: colors.accent,
    padding: 2,
    backgroundColor: 'rgba(192,132,252,0.1)',
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
  platformRow: { paddingHorizontal: 20, flexDirection: 'row', gap: 16, marginTop: 32, marginBottom: 24 },
  platformCol: { flex: 1 },
  platformHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  platformIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  platformTitle: { color: colors.white, fontSize: 16, fontWeight: '700' },
  platformItem: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  platformThumb: { width: 48, height: 48, borderRadius: 8, backgroundColor: colors.surfaceMid },
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
    marginTop: 18,
    marginBottom: 8,
  },
  genreSectionTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
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
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: { color: colors.text, fontSize: 17, fontWeight: '800', marginBottom: 10 },
  modalClose: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceMid,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  modalCloseIcon: { color: colors.text, fontSize: 16, fontWeight: '700' },
  modalItem: { color: colors.textSecondary, fontSize: 14, marginTop: 8 },
  qrImage: { width: 220, height: 220, borderRadius: 8, alignSelf: 'center', marginTop: 12 },
});
