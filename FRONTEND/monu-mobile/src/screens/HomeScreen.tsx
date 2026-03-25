import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AntDesign, Fontisto, MaterialIcons } from '@expo/vector-icons';

const LEGACY_CACHE_KEY = 'home_legacy_cache_v1';

import { ColorScheme, useThemeColors } from '../config/colors';
import { MOOD_EMOJIS, MUSIC_EMOJIS } from '../config/emojis';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { useDownload } from '../context/DownloadContext';
import { useTranslation } from '../context/LocalizationContext';
import { RootStackParamList } from '../navigation/AppNavigator';
import { RecommendationSection } from '../components/RecommendationSection';
import { SongSection } from '../components/SongSection';
import { SongActionSheet } from '../components/SongActionSheet';
import { AnimatedDecorIcon } from '../components/AnimatedDecorIcon';
import {
  addSongToPlaylist,
  createPlaylist,
  getNewestSongs,
  getTrendingSongs,
  searchSongs,
  Song,
} from '../services/music';
import { getPopularGenres } from '../services/favorites';
import { FeedbackType, RecommendedSong } from '../services/recommendation';
import { getSongShareQr } from '../services/social';
import { Genre } from '../types/favorites';
import { useHomeData } from '../hooks/useHomeData';
import { useHomeStats } from '../hooks/useHomeStats';
import { AlbumCard } from '../components/AlbumCard';
import { ArtistCardEnhanced } from '../components/ArtistCardEnhanced';

type HomeNavigationProp = NativeStackNavigationProp<RootStackParamList, 'MainTabs'>;
const TOP_ARTIST_CARD_STEP = 292;

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

const buildGenreSectionsFromPool = (
  genres: Genre[],
  songsPool: Song[],
): Record<string, { songs: Song[]; hasMore: boolean; expanded: boolean; loading: boolean }> => {
  const dedupedPool = Array.from(new Map(songsPool.map((song) => [song.id, song])).values());

  const nextSections: Record<string, { songs: Song[]; hasMore: boolean; expanded: boolean; loading: boolean }> = {};
  genres.forEach((genre) => {
    const genreSongs = dedupedPool.filter((song) =>
      (song.genres ?? []).some((songGenre) => songGenre.id === genre.id));

    if (genreSongs.length > 0) {
      nextSections[genre.id] = {
        songs: genreSongs.slice(0, 5),
        hasMore: genreSongs.length > 5,
        expanded: false,
        loading: false,
      };
    }
  });

  return nextSections;
};

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
  const { startDownload, isDownloaded, getJobStatus } = useDownload();
  const { t } = useTranslation();
  const themeColors = useThemeColors();

  const {
    rec,
    playlists,
    loading,
    refresh,
  } = useHomeData();

  const { data: homeStats, loading: statsLoading, error: statsError } = useHomeStats();

  const styles = useMemo(() => getStyles(themeColors), [themeColors]);

  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [selectedRecSong, setSelectedRecSong] = useState<RecommendedSong | null>(null);
  const [songToAdd, setSongToAdd] = useState<Song | null>(null);
  const [playlistPickerOpen, setPlaylistPickerOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [qrModal, setQrModal] = useState<{ title: string; qr?: string } | null>(null);

  const [legacyTrendingSongs, setLegacyTrendingSongs] = useState<Song[]>([]);
  const [legacyNewestSongs, setLegacyNewestSongs] = useState<Song[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [genreSections, setGenreSections] = useState<Record<string, {
    songs: Song[];
    hasMore: boolean;
    expanded: boolean;
    loading: boolean;
  }>>({});
  const [legacyLoading, setLegacyLoading] = useState(false);
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
    try {
      await addSongToPlaylist(playlistId, songToAdd.id);
      Alert.alert('Thành công', 'Đã thêm vào playlist.');
      setPlaylistPickerOpen(false);
      setSongToAdd(null);
    } catch (e: unknown) {
      Alert.alert('Lỗi', e instanceof Error ? e.message : 'Không thể thêm');
    }
  }, [songToAdd]);

  const handleCreateAndAdd = useCallback(async () => {
    if (!songToAdd || !newPlaylistName.trim()) return;
    try {
      const pl = await createPlaylist({ name: newPlaylistName.trim(), visibility: 'PUBLIC' });
      await addSongToPlaylist(pl.id, songToAdd.id);
      setNewPlaylistName('');
      setPlaylistPickerOpen(false);
      setSongToAdd(null);
    } catch (e: unknown) {
      Alert.alert('Lỗi', e instanceof Error ? e.message : 'Không thể tạo playlist');
    }
  }, [songToAdd, newPlaylistName]);

  const fetchLegacySections = useCallback(async (silent = false) => {
    try {
      if (!silent) setLegacyLoading(true);
      const [trending, newest, popularGenres] = await Promise.all([
        getTrendingSongs({ page: 1, size: 10 }),
        getNewestSongs({ page: 1, size: 10 }),
        getPopularGenres(12),
      ]);

      // Non-personalized sections are randomized once per app session.
      setLegacyTrendingSongs(shuffleInSession(trending.content ?? []));
      setLegacyNewestSongs(shuffleInSession(newest.content ?? []));

      const genreList = popularGenres ?? [];
      setGenres(genreList);

      if (genreList.length) {
        const genreResults = await Promise.allSettled(
          genreList.map(async (genre) => {
            const res = await searchSongs({ genreId: genre.id, page: 1, size: 6 });
            const songs = shuffleInSession(res.content ?? []);
            return {
              genreId: genre.id,
              songs: songs.slice(0, 5),
              hasMore: songs.length > 5,
            };
          }),
        );

        const hasAtLeastOneSuccess = genreResults.some((result) => result.status === 'fulfilled');

        if (!hasAtLeastOneSuccess) {
          const fallbackSections = buildGenreSectionsFromPool(
            genreList,
            [...(trending.content ?? []), ...(newest.content ?? [])],
          );
          setGenreSections(fallbackSections);
          return;
        }

        setGenreSections((prev) => {
          const nextSections: Record<string, { songs: Song[]; hasMore: boolean; expanded: boolean; loading: boolean }> = {};

          genreResults.forEach((result, index) => {
            const genreId = genreList[index].id;
            const current = prev[genreId];

            if (result.status === 'fulfilled') {
              nextSections[genreId] = {
                songs: result.value.songs,
                hasMore: result.value.hasMore,
                expanded: current?.expanded ?? false,
                loading: false,
              };
            } else {
              nextSections[genreId] = {
                songs: current?.songs ?? [],
                hasMore: current?.hasMore ?? false,
                expanded: current?.expanded ?? false,
                loading: false,
              };
            }
          });

          return nextSections;
        });
      }
    } catch {
      if (!silent) Alert.alert('Lỗi', 'Không thể tải dữ liệu nhạc theo section');
    } finally {
      if (!silent) setLegacyLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!legacyTrendingSongs.length && !legacyNewestSongs.length) return;
    AsyncStorage.setItem(LEGACY_CACHE_KEY, JSON.stringify({
      trending: legacyTrendingSongs,
      newest: legacyNewestSongs,
      genres,
      genreSections,
    })).catch(() => {});
  }, [legacyTrendingSongs, legacyNewestSongs, genres, genreSections]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(LEGACY_CACHE_KEY);
        if (raw) {
          const c = JSON.parse(raw);
          if (c.trending?.length) setLegacyTrendingSongs(c.trending);
          if (c.newest?.length) setLegacyNewestSongs(c.newest);
          if (c.genres?.length) setGenres(c.genres);
          if (c.genreSections) setGenreSections(c.genreSections);
        }
      } catch {}
      fetchLegacySections(false);
    })();
  }, [fetchLegacySections]);

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
    // Only personalized blocks are refreshed on pull-to-refresh.
    await refresh();
  }, [refresh]);

  const formatDuration = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, []);

  const displayName = authSession?.profile?.fullName
    || authSession?.profile?.email?.split('@')[0]
    || 'bạn';

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 10) return 'Chào buổi sáng ☀';
    if (h < 13) return 'Buổi trưa vui vẻ 🌤';
    if (h < 17) return 'Good afternoon 🌤';
    if (h < 22) return 'Chào buổi tối 🌆';
    return 'Chúc ngủ ngon 🌙';
  };

  const updatedLabel = rec.lastUpdatedAt
    ? (() => {
      const diff = Math.floor((Date.now() - rec.lastUpdatedAt.getTime()) / 60_000);
      return diff < 1 ? 'Vừa cập nhật' : `Cập nhật ${diff} phút trước`;
    })()
    : undefined;


  return (
    <View style={styles.root}>
      <StatusBar style={getStatusBarStyle(themeColors.bg)} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={(
          <RefreshControl
            refreshing={loading}
            onRefresh={handleRefresh}
            tintColor={themeColors.accent}
          />
        )}
      >
        <LinearGradient
          colors={[themeColors.gradPurple, themeColors.gradIndigo, themeColors.bg]}
          style={[styles.header, { paddingTop: insets.top + 16 }]}
        >
          <Pressable
            style={styles.headerTop}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            onPressIn={handleOpenProfile}
          >
            <View>
              <Text style={styles.greeting}>{getGreeting()},</Text>
              <Text style={styles.name}>{displayName} 👋</Text>
              {updatedLabel && (
                <Text style={styles.updatedLabel}>{updatedLabel}</Text>
              )}
            </View>
            <View style={styles.avatarCircle}>
              <AnimatedDecorIcon intensity="medium">
                <Fontisto name="person" color={themeColors.accent} size={24} />
              </AnimatedDecorIcon>
            </View>
          </Pressable>

          <Pressable
            onPressIn={handleOpenSearch}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            style={styles.searchBar}
          >
            <AnimatedDecorIcon>
              <MaterialIcons name="saved-search" color={themeColors.accent} size={26} />
            </AnimatedDecorIcon>
            <Text style={styles.searchPlaceholder}>{t('screens.home.searchPlaceholder')}</Text>
          </Pressable>
        </LinearGradient>

        {/* Dynamic Home Sections */}
        {statsLoading && !homeStats ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={themeColors.accent} />
            <Text style={styles.loadingText}>{t('homeScreen.noDataAvailable')}</Text>
          </View>
        ) : homeStats ? (
          <>
            {/* Albums from Followed Artists */}
            {homeStats.followedArtistAlbums.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>💿 {t('homeScreen.followedArtistsAlbums')}</Text>
                <View style={{ paddingHorizontal: 20 }}>
                  {homeStats.followedArtistAlbums.map((album) => (
                    <AlbumCard
                      key={album.id}
                      album={album}
                      onPress={() => {
                        navigation.navigate('AlbumDetail', {
                          albumId: album.id,
                        });
                      }}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Top Artists */}
            {homeStats.topArtists.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🎤 {t('homeScreen.topArtists')}</Text>
                <ScrollView
                  ref={topArtistsScrollRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.artistHorizontalList}
                  onTouchStart={() => {
                    topArtistsPausedRef.current = true;
                  }}
                  onTouchEnd={() => {
                    topArtistsPausedRef.current = false;
                  }}
                  onScrollEndDrag={() => {
                    topArtistsPausedRef.current = false;
                  }}
                  onMomentumScrollEnd={() => {
                    topArtistsPausedRef.current = false;
                  }}
                  onScroll={(e) => {
                    const x = e.nativeEvent.contentOffset.x;
                    topArtistIndexRef.current = Math.max(0, Math.round(x / TOP_ARTIST_CARD_STEP));
                  }}
                  scrollEventThrottle={16}
                >
                  {homeStats.topArtists.map((artist) => (
                    <ArtistCardEnhanced
                      key={artist.id}
                      artist={artist}
                      style={styles.artistHorizontalCard}
                      onPress={() => {
                        navigation.navigate('ArtistProfile', {
                          artistId: artist.id,
                        });
                      }}
                      onFollowPress={(artistId, isFollowing) => {
                        // TODO: Call follow/unfollow API
                        console.log('Toggle follow for artist:', artistId, isFollowing);
                      }}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

          </>
        ) : null}

        {loading && !rec.homeFeed && !rec.globalTrending.length && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={themeColors.accent} />
            <Text style={styles.loadingText}>{t('screens.home.loadingRecommendations')}</Text>
          </View>
        )}

        {!!rec.error && (
          <View style={styles.errorWrap}>
            <Text style={styles.errorText}>{rec.error}</Text>
          </View>
        )}

        {authSession && (
          <RecommendationSection
            icon="✨"
            title={t('screens.home.recommendForYou')}
            subtitle={updatedLabel}
            songs={rec.homeFeed?.forYou ?? []}
            activeSongId={currentSong?.id}
            loading={rec.loading && !rec.homeFeed}
            onPress={(s) => playRec(s, rec.homeFeed?.forYou ?? [])}
            onLongPress={openRecActionSheet}
            onFeedback={handleFeedback}
            hasBadge={!!rec.homeFeed?.forYou?.length}
          />
        )}


        <SongSection
          title={`✨ ${t('screens.home.newReleases')}`}
            songs={legacyNewestSongs}
            currentSong={currentSong}
            isPlaying={isPlaying}
            onPressSong={(song) => handlePressSong(song, legacyNewestSongs)}
            onSongAction={openSongActionSheet}
            formatDuration={formatDuration}
        />

        <RecommendationSection
          icon="🔥"
          title={t('screens.home.trendingNow')}
          songs={rec.globalTrending}
          activeSongId={currentSong?.id}
          loading={rec.loading && !rec.globalTrending.length}
          // emptyText={emptyTrendingText}
          onPress={(s) => playRec(s, rec.globalTrending)}
          onLongPress={openRecActionSheet}
          hideIfEmpty={false}
        />

        {authSession && (
          <RecommendationSection
            icon="👥"
            title={t('screens.home.friendsAreListening')}
            songs={rec.homeFeed?.friendsAreListening ?? []}
            activeSongId={currentSong?.id}
            loading={rec.loading && !rec.homeFeed}
            onPress={(s) => playRec(s, rec.homeFeed?.friendsAreListening ?? [])}
            onLongPress={openRecActionSheet}
            onFeedback={handleFeedback}
          />
        )}

        {authSession && (
          <RecommendationSection
            icon="🎤"
            title={t('screens.home.fromFollowedArtists')}
            songs={rec.homeFeed?.fromArtists ?? []}
            activeSongId={currentSong?.id}
            loading={rec.loading && !rec.homeFeed}
            onPress={(s) => playRec(s, rec.homeFeed?.fromArtists ?? [])}
            onLongPress={openRecActionSheet}
          />
        )}

        <RecommendationSection
          icon="🌐"
          title={t('screens.home.socialRecommendations')}
          subtitle={t('screens.home.socialRecommendationsSubtitle')}
          songs={rec.socialRecs}
          activeSongId={currentSong?.id}
          loading={rec.loading && !rec.socialRecs.length}
          onPress={(s) => playRec(s, rec.socialRecs)}
          onLongPress={openRecActionSheet}
          onFeedback={handleFeedback}
          // emptyText={emptySocialText}
        />

        {legacyLoading
          && !legacyTrendingSongs.length
          && !legacyNewestSongs.length
          && !genres.length && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={themeColors.accent} />
            <Text style={styles.loadingText}>{t('screens.home.loadingExpandedSections')}</Text>
          </View>
        )}

        <SongSection
          title={`🔥 ${t('screens.home.trending')}`}
          songs={legacyTrendingSongs}
          currentSong={currentSong}
          isPlaying={isPlaying}
          onPressSong={(song) => handlePressSong(song, legacyTrendingSongs)}
          onSongAction={openSongActionSheet}
          formatDuration={formatDuration}
        />

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
                <ActivityIndicator color={themeColors.accent} style={{ marginTop: 10 }} />
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
      </ScrollView>

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
            onPress: () => {
              if (!selectedSong) return;
              setSongToAdd(selectedSong);
              setPlaylistPickerOpen(true);
            },
          },
          {
            icon: isDownloaded(selectedSong?.id ?? '')
              ? <AntDesign name="check-circle" size={20} color={themeColors.success} />
              : getJobStatus(selectedSong?.id ?? '').state === 'downloading'
                ? <ActivityIndicator size="small" color={themeColors.text} />
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
              const { reportSong } = await import('../services/music');
              await reportSong(selectedSong.id, { reason: 'SPAM', description: 'Reported from home' });
              Alert.alert('Đã báo cáo', 'Cảm ơn bạn!');
            },
          },
        ]}
      />

      <Modal
        visible={playlistPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setPlaylistPickerOpen(false);
          setSongToAdd(null);
        }}
      >
        <View style={styles.backdrop}>
          <View style={styles.modalCard}>
            <Pressable
              style={styles.modalClose}
              onPress={() => {
                setPlaylistPickerOpen(false);
                setSongToAdd(null);
              }}
            >
              <Text style={styles.modalCloseIcon}>✕</Text>
            </Pressable>

            <Text style={styles.modalTitle}>Thêm vào playlist</Text>
            <ScrollView style={{ maxHeight: 240 }}>
              {playlists.map((p) => (
                <Pressable key={p.id} onPress={() => { void handleAddToPlaylist(p.id); }}>
                  <Text style={styles.modalItem}>{p.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <TextInput
              style={styles.playlistInput}
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
              placeholder="Tạo playlist mới"
              placeholderTextColor={themeColors.glass45}
            />
            <Pressable onPress={() => { void handleCreateAndAdd(); }}>
              <Text style={styles.modalItemAccent}>+ Tạo mới và thêm</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

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
    </View>
  );
};

const getStyles = (colors: ColorScheme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greeting: { color: colors.textSecondary, fontSize: 14 },
  name: { color: colors.text, fontSize: 26, fontWeight: '800' },
  updatedLabel: { color: colors.muted, fontSize: 11, marginTop: 2 },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surfaceMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLow,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchPlaceholder: { color: colors.muted, fontSize: 14, flex: 1 },
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: '800', marginBottom: 14 },
  artistHorizontalList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  artistHorizontalCard: {
    width: 280,
    marginBottom: 0,
  },
  genreChipCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 20,
  },
  genreChip: {
    borderWidth: 1,
    borderColor: colors.accentBorder25,
    backgroundColor: colors.surfaceLow,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  genreChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentFill20,
  },
  genreChipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  genreChipTextActive: {
    color: colors.accent,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickCard: { width: '47%', borderRadius: 14, overflow: 'hidden' },
  quickGradient: { padding: 16, minHeight: 90, justifyContent: 'space-between' },
  cardEmoji: { fontSize: 26 },
  cardTitle: { color: colors.text, fontWeight: '700' },
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
  errorWrap: {
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: colors.surfaceDim,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: { color: colors.error, fontSize: 12, fontWeight: '600' },
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
  modalItemAccent: { color: colors.accent, fontSize: 14, fontWeight: '700', marginTop: 10 },
  playlistInput: {
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 10,
  },
  qrImage: { width: 220, height: 220, borderRadius: 8, alignSelf: 'center', marginTop: 12 },
});
