import React, { useCallback, useEffect, useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AntDesign, Fontisto, MaterialIcons } from '@expo/vector-icons';

import { COLORS } from '../config/colors';
import { MOOD_EMOJIS, MUSIC_EMOJIS } from '../config/emojis';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { useDownload } from '../context/DownloadContext';
import { useTranslation } from '../context/LocalizationContext';
import { RootStackParamList } from '../navigation/AppNavigator';
import { RecommendationSection } from '../components/RecommendationSection';
import { SongSection } from '../components/SongSection';
import { SongActionSheet } from '../components/SongActionSheet';
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
import { PlaylistCard } from '../components/PlaylistCard';
import { AlbumCard } from '../components/AlbumCard';
import { ArtistCardEnhanced } from '../components/ArtistCardEnhanced';
import { GenreCard } from '../components/GenreCard';

type HomeNavigationProp = NativeStackNavigationProp<RootStackParamList, 'MainTabs'>;

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

const quickActions = [
  { title: 'Nhạc chữa lành', emoji: MOOD_EMOJIS.healing, color: [COLORS.cardHealingFrom, COLORS.gradPurple] as const },
  { title: 'Top Trending', emoji: MOOD_EMOJIS.trending, color: [COLORS.cardTrendingFrom, COLORS.cardTrendingTo] as const },
  { title: 'Acoustic', emoji: MUSIC_EMOJIS.guitar, color: [COLORS.cardAcousticFrom, COLORS.cardAcousticTo] as const },
  { title: 'Lofi Focus', emoji: MOOD_EMOJIS.focus, color: [COLORS.cardLofiFrom, COLORS.cardLofiTo] as const },
];

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

export const HomeScreen = () => {
  const navigation = useNavigation<HomeNavigationProp>();
  const { authSession } = useAuth();
  const { playSong, currentSong, isPlaying } = usePlayer();
  const insets = useSafeAreaInsets();
  const { startDownload, isDownloaded, getJobStatus } = useDownload();
  const { t } = useTranslation();

  const {
    rec,
    playlists,
    loading,
    refresh,
  } = useHomeData();

  const { data: homeStats, loading: statsLoading, error: statsError } = useHomeStats();

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

      setLegacyTrendingSongs(trending.content ?? []);
      setLegacyNewestSongs(newest.content ?? []);

      const genreList = popularGenres ?? [];
      setGenres(genreList);

      if (genreList.length) {
        const genreResults = await Promise.allSettled(
          genreList.map(async (genre) => {
            const res = await searchSongs({ genreId: genre.id, page: 1, size: 6 });
            const songs = res.content ?? [];
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
    void fetchLegacySections(false);
    const intervalId = setInterval(() => {
      void fetchLegacySections(true);
    }, 90_000);

    return () => clearInterval(intervalId);
  }, [fetchLegacySections]);

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
      const allSongs = res.content ?? [];

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
    await Promise.all([refresh(), fetchLegacySections(true)]);
  }, [fetchLegacySections, refresh]);

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

  // const emptyTrendingText = rec.error
  //   ? 'Không tải được trending. Kéo xuống để thử lại.'
  //   : 'Chưa có dữ liệu trending lúc này.';
  //
  // const emptyNewReleaseText = rec.error
  //   ? 'Không tải được bài mới phát hành. Kéo xuống để thử lại.'
  //   : 'Hiện chưa có bài mới phát hành.';
  //
  // const emptySocialText = !authSession
  //   ? 'Đăng nhập để xem đề xuất cộng đồng.'
  //   : rec.error
  //     ? 'Không tải được đề xuất cộng đồng. Kéo xuống để thử lại.'
  //     : 'Chưa có dữ liệu đề xuất cộng đồng.';

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={(
          <RefreshControl
            refreshing={loading}
            onRefresh={handleRefresh}
            tintColor={COLORS.accent}
          />
        )}
      >
        <LinearGradient
          colors={[COLORS.gradPurple, COLORS.gradIndigo, COLORS.bg]}
          style={[styles.header, { paddingTop: insets.top + 16 }]}
        >
          <Pressable style={styles.headerTop} onPress={() => navigation.navigate('Profile')}>
            <View>
              <Text style={styles.greeting}>{getGreeting()},</Text>
              <Text style={styles.name}>{displayName} 👋</Text>
              {updatedLabel && (
                <Text style={styles.updatedLabel}>{updatedLabel}</Text>
              )}
            </View>
            <View style={styles.avatarCircle}>
              <Fontisto name="person" color="#3B82F6" size={24} />
            </View>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate('Search')}
            style={styles.searchBar}
          >
            <MaterialIcons name="saved-search" color="#2563EB" size={26} />
            <Text style={styles.searchPlaceholder}>{t('screens.home.searchPlaceholder')}</Text>
          </Pressable>
        </LinearGradient>

        {/* Dynamic Home Sections */}
        {statsLoading && !homeStats ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={COLORS.accent} />
            <Text style={styles.loadingText}>{t('homeScreen.noDataAvailable')}</Text>
          </View>
        ) : homeStats ? (
          <>
            {/* Most Played Playlists */}
            {homeStats.mostPlayedPlaylists.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🎵 {t('homeScreen.mostPlayedPlaylists')}</Text>
                <View style={{ paddingHorizontal: 20 }}>
                  {homeStats.mostPlayedPlaylists.map((playlist) => (
                    <PlaylistCard
                      key={playlist.id}
                      playlist={playlist}
                      onPress={() => {
                        navigation.navigate('PlaylistDetail', {
                          slug: playlist.id,
                        });
                      }}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Favorite Albums */}
            {homeStats.favoriteAlbums.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>💿 {t('homeScreen.favoriteAlbums')}</Text>
                <View style={{ paddingHorizontal: 20 }}>
                  {homeStats.favoriteAlbums.map((album) => (
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
                <View style={{ paddingHorizontal: 20 }}>
                  {homeStats.topArtists.map((artist) => (
                    <ArtistCardEnhanced
                      key={artist.id}
                      artist={artist}
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
                </View>
              </View>
            )}

            {/* Trending Genres */}
            {homeStats.trendingGenres.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🔥 {t('homeScreen.trendingGenres')}</Text>
                <View style={{ paddingHorizontal: 20 }}>
                  {homeStats.trendingGenres.map((genre) => (
                    <GenreCard
                      key={genre.id}
                      genre={genre}
                      onPress={() => {
                        navigation.navigate('GenreDetail', {
                          genreId: genre.id,
                          genreName: genre.name,
                        });
                      }}
                    />
                  ))}
                </View>
              </View>
            )}
          </>
        ) : null}

        {loading && !rec.homeFeed && !rec.globalTrending.length && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={COLORS.accent} />
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
            title="Gợi ý cho bạn"
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
            title="✨ Mới phát hành"
            songs={legacyNewestSongs}
            currentSong={currentSong}
            isPlaying={isPlaying}
            onPressSong={(song) => handlePressSong(song, legacyNewestSongs)}
            onSongAction={openSongActionSheet}
            formatDuration={formatDuration}
        />

        <RecommendationSection
          icon="🔥"
          title="Đang hot"
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
            title="Bạn bè đang nghe"
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
            title="Từ nghệ sĩ bạn follow"
            songs={rec.homeFeed?.fromArtists ?? []}
            activeSongId={currentSong?.id}
            loading={rec.loading && !rec.homeFeed}
            onPress={(s) => playRec(s, rec.homeFeed?.fromArtists ?? [])}
            onLongPress={openRecActionSheet}
          />
        )}

        <RecommendationSection
          icon="🌐"
          title="Đề xuất cho bạn"
          subtitle="Dựa trên cộng đồng âm nhạc"
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
            <ActivityIndicator size="small" color={COLORS.accent} />
            <Text style={styles.loadingText}>Đang tải mục nhạc mở rộng...</Text>
          </View>
        )}

        <SongSection
          title="🔥 Trending"
          songs={legacyTrendingSongs}
          currentSong={currentSong}
          isPlaying={isPlaying}
          onPressSong={(song) => handlePressSong(song, legacyTrendingSongs)}
          onSongAction={openSongActionSheet}
          formatDuration={formatDuration}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎶 Nhạc theo thể loại</Text>
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
                    <Text style={styles.seeMoreText}>{section?.expanded ? 'Thu gọn' : 'Xem thêm'}</Text>
                  </Pressable>
                )}
              </View>

              {section?.loading && (
                <ActivityIndicator color={COLORS.accent} style={{ marginTop: 10 }} />
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
            icon: <AntDesign name="appstore-add" size={20} color="#fff" />,
            label: 'Thêm vào playlist',
            onPress: () => {
              if (!selectedSong) return;
              setSongToAdd(selectedSong);
              setPlaylistPickerOpen(true);
            },
          },
          {
            icon: isDownloaded(selectedSong?.id ?? '')
              ? <AntDesign name="check-circle" size={20} color="#4ade80" />
              : getJobStatus(selectedSong?.id ?? '').state === 'downloading'
                ? <ActivityIndicator size="small" color="#fff" />
                : <AntDesign name="download" size={20} color="#fff" />,
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
            icon: <AntDesign name="flag" size={20} color={COLORS.error} />,
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
              placeholderTextColor={COLORS.glass45}
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greeting: { color: COLORS.glass50, fontSize: 14 },
  name: { color: COLORS.white, fontSize: 26, fontWeight: '800' },
  updatedLabel: { color: COLORS.glass30, fontSize: 11, marginTop: 2 },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.glass10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.glass08,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.glass12,
  },
  searchPlaceholder: { color: COLORS.glass40, fontSize: 14, flex: 1 },
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionTitle: { color: COLORS.white, fontSize: 20, fontWeight: '800', marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickCard: { width: '47%', borderRadius: 14, overflow: 'hidden' },
  quickGradient: { padding: 16, minHeight: 90, justifyContent: 'space-between' },
  cardEmoji: { fontSize: 26 },
  cardTitle: { color: COLORS.white, fontWeight: '700' },
  genreHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 18,
    marginBottom: 8,
  },
  genreSectionTitle: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  seeMoreText: { color: COLORS.accent, fontSize: 13, fontWeight: '600' },
  loadingWrap: { alignItems: 'center', paddingVertical: 32 },
  loadingText: { color: COLORS.glass35, fontSize: 13, marginTop: 10 },
  errorWrap: {
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.error,
    backgroundColor: COLORS.warningDim,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: { color: COLORS.error, fontSize: 12, fontWeight: '600' },
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.glass10,
  },
  modalTitle: { color: COLORS.white, fontSize: 17, fontWeight: '800', marginBottom: 10 },
  modalClose: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.glass10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  modalCloseIcon: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  modalItem: { color: COLORS.glass85, fontSize: 14, marginTop: 8 },
  modalItemAccent: { color: COLORS.accent, fontSize: 14, fontWeight: '700', marginTop: 10 },
  playlistInput: {
    color: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.glass20,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 10,
  },
  qrImage: { width: 220, height: 220, borderRadius: 8, alignSelf: 'center', marginTop: 12 },
});
