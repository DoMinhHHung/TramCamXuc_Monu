import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '../../config/colors';
import { useAuth } from '../../context/AuthContext';
import { usePlayer } from '../../context/PlayerContext';
import {
  addSongToPlaylist,
  Album,
  createPlaylist,
  deletePlaylist,
  getMyAlbums,
  getMyPlaylists,
  getMySongs,
  Playlist,
  Song,
  updatePlaylist,
} from '../../services/music';
import {
  createFeedPost,
  getAlbumShareLink,
  getAlbumShareQr,
  getPlaylistShareLink,
  getPlaylistShareQr,
  getSongShareLink,
  getSongShareQr,
} from '../../services/social';
import { apiClient } from '../../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'playlists' | 'songs' | 'albums';

// ─── Transcode status → friendly label ───────────────────────────────────────
// Không dùng từ kỹ thuật "transcode" với user

const getSongStatusLabel = (song: Song): { label: string; color: string; pulse: boolean } => {
  if (song.status === 'DELETED') {
    return { label: 'Đã xoá', color: COLORS.error, pulse: false };
  }
  if (song.status === 'PRIVATE') {
    return { label: 'Riêng tư', color: COLORS.glass40, pulse: false };
  }
  switch (song.transcodeStatus as string) {
    case 'PENDING':
      return { label: 'Đang trong hàng chờ phát hành...', color: COLORS.warningMid, pulse: true };
    case 'PROCESSING':
      return { label: 'Đang chuẩn bị, sắp xong rồi ✨', color: COLORS.accent, pulse: true };
    case 'FAILED':
      return { label: 'Phát hành thất bại — thử đăng lại', color: COLORS.error, pulse: false };
    case 'COMPLETED':
      return { label: 'Đang phát hành', color: COLORS.success, pulse: false };
    default:
      return { label: '', color: COLORS.glass40, pulse: false };
  }
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const TabBar = ({
                  active,
                  onChange,
                  counts,
                }: {
  active: Tab;
  onChange: (t: Tab) => void;
  counts: Record<Tab, number>;
}) => {
  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'playlists', label: 'Playlist', icon: '📋' },
    { key: 'songs',     label: 'Bài hát',  icon: '🎵' },
    { key: 'albums',    label: 'Album',    icon: '💿' },
  ];

  return (
      <View style={tabStyles.bar}>
        {tabs.map(t => (
            <Pressable
                key={t.key}
                style={[tabStyles.tab, active === t.key && tabStyles.tabActive]}
                onPress={() => onChange(t.key)}
            >
              <Text style={tabStyles.icon}>{t.icon}</Text>
              <Text style={[tabStyles.label, active === t.key && tabStyles.labelActive]}>
                {t.label}
              </Text>
              {counts[t.key] > 0 && (
                  <View style={tabStyles.badge}>
                    <Text style={tabStyles.badgeText}>{counts[t.key]}</Text>
                  </View>
              )}
            </Pressable>
        ))}
      </View>
  );
};

const tabStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.glass08,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    gap: 5,
  },
  tabActive: {
    backgroundColor: COLORS.accentFill20,
    borderWidth: 1,
    borderColor: COLORS.accentBorder25,
  },
  icon: { fontSize: 13 },
  label: { color: COLORS.glass45, fontSize: 13, fontWeight: '600' },
  labelActive: { color: COLORS.accent },
  badge: {
    backgroundColor: COLORS.accentDim,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: COLORS.white, fontSize: 10, fontWeight: '700' },
});

// ─── Pulsing dot for in-progress status ──────────────────────────────────────

const PulsingDot = ({ color }: { color: string }) => {
  const anim = useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 0.3, duration: 700, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 1,   duration: 700, useNativeDriver: true }),
        ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
      <Animated.View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color, opacity: anim }} />
  );
};

// ─── Song row ─────────────────────────────────────────────────────────────────

const SongRow = ({
                   song,
                   isActive,
                   isPlaying,
                   onPlay,
                   onAddToPlaylist,
                   onShare,
                 }: {
  song: Song;
  isActive: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  onAddToPlaylist: () => void;
  onShare: () => void;
}) => {
  const { label, color, pulse } = getSongStatusLabel(song);
  const isReady = (song.transcodeStatus as string) === 'COMPLETED';

  return (
      <View style={[songRowStyles.row, isActive && songRowStyles.rowActive]}>
        {/* Thumbnail */}
        <Pressable onPress={isReady ? onPlay : undefined} style={songRowStyles.thumbWrap}>
          {song.thumbnailUrl ? (
              <Image source={{ uri: song.thumbnailUrl }} style={songRowStyles.thumb} />
          ) : (
              <View style={[songRowStyles.thumb, songRowStyles.thumbPlaceholder]}>
                <Text style={{ fontSize: 20 }}>🎵</Text>
              </View>
          )}
          {isActive && isReady && (
              <View style={songRowStyles.playingOverlay}>
                <Text style={{ fontSize: 14, color: COLORS.white }}>{isPlaying ? '⏸' : '▶'}</Text>
              </View>
          )}
        </Pressable>

        {/* Info */}
        <View style={songRowStyles.info}>
          <Text style={[songRowStyles.title, isActive && { color: COLORS.accent }]} numberOfLines={1}>
            {song.title}
          </Text>
          <View style={songRowStyles.statusRow}>
            {pulse && <PulsingDot color={color} />}
            {label ? (
                <Text style={[songRowStyles.status, { color }]} numberOfLines={1}>
                  {label}
                </Text>
            ) : (
                <Text style={songRowStyles.artist} numberOfLines={1}>
                  {song.primaryArtist?.stageName}
                </Text>
            )}
          </View>
        </View>

        {/* Actions */}
        <View style={songRowStyles.actions}>
          {isReady && (
              <>
                <Pressable onPress={onShare} hitSlop={8} style={songRowStyles.actionBtn}>
                  <Text style={songRowStyles.actionIcon}>↗</Text>
                </Pressable>
                <Pressable onPress={onAddToPlaylist} hitSlop={8} style={songRowStyles.actionBtn}>
                  <Text style={songRowStyles.actionIcon}>+</Text>
                </Pressable>
              </>
          )}
        </View>
      </View>
  );
};

const songRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glass06,
  },
  rowActive: { backgroundColor: COLORS.accentFill20 },
  thumbWrap: { position: 'relative' },
  thumb: { width: 48, height: 48, borderRadius: 10 },
  thumbPlaceholder: {
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  title: { color: COLORS.white, fontSize: 14, fontWeight: '600', marginBottom: 3 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  status: { fontSize: 12 },
  artist: { color: COLORS.glass45, fontSize: 12 },
  actions: { flexDirection: 'row', gap: 4 },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.glass08,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: { color: COLORS.glass60, fontSize: 14, fontWeight: '700' },
});

// ─── Album card ───────────────────────────────────────────────────────────────

const AlbumCard = ({
                     album,
                     onPress,
                     onPublish,
                     onUnpublish,
                     onDelete,
                     onShare,
                   }: {
  album: Album;
  onPress: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onDelete: () => void;
  onShare: () => void;
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const statusColor =
      album.status === 'PUBLIC'   ? COLORS.success :
          album.status === 'PRIVATE'  ? COLORS.warningMid :
              COLORS.glass40;
  const statusLabel =
      album.status === 'PUBLIC'   ? 'Công khai' :
          album.status === 'PRIVATE'  ? 'Riêng tư' :
              'Bản nháp';

  return (
      <View style={albumCardStyles.card}>
        <Pressable style={albumCardStyles.main} onPress={onPress}>
          <View style={albumCardStyles.cover}>
            {album.coverUrl ? (
                <Image source={{ uri: album.coverUrl }} style={albumCardStyles.coverImg} />
            ) : (
                <LinearGradient
                    colors={[COLORS.gradPurple, COLORS.gradIndigo]}
                    style={albumCardStyles.coverImg}
                >
                  <Text style={{ fontSize: 28 }}>💿</Text>
                </LinearGradient>
            )}
          </View>
          <View style={albumCardStyles.info}>
            <Text style={albumCardStyles.title} numberOfLines={1}>{album.title}</Text>
            <View style={albumCardStyles.metaRow}>
              <View style={[albumCardStyles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[albumCardStyles.status, { color: statusColor }]}>{statusLabel}</Text>
              <Text style={albumCardStyles.dot}>·</Text>
              <Text style={albumCardStyles.count}>{album.songs?.length ?? 0} bài</Text>
            </View>
          </View>
        </Pressable>

        <Pressable onPress={() => setMenuOpen(v => !v)} hitSlop={10} style={albumCardStyles.menuBtn}>
          <Text style={albumCardStyles.menuIcon}>•••</Text>
        </Pressable>

        {menuOpen && (
            <View style={albumCardStyles.menu}>
              <Pressable style={albumCardStyles.menuItem} onPress={() => { setMenuOpen(false); onPress(); }}>
                <Text style={albumCardStyles.menuItemText}>👁  Xem chi tiết</Text>
              </Pressable>
              {album.status !== 'PUBLIC' && (
                  <Pressable style={albumCardStyles.menuItem} onPress={() => { setMenuOpen(false); onPublish(); }}>
                    <Text style={albumCardStyles.menuItemText}>🚀  Phát hành</Text>
                  </Pressable>
              )}
              {album.status === 'PUBLIC' && (
                  <Pressable style={albumCardStyles.menuItem} onPress={() => { setMenuOpen(false); onUnpublish(); }}>
                    <Text style={albumCardStyles.menuItemText}>🔒  Đặt riêng tư</Text>
                  </Pressable>
              )}
              <Pressable style={albumCardStyles.menuItem} onPress={() => { setMenuOpen(false); onShare(); }}>
                <Text style={albumCardStyles.menuItemText}>↗  Chia sẻ</Text>
              </Pressable>
              <View style={albumCardStyles.menuDivider} />
              <Pressable style={albumCardStyles.menuItem} onPress={() => { setMenuOpen(false); onDelete(); }}>
                <Text style={[albumCardStyles.menuItemText, { color: COLORS.error }]}>🗑  Xoá album</Text>
              </Pressable>
            </View>
        )}
      </View>
  );
};

const albumCardStyles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.glass08,
    overflow: 'visible',
  },
  main: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  cover: { borderRadius: 10, overflow: 'hidden' },
  coverImg: { width: 56, height: 56, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  title: { color: COLORS.white, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  status: { fontSize: 12, fontWeight: '600' },
  dot: { color: COLORS.glass25 },
  count: { color: COLORS.glass45, fontSize: 12 },
  menuBtn: { position: 'absolute', top: 12, right: 12, padding: 4 },
  menuIcon: { color: COLORS.glass45, fontSize: 12, letterSpacing: 1 },
  menu: {
    marginHorizontal: 12,
    marginBottom: 10,
    backgroundColor: COLORS.surfaceLow,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.glass10,
    overflow: 'hidden',
  },
  menuItem: { paddingHorizontal: 14, paddingVertical: 11 },
  menuItemText: { color: COLORS.white, fontSize: 14 },
  menuDivider: { height: 1, backgroundColor: COLORS.glass08 },
});

// ─── Create Album Modal ───────────────────────────────────────────────────────

const CreateAlbumModal = ({
                            visible,
                            onClose,
                            onCreate,
                          }: {
  visible: boolean;
  onClose: () => void;
  onCreate: (title: string) => Promise<void>;
}) => {
  const [title, setTitle]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setLoading(true);
    try { await onCreate(title.trim()); setTitle(''); }
    finally { setLoading(false); }
  };

  return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={modalStyles.overlay}>
          <View style={modalStyles.card}>
            <Text style={modalStyles.title}>Tạo album mới</Text>
            <TextInput
                style={modalStyles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Tên album..."
                placeholderTextColor={COLORS.glass30}
                autoFocus
            />
            <View style={modalStyles.actions}>
              <Pressable style={modalStyles.cancelBtn} onPress={onClose}>
                <Text style={modalStyles.cancelText}>Huỷ</Text>
              </Pressable>
              <Pressable
                  style={[modalStyles.createBtn, !title.trim() && { opacity: 0.4 }]}
                  onPress={handleCreate}
                  disabled={!title.trim() || loading}
              >
                {loading
                    ? <ActivityIndicator size="small" color={COLORS.white} />
                    : <Text style={modalStyles.createText}>Tạo</Text>
                }
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
  );
};

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.glass10,
    padding: 20,
  },
  title: { color: COLORS.white, fontSize: 18, fontWeight: '700', marginBottom: 14 },
  input: {
    backgroundColor: COLORS.surfaceLow,
    borderWidth: 1,
    borderColor: COLORS.glass15,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: COLORS.white,
    fontSize: 15,
    marginBottom: 16,
  },
  actions: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: COLORS.glass08,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.glass12,
  },
  cancelText: { color: COLORS.glass60, fontWeight: '600' },
  createBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: COLORS.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createText: { color: COLORS.white, fontWeight: '700' },
});

// ─── Add Song to Playlist Modal ───────────────────────────────────────────────

const AddToPlaylistModal = ({
                              visible,
                              song,
                              playlists,
                              onClose,
                              onAdd,
                              onCreateAndAdd,
                            }: {
  visible: boolean;
  song: Song | null;
  playlists: Playlist[];
  onClose: () => void;
  onAdd: (playlistId: string) => Promise<void>;
  onCreateAndAdd: (name: string) => Promise<void>;
}) => {
  const [newName, setNewName] = useState('');
  return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <Pressable style={sheetStyles.overlay} onPress={onClose} />
        <View style={sheetStyles.sheet}>
          <View style={sheetStyles.handle} />
          <Text style={sheetStyles.title}>Thêm vào Playlist</Text>
          <Text style={sheetStyles.subtitle} numberOfLines={1}>{song?.title}</Text>
          <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
            {playlists.map(p => (
                <Pressable key={p.id} style={sheetStyles.item} onPress={() => onAdd(p.id)}>
                  <Text style={sheetStyles.itemIcon}>📋</Text>
                  <Text style={sheetStyles.itemText}>{p.name}</Text>
                  <Text style={sheetStyles.itemCount}>{p.totalSongs ?? 0} bài</Text>
                </Pressable>
            ))}
          </ScrollView>
          <View style={sheetStyles.newRow}>
            <TextInput
                style={sheetStyles.newInput}
                value={newName}
                onChangeText={setNewName}
                placeholder="Tạo playlist mới..."
                placeholderTextColor={COLORS.glass30}
            />
            <Pressable
                style={[sheetStyles.newBtn, !newName.trim() && { opacity: 0.4 }]}
                disabled={!newName.trim()}
                onPress={() => { onCreateAndAdd(newName.trim()); setNewName(''); }}
            >
              <Text style={sheetStyles.newBtnText}>+</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
  );
};

const sheetStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: COLORS.scrim },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 32,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.glass20,
    alignSelf: 'center',
    marginBottom: 14,
  },
  title: { color: COLORS.white, fontSize: 17, fontWeight: '700', marginBottom: 2 },
  subtitle: { color: COLORS.glass45, fontSize: 13, marginBottom: 12 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, gap: 10 },
  itemIcon: { fontSize: 18 },
  itemText: { flex: 1, color: COLORS.white, fontSize: 14, fontWeight: '500' },
  itemCount: { color: COLORS.glass40, fontSize: 12 },
  newRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  newInput: {
    flex: 1,
    backgroundColor: COLORS.surfaceLow,
    borderWidth: 1,
    borderColor: COLORS.glass15,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: COLORS.white,
    fontSize: 14,
  },
  newBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newBtnText: { color: COLORS.white, fontSize: 22, fontWeight: '300' },
});

// ─── QR Modal ─────────────────────────────────────────────────────────────────

const QrModal = ({
                   visible,
                   link,
                   image,
                   onClose,
                 }: {
  visible: boolean;
  link: string;
  image?: string;
  onClose: () => void;
}) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={qrStyles.overlay} onPress={onClose}>
        <View style={qrStyles.card}>
          <Text style={qrStyles.title}>QR Chia sẻ</Text>
          {image
              ? <Image source={{ uri: image }} style={qrStyles.image} />
              : <View style={qrStyles.placeholder}><Text style={qrStyles.placeholderText}>QR</Text></View>
          }
          <Text style={qrStyles.link} numberOfLines={2}>{link}</Text>
          <Pressable style={qrStyles.closeBtn} onPress={onClose}>
            <Text style={qrStyles.closeBtnText}>Đóng</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
);

const qrStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  card: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  title: { color: COLORS.white, fontSize: 17, fontWeight: '700' },
  image: { width: 220, height: 220, borderRadius: 12 },
  placeholder: {
    width: 220, height: 220, borderRadius: 12,
    backgroundColor: COLORS.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: { color: COLORS.glass40, fontSize: 24 },
  link: { color: COLORS.glass50, fontSize: 11, textAlign: 'center' },
  closeBtn: {
    backgroundColor: COLORS.accentDim,
    borderRadius: 999,
    paddingHorizontal: 28,
    paddingVertical: 10,
    marginTop: 4,
  },
  closeBtnText: { color: COLORS.white, fontWeight: '700' },
});

// ─── Album Detail Modal ───────────────────────────────────────────────────────

const AlbumDetailModal = ({
                            visible,
                            albumId,
                            onClose,
                            onRefreshParent,
                            mySongs,
                          }: {
  visible: boolean;
  albumId: string | null;
  onClose: () => void;
  onRefreshParent: () => void;
  mySongs: Song[];
}) => {
  const [album, setAlbum]     = useState<Album | null>(null);
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const { playSong, currentSong, isPlaying } = usePlayer();

  React.useEffect(() => {
    if (!albumId || !visible) return;
    void load();
  }, [albumId, visible]);

  const load = async () => {
    if (!albumId) return;
    setLoading(true);
    try {
      const res = await apiClient.get<{ result: Album }>(`/albums/my/${albumId}`);
      setAlbum((res.data as any).result ?? res.data);
    } catch {
      try {
        const res2 = await apiClient.get<{ result: Album }>(`/albums/${albumId}`);
        setAlbum((res2.data as any).result ?? res2.data);
      } catch {
        setAlbum(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddSong = async (songId: string) => {
    if (!albumId) return;
    try {
      await apiClient.post(`/albums/${albumId}/songs/${songId}`);
      await load();
      onRefreshParent();
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message ?? 'Không thể thêm bài hát.');
    }
  };

  const handleRemoveSong = async (songId: string) => {
    if (!albumId) return;
    try {
      await apiClient.delete(`/albums/${albumId}/songs/${songId}`);
      await load();
      onRefreshParent();
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message ?? 'Không thể xoá bài hát.');
    }
  };

  const availableSongs = mySongs.filter(s =>
      (s.transcodeStatus as string) === 'COMPLETED' &&
      s.status === 'PUBLIC' &&
      !album?.songs?.some(as => as.id === s.id)
  );

  const queue = (album?.songs ?? []) as Song[];

  return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <View style={albumDetailStyles.root}>
          <View style={albumDetailStyles.header}>
            <Pressable onPress={onClose} style={albumDetailStyles.closeBtn}>
              <Text style={albumDetailStyles.closeBtnText}>✕</Text>
            </Pressable>
            <Text style={albumDetailStyles.title} numberOfLines={1}>
              {album?.title ?? 'Album'}
            </Text>
            <Pressable onPress={() => setAddOpen(true)} style={albumDetailStyles.addBtn}>
              <Text style={albumDetailStyles.addBtnText}>+ Thêm bài</Text>
            </Pressable>
          </View>

          {loading ? (
              <View style={albumDetailStyles.center}>
                <ActivityIndicator color={COLORS.accent} />
              </View>
          ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Album meta */}
                <View style={albumDetailStyles.meta}>
                  <LinearGradient
                      colors={[COLORS.gradPurple, COLORS.gradIndigo]}
                      style={albumDetailStyles.coverArt}
                  >
                    <Text style={{ fontSize: 40 }}>💿</Text>
                  </LinearGradient>
                  <View style={albumDetailStyles.metaInfo}>
                    <Text style={albumDetailStyles.metaTitle}>{album?.title}</Text>
                    <View style={albumDetailStyles.metaBadge}>
                      <Text style={albumDetailStyles.metaStatus}>
                        {album?.status === 'PUBLIC' ? '🟢 Công khai' :
                            album?.status === 'PRIVATE' ? '🟡 Riêng tư' : '⚪ Bản nháp'}
                      </Text>
                    </View>
                    <Text style={albumDetailStyles.metaCount}>
                      {album?.songs?.length ?? 0} bài hát
                    </Text>
                  </View>
                </View>

                {/* Songs */}
                {(album?.songs?.length ?? 0) === 0 ? (
                    <View style={albumDetailStyles.empty}>
                      <Text style={albumDetailStyles.emptyText}>
                        Album chưa có bài hát. Bấm "+ Thêm bài" để bắt đầu.
                      </Text>
                    </View>
                ) : (
                    (album?.songs ?? []).map((song: Song) => (
                        <View key={song.id} style={albumDetailStyles.songRow}>
                          <Pressable
                              style={albumDetailStyles.songMain}
                              onPress={() => playSong(song, queue)}
                          >
                            {song.thumbnailUrl ? (
                                <Image source={{ uri: song.thumbnailUrl }} style={albumDetailStyles.songThumb} />
                            ) : (
                                <View style={[albumDetailStyles.songThumb, { backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' }]}>
                                  <Text>🎵</Text>
                                </View>
                            )}
                            <View style={{ flex: 1 }}>
                              <Text style={albumDetailStyles.songTitle} numberOfLines={1}>
                                {song.title}
                              </Text>
                              <Text style={albumDetailStyles.songArtist} numberOfLines={1}>
                                {song.primaryArtist?.stageName}
                              </Text>
                            </View>
                          </Pressable>
                          <Pressable
                              onPress={() => Alert.alert(
                                  'Xoá khỏi album?',
                                  `"${song.title}" sẽ bị xoá khỏi album này.`,
                                  [
                                    { text: 'Huỷ', style: 'cancel' },
                                    { text: 'Xoá', style: 'destructive', onPress: () => void handleRemoveSong(song.id) },
                                  ]
                              )}
                              hitSlop={10}
                              style={albumDetailStyles.removeBtn}
                          >
                            <Text style={albumDetailStyles.removeBtnText}>✕</Text>
                          </Pressable>
                        </View>
                    ))
                )}
              </ScrollView>
          )}

          {/* Add song picker */}
          <Modal visible={addOpen} transparent animationType="slide" onRequestClose={() => setAddOpen(false)}>
            <Pressable style={sheetStyles.overlay} onPress={() => setAddOpen(false)} />
            <View style={sheetStyles.sheet}>
              <View style={sheetStyles.handle} />
              <Text style={sheetStyles.title}>Thêm bài hát vào album</Text>
              <Text style={sheetStyles.subtitle}>Chỉ bài đã phát hành mới có thể thêm vào album</Text>
              {availableSongs.length === 0 ? (
                  <Text style={{ color: COLORS.glass40, padding: 16, textAlign: 'center' }}>
                    Không có bài hát nào khả dụng.
                  </Text>
              ) : (
                  <ScrollView style={{ maxHeight: 300 }}>
                    {availableSongs.map(s => (
                        <Pressable
                            key={s.id}
                            style={sheetStyles.item}
                            onPress={() => { setAddOpen(false); void handleAddSong(s.id); }}
                        >
                          <Text style={sheetStyles.itemIcon}>🎵</Text>
                          <Text style={sheetStyles.itemText} numberOfLines={1}>{s.title}</Text>
                        </Pressable>
                    ))}
                  </ScrollView>
              )}
            </View>
          </Modal>
        </View>
      </Modal>
  );
};

const albumDetailStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glass08,
    gap: 12,
  },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.glass08, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { color: COLORS.glass60, fontSize: 14 },
  title: { flex: 1, color: COLORS.white, fontSize: 17, fontWeight: '700' },
  addBtn: { backgroundColor: COLORS.accentDim, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  addBtnText: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  meta: { flexDirection: 'row', gap: 16, padding: 20, alignItems: 'center' },
  coverArt: { width: 80, height: 80, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  metaInfo: { flex: 1, gap: 4 },
  metaTitle: { color: COLORS.white, fontSize: 18, fontWeight: '800' },
  metaBadge: { alignSelf: 'flex-start' },
  metaStatus: { color: COLORS.glass60, fontSize: 13 },
  metaCount: { color: COLORS.glass40, fontSize: 12 },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { color: COLORS.glass40, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glass06,
  },
  songMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  songThumb: { width: 44, height: 44, borderRadius: 8 },
  songTitle: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  songArtist: { color: COLORS.glass45, fontSize: 12, marginTop: 2 },
  removeBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.glass08, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  removeBtnText: { color: COLORS.glass45, fontSize: 12 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const LibraryScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { authSession } = useAuth();
  const { playSong, currentSong, isPlaying } = usePlayer();

  const [activeTab, setActiveTab] = useState<Tab>('playlists');
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [songs, setSongs]         = useState<Song[]>([]);
  const [albums, setAlbums]       = useState<Album[]>([]);

  // Modals
  const [qrData, setQrData]         = useState<{ link: string; image?: string } | null>(null);
  const [addSongTo, setAddSongTo]   = useState<Song | null>(null);
  const [createAlbumOpen, setCreateAlbumOpen] = useState(false);
  const [detailAlbumId, setDetailAlbumId]     = useState<string | null>(null);
  const [editPlaylist, setEditPlaylist]        = useState<Playlist | null>(null);
  const [editPlaylistName, setEditPlaylistName] = useState('');

  // ── Load ──────────────────────────────────────────────────────────────────
  useFocusEffect(useCallback(() => {
    void load(false);
    const id = setInterval(() => void load(true), 10_000);
    return () => clearInterval(id);
  }, [authSession?.tokens.accessToken]));

  const load = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(false);
      const [plRes, soRes, alRes] = await Promise.allSettled([
        getMyPlaylists({ page: 1, size: 50 }),
        getMySongs({ page: 1, size: 50 }),
        getMyAlbums({ page: 1, size: 50 }),
      ]);
      setPlaylists(plRes.status === 'fulfilled' ? plRes.value.content ?? [] : []);
      setSongs(soRes.status === 'fulfilled' ? soRes.value.content ?? [] : []);
      setAlbums(alRes.status === 'fulfilled' ? alRes.value.content ?? [] : []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ── Share helper ──────────────────────────────────────────────────────────
  const handleShare = async (type: 'playlist' | 'song' | 'album', id: string, title: string, method: 'qr' | 'link') => {
    try {
      if (method === 'qr') {
        const qr = type === 'playlist' ? await getPlaylistShareQr(id) :
            type === 'song'     ? await getSongShareQr(id) :
                await getAlbumShareQr(id);
        setQrData({ link: qr.shareUrl, image: qr.qrCodeBase64 });
      } else {
        const res = type === 'playlist' ? await getPlaylistShareLink(id) :
            type === 'song'     ? await getSongShareLink(id) :
                await getAlbumShareLink(id);
        await Share.share({ message: `${title}\n${res.shareUrl}` });
      }
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message ?? 'Không thể chia sẻ.');
    }
  };

  // ── Playlist actions ──────────────────────────────────────────────────────
  const handleDeletePlaylist = (p: Playlist) => {
    Alert.alert('Xoá playlist?', `"${p.name}" sẽ bị xoá vĩnh viễn.`, [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Xoá', style: 'destructive', onPress: async () => {
          await deletePlaylist(p.id);
          await load(true);
        }},
    ]);
  };

  const handleSavePlaylistEdit = async () => {
    if (!editPlaylist || !editPlaylistName.trim()) return;
    try {
      await updatePlaylist(editPlaylist.id, {
        name: editPlaylistName.trim(),
        description: editPlaylist.description,
        visibility: editPlaylist.visibility,
      });
      setEditPlaylist(null);
      await load(true);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message ?? 'Không thể cập nhật.');
    }
  };

  // ── Album actions ─────────────────────────────────────────────────────────
  const handleCreateAlbum = async (title: string) => {
    try {
      await apiClient.post('/albums', { title });
      setCreateAlbumOpen(false);
      await load(true);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message ?? 'Không thể tạo album.');
    }
  };

  const handlePublishAlbum = async (albumId: string) => {
    try {
      await apiClient.post(`/albums/${albumId}/publish`);
      await load(true);
      Alert.alert('Đã phát hành!', 'Album của bạn hiện đã công khai.');
    } catch (e: any) {
      Alert.alert('Không thể phát hành', e?.message ?? 'Kiểm tra lại album có đủ bài hát chưa.');
    }
  };

  const handleUnpublishAlbum = async (albumId: string) => {
    try {
      await apiClient.post(`/albums/${albumId}/unpublish`);
      await load(true);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message ?? 'Không thể đặt riêng tư.');
    }
  };

  const handleDeleteAlbum = (a: Album) => {
    Alert.alert('Xoá album?', `"${a.title}" sẽ bị xoá vĩnh viễn.`, [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Xoá', style: 'destructive', onPress: async () => {
          try {
            await apiClient.delete(`/albums/${a.id}`);
            await load(true);
          } catch (e: any) {
            Alert.alert('Lỗi', e?.message);
          }
        }},
    ]);
  };

  // ── Add song to playlist ──────────────────────────────────────────────────
  const handleAddToPlaylist = async (playlistId: string) => {
    if (!addSongTo) return;
    try {
      await addSongToPlaylist(playlistId, addSongTo.id);
      setAddSongTo(null);
      Alert.alert('Đã thêm', `Bài hát đã được thêm vào playlist.`);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message);
    }
  };

  const handleCreateAndAddToPlaylist = async (name: string) => {
    if (!addSongTo) return;
    try {
      const pl = await createPlaylist({ name, visibility: 'PUBLIC' });
      await addSongToPlaylist(pl.id, addSongTo.id);
      setAddSongTo(null);
      await load(true);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message);
    }
  };

  // ── Render content by tab ─────────────────────────────────────────────────
  const renderPlaylists = () => (
      <>
        <Pressable
            style={styles.createBtn}
            onPress={() => setCreateAlbumOpen(false) || navigation.navigate('Create')}
        >
          <View style={styles.createBtnInner}>
            <Text style={styles.createBtnIcon}>+</Text>
            <Text style={styles.createBtnText}>Tạo playlist mới</Text>
          </View>
        </Pressable>

        {playlists.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyTitle}>Chưa có playlist nào</Text>
              <Text style={styles.emptySub}>Tạo playlist để sắp xếp bài hát yêu thích</Text>
            </View>
        ) : playlists.map(p => (
            <Pressable
                key={p.id}
                style={styles.listItem}
                onPress={() => navigation.navigate('PlaylistDetail', { slug: p.slug })}
            >
              <View style={styles.listItemThumb}>
                <Text style={{ fontSize: 22 }}>📋</Text>
              </View>
              <View style={styles.listItemInfo}>
                <Text style={styles.listItemTitle} numberOfLines={1}>{p.name}</Text>
                <Text style={styles.listItemSub}>{p.totalSongs ?? 0} bài hát</Text>
              </View>
              <View style={styles.listItemActions}>
                <Pressable
                    hitSlop={8}
                    onPress={() => { setEditPlaylist(p); setEditPlaylistName(p.name); }}
                    style={styles.iconBtn}
                >
                  <Text style={styles.iconBtnText}>✏</Text>
                </Pressable>
                <Pressable hitSlop={8} onPress={() => void handleShare('playlist', p.id, p.name, 'qr')} style={styles.iconBtn}>
                  <Text style={styles.iconBtnText}>↗</Text>
                </Pressable>
                <Pressable hitSlop={8} onPress={() => handleDeletePlaylist(p)} style={styles.iconBtn}>
                  <Text style={[styles.iconBtnText, { color: COLORS.error }]}>🗑</Text>
                </Pressable>
              </View>
            </Pressable>
        ))}
      </>
  );

  const renderSongs = () => (
      <>
        {songs.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🎵</Text>
              <Text style={styles.emptyTitle}>Chưa có bài hát nào</Text>
              <Text style={styles.emptySub}>Upload bài hát trong tab "Tạo"</Text>
            </View>
        ) : songs.map(s => (
            <SongRow
                key={s.id}
                song={s}
                isActive={currentSong?.id === s.id}
                isPlaying={currentSong?.id === s.id && isPlaying}
                onPlay={() => playSong(s, songs)}
                onAddToPlaylist={() => setAddSongTo(s)}
                onShare={() => void handleShare('song', s.id, s.title, 'qr')}
            />
        ))}
      </>
  );

  const renderAlbums = () => (
      <>
        <Pressable style={[styles.createBtn, { marginBottom: 12 }]} onPress={() => setCreateAlbumOpen(true)}>
          <View style={styles.createBtnInner}>
            <Text style={styles.createBtnIcon}>+</Text>
            <Text style={styles.createBtnText}>Tạo album mới</Text>
          </View>
        </Pressable>

        {albums.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>💿</Text>
              <Text style={styles.emptyTitle}>Chưa có album nào</Text>
              <Text style={styles.emptySub}>Tổ chức bài hát thành album để phát hành</Text>
            </View>
        ) : albums.map(a => (
            <AlbumCard
                key={a.id}
                album={a}
                onPress={() => setDetailAlbumId(a.id)}
                onPublish={() => void handlePublishAlbum(a.id)}
                onUnpublish={() => void handleUnpublishAlbum(a.id)}
                onDelete={() => handleDeleteAlbum(a)}
                onShare={() => void handleShare('album', a.id, a.title, 'qr')}
            />
        ))}
      </>
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => { setRefreshing(true); void load(true); }}
                  tintColor={COLORS.accent}
              />
            }
            contentContainerStyle={{ paddingBottom: 120 }}
        >
          {/* Header */}
          <LinearGradient
              colors={[COLORS.gradSlate, COLORS.bg]}
              style={[styles.header, { paddingTop: insets.top + 18 }]}
          >
            <Text style={styles.headerTitle}>Thư viện</Text>
            <Text style={styles.headerSub}>
              {playlists.length} playlist · {songs.length} bài · {albums.length} album
            </Text>
          </LinearGradient>

          {/* Tab bar */}
          <TabBar
              active={activeTab}
              onChange={setActiveTab}
              counts={{ playlists: playlists.length, songs: songs.length, albums: albums.length }}
          />

          {/* Content */}
          {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={COLORS.accent} />
              </View>
          ) : (
              activeTab === 'playlists' ? renderPlaylists() :
                  activeTab === 'songs'     ? renderSongs() :
                      renderAlbums()
          )}
        </ScrollView>

        {/* Edit playlist modal */}
        <Modal
            visible={!!editPlaylist}
            transparent
            animationType="fade"
            onRequestClose={() => setEditPlaylist(null)}
        >
          <View style={modalStyles.overlay}>
            <View style={modalStyles.card}>
              <Text style={modalStyles.title}>Sửa tên playlist</Text>
              <TextInput
                  style={modalStyles.input}
                  value={editPlaylistName}
                  onChangeText={setEditPlaylistName}
                  autoFocus
              />
              <View style={modalStyles.actions}>
                <Pressable style={modalStyles.cancelBtn} onPress={() => setEditPlaylist(null)}>
                  <Text style={modalStyles.cancelText}>Huỷ</Text>
                </Pressable>
                <Pressable style={modalStyles.createBtn} onPress={handleSavePlaylistEdit}>
                  <Text style={modalStyles.createText}>Lưu</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Create album modal */}
        <CreateAlbumModal
            visible={createAlbumOpen}
            onClose={() => setCreateAlbumOpen(false)}
            onCreate={handleCreateAlbum}
        />

        {/* Album detail modal */}
        <AlbumDetailModal
            visible={!!detailAlbumId}
            albumId={detailAlbumId}
            onClose={() => setDetailAlbumId(null)}
            onRefreshParent={() => void load(true)}
            mySongs={songs}
        />

        {/* Add to playlist */}
        <AddToPlaylistModal
            visible={!!addSongTo}
            song={addSongTo}
            playlists={playlists}
            onClose={() => setAddSongTo(null)}
            onAdd={handleAddToPlaylist}
            onCreateAndAdd={handleCreateAndAddToPlaylist}
        />

        {/* QR */}
        {qrData && (
            <QrModal
                visible
                link={qrData.link}
                image={qrData.image}
                onClose={() => setQrData(null)}
            />
        )}
      </View>
  );
};

// ─── Main styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerTitle: { color: COLORS.white, fontSize: 28, fontWeight: '800' },
  headerSub: { color: COLORS.glass40, fontSize: 13, marginTop: 4 },

  loadingWrap: { paddingVertical: 48, alignItems: 'center' },

  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { color: COLORS.white, fontSize: 17, fontWeight: '700', marginBottom: 6 },
  emptySub: { color: COLORS.glass40, fontSize: 13, textAlign: 'center' },

  createBtn: {
    marginHorizontal: 20,
    marginBottom: 6,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.accentBorder25,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  createBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
    backgroundColor: COLORS.accentFill20,
  },
  createBtnIcon: { color: COLORS.accent, fontSize: 20, fontWeight: '300' },
  createBtnText: { color: COLORS.accent, fontSize: 14, fontWeight: '600' },

  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glass06,
  },
  listItemThumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItemInfo: { flex: 1 },
  listItemTitle: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
  listItemSub: { color: COLORS.glass45, fontSize: 12, marginTop: 2 },
  listItemActions: { flexDirection: 'row', gap: 4 },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.glass08,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnText: { color: COLORS.glass60, fontSize: 13 },
});