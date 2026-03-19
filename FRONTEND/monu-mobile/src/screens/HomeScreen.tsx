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
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { useDownload } from '../context/DownloadContext';
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
  { title: 'Nhạc chữa lành', emoji: '🌙', color: [COLORS.cardHealingFrom, COLORS.gradPurple] as const },
  { title: 'Top Trending', emoji: '🔥', color: [COLORS.cardTrendingFrom, COLORS.cardTrendingTo] as const },
  { title: 'Acoustic', emoji: '🎸', color: [COLORS.cardAcousticFrom, COLORS.cardAcousticTo] as const },
  { title: 'Lofi Focus', emoji: '🎧', color: [COLORS.cardLofiFrom, COLORS.cardLofiTo] as const },
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

  const {
    rec,
    playlists,
    loading,
    refresh,
  } = useHomeData();

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
          style={[styles.header, { paddingTop: insets.top + 18 }]}
        >
          <Pressable 
            style={styles.headerTop} 
            onPress={() => navigation.navigate('Profile')}
            android_ripple={{ color: 'rgba(255,255,255,0.05)', borderless: true }}
          >
            <View style={styles.headerContent}>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
              {updatedLabel && (
                <Text style={styles.updatedLabel}>{updatedLabel}</Text>
              )}
            </View>
            <View style={styles.avatarCircle}>
              <Fontisto name="person" color={COLORS.white} size={22} />
            </View>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate('Search')}
            style={styles.searchBar}
            android_ripple={{ color: 'rgba(192,132,252,0.1)', borderless: false }}
          >
            <MaterialIcons name="search" color={COLORS.accent} size={20} />
            <Text style={styles.searchPlaceholder}>Tìm bài hát, nghệ sĩ...</Text>
          </Pressable>
        </LinearGradient>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Phát nhanh</Text>
          <View style={styles.grid}>
            {quickActions.map((item) => (
              <Pressable 
                key={item.title} 
                style={styles.quickCard}
                android_ripple={{ color: 'rgba(255,255,255,0.1)', borderless: false }}
              >
                <LinearGradient colors={item.color} style={styles.quickGradient}>
                  <Text style={styles.cardEmoji}>{item.emoji}</Text>
                  <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                </LinearGradient>
              </Pressable>
            ))}
          </View>
        </View>

        {loading && !rec.homeFeed && !rec.globalTrending.length && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={COLORS.accent} />
            <Text style={styles.loadingText}>Đang tải gợi ý nhạc...</Text>
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
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerContent: { flex: 1 },
  greeting: { color: COLORS.glass50, fontSize: 13, fontWeight: '500', letterSpacing: 0.3 },
  name: { color: COLORS.white, fontSize: 28, fontWeight: '800', marginTop: 2, lineHeight: 33 },
  updatedLabel: { color: COLORS.glass35, fontSize: 11, marginTop: 4, fontWeight: '500' },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.accentFill25,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    borderWidth: 1,
    borderColor: COLORS.accentBorder25,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.glass08,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.glass12,
  },
  searchPlaceholder: { color: COLORS.glass40, fontSize: 14, flex: 1, fontWeight: '500' },
  section: { paddingHorizontal: 20, marginTop: 28 },
  sectionTitle: { color: COLORS.white, fontSize: 20, fontWeight: '800', marginBottom: 16, letterSpacing: -0.4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quickCard: { width: '47.5%', borderRadius: 16, overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8 },
  quickGradient: { padding: 18, minHeight: 110, justifyContent: 'space-between' },
  cardEmoji: { fontSize: 28 },
  cardTitle: { color: COLORS.white, fontWeight: '700', fontSize: 14, lineHeight: 18 },
  genreHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
  },
  genreSectionTitle: { color: COLORS.white, fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  seeMoreText: { color: COLORS.accent, fontSize: 12, fontWeight: '600', paddingVertical: 6, paddingHorizontal: 10 },
  loadingWrap: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  loadingText: { color: COLORS.glass40, fontSize: 14, fontWeight: '500', marginTop: 4 },
  errorWrap: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.error,
    backgroundColor: COLORS.errorDim,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  errorText: { color: COLORS.error, fontSize: 13, fontWeight: '600', lineHeight: 18 },
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
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.glass12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  modalTitle: { color: COLORS.white, fontSize: 18, fontWeight: '800', marginBottom: 14, lineHeight: 24 },
  modalClose: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.glass10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  modalCloseIcon: { color: COLORS.glass60, fontSize: 18, fontWeight: '700' },
  modalItem: { color: COLORS.glass80, fontSize: 15, marginTop: 10, paddingVertical: 8, paddingHorizontal: 4 },
  modalItemAccent: { color: COLORS.accent, fontSize: 15, fontWeight: '700', marginTop: 10, paddingVertical: 8, paddingHorizontal: 4 },
  playlistInput: {
    color: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.glass15,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
    backgroundColor: COLORS.surfaceLow,
  },
  qrImage: { width: 240, height: 240, borderRadius: 12, alignSelf: 'center', marginTop: 16 },
});
