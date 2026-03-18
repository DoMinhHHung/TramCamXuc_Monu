import React, { useCallback, useState } from 'react';
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
import { SongActionSheet } from '../components/SongActionSheet';
import { addSongToPlaylist, createPlaylist, Song } from '../services/music';
import { FeedbackType, RecommendedSong } from '../services/recommendation';
import { getSongShareQr } from '../services/social';
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

  const playRec = useCallback((r: RecommendedSong, queue: RecommendedSong[]) => {
    playSong(toSong(r), queue.map(toSong));
  }, [playSong]);

  const openRecActionSheet = useCallback((r: RecommendedSong) => {
    setSelectedRecSong(r);
    setSelectedSong(toSong(r));
  }, []);

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
      <StatusBar style="light" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={(
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
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
            <Text style={styles.searchPlaceholder}>Tìm bài hát, nghệ sĩ...</Text>
          </Pressable>
        </LinearGradient>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Phát nhanh</Text>
          <View style={styles.grid}>
            {quickActions.map((item) => (
              <Pressable key={item.title} style={styles.quickCard}>
                <LinearGradient colors={item.color} style={styles.quickGradient}>
                  <Text style={styles.cardEmoji}>{item.emoji}</Text>
                  <Text style={styles.cardTitle}>{item.title}</Text>
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

        <RecommendationSection
          icon="🔥"
          title="Đang hot"
          songs={rec.globalTrending}
          activeSongId={currentSong?.id}
          loading={rec.loading && !rec.globalTrending.length}
          emptyText="Đang cập nhật..."
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
          icon="🆕"
          title="Mới phát hành"
          songs={(rec.homeFeed?.newReleases?.length ? rec.homeFeed.newReleases : rec.newReleases)}
          activeSongId={currentSong?.id}
          loading={rec.loading && !rec.newReleases.length}
          emptyText="Đang cập nhật..."
          onPress={(s) => playRec(s, rec.homeFeed?.newReleases?.length ? rec.homeFeed.newReleases : rec.newReleases)}
          onLongPress={openRecActionSheet}
          hideIfEmpty={false}
        />

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
          emptyText="Đang cập nhật..."
        />
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
  genreWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  loadingWrap: { alignItems: 'center', paddingVertical: 32 },
  loadingText: { color: COLORS.glass35, fontSize: 13, marginTop: 10 },
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
