import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import {Fontisto, AntDesign, FontAwesome} from '@expo/vector-icons';

import { COLORS, useThemeColors } from '../../config/colors';
import { useAuth } from '../../context/AuthContext';
import { usePlayer } from '../../context/PlayerContext';
import { useTranslation } from '../../context/LocalizationContext';
import {
  addSongToPlaylist,
  Album,
  albumTracksAsPlayableSongs,
  cancelAlbumSchedule,
  commitAlbumSchedule,
  createPlaylist,
  deletePlaylist,
  getMyAlbumById,
  getMyAlbums,
  getMyPlaylists,
  getMySongs,
  isAlbumPendingScheduledRelease,
  localDateAndTimeToPublishAtIso,
  Playlist,
  publishAlbum,
  Song,
  updateAlbum,
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
import { AnimatedDecorIcon } from '../../components/AnimatedDecorIcon';
import { Toast, useToast } from '../../components/Toast';
import { getMySubscription } from '../../services/payment';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'playlists' | 'songs' | 'albums';
let tr = (key: string, fallback?: string) => fallback ?? key;
let rc = COLORS;

type ArtistProfile = {
  id: string;
  stageName?: string;
  status?: 'ACTIVE' | 'PENDING' | 'BANNED' | 'REJECTED';
};

const getSongStatusLabel = (song: Song): { label: string; color: string; pulse: boolean } => {
  if (song.status === 'DELETED') {
    return { label: tr('screens.library.songDeleted', 'Deleted'), color: COLORS.error, pulse: false };
  }
  if (song.status === 'PRIVATE') {
    return { label: tr('screens.library.private', 'Private'), color: COLORS.glass40, pulse: false };
  }
  if (song.status === 'ALBUM_ONLY') {
    return { label: tr('screens.songVisibility.albumOnly', 'Album only'), color: COLORS.warningMid, pulse: false };
  }
  switch (song.transcodeStatus as string) {
    case 'PENDING':
      return { label: tr('screens.library.releasePending', 'Pending release...'), color: COLORS.warningMid, pulse: true };
    case 'PROCESSING':
      return { label: tr('screens.library.processing', 'Preparing, almost done ✨'), color: COLORS.accent, pulse: true };
    case 'FAILED':
      return { label: tr('screens.library.releaseFailed', 'Release failed — try re-uploading'), color: COLORS.error, pulse: false };
    case 'COMPLETED':
      return { label: tr('screens.library.published', 'Published'), color: COLORS.success, pulse: false };
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
  const tabs: { key: Tab; label: string; icon: string| React.ReactNode }[] = [
    { key: 'playlists', label: tr('screens.library.tabPlaylists', 'Playlists'), icon: <Fontisto name="play-list" color={rc.accent} size={14} /> },
    { key: 'songs',     label: tr('screens.library.tabSongs', 'Songs'),  icon: '🎵' },
    { key: 'albums',    label: tr('screens.library.tabAlbums', 'Albums'),    icon: '💿' },
  ];

  return (
      <View style={tabStyles.bar}>
        {tabs.map(t => (
            <Pressable
                key={t.key}
                style={[tabStyles.tab, active === t.key && tabStyles.tabActive]}
                onPress={() => onChange(t.key)}
            >
              <AnimatedDecorIcon active={active === t.key} intensity="medium">
                <Text style={tabStyles.icon}>{t.icon}</Text>
              </AnimatedDecorIcon>
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
                   onEdit,
                 }: {
  song: Song;
  isActive: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  onAddToPlaylist: () => void;
  onShare: () => void;
  onEdit?: () => void;
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
          {onEdit && (
              <Pressable onPress={onEdit} hitSlop={8} style={songRowStyles.actionBtn}>
                <Text style={songRowStyles.actionIcon}>
                  <FontAwesome name="edit" color={COLORS.glass60} size={14} />
                </Text>
              </Pressable>
          )}
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
    backgroundColor: COLORS.scrim,
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
                     onScheduleRelease,
                     onCancelSchedule,
                     onUnpublish,
                     onDelete,
                     onShare,
                   }: {
  album: Album;
  onPress: () => void;
  onPublish: () => void;
  onScheduleRelease: () => void;
  onCancelSchedule: () => void;
  onUnpublish: () => void;
  onDelete: () => void;
  onShare: () => void;
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const pendingRelease = isAlbumPendingScheduledRelease(album);
  const statusColor =
      album.status === 'PUBLIC'   ? COLORS.success :
          pendingRelease ? COLORS.accent :
          album.status === 'PRIVATE'  ? COLORS.warningMid :
              COLORS.glass40;
  const statusLabel =
      album.status === 'PUBLIC'   ? tr('screens.library.public', 'Public') :
        pendingRelease ? tr('screens.library.pendingReleaseScheduled', 'Pending release') :
        album.status === 'PRIVATE'  ? tr('screens.library.private', 'Private') :
          tr('screens.library.draft', 'Draft');

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
              <Text style={albumCardStyles.count}>{album.totalSongs ?? album.songs?.length ?? 0} {tr('screens.library.songsSuffix', 'songs')}</Text>
            </View>
          </View>
        </Pressable>

        <Pressable onPress={() => setMenuOpen(v => !v)} hitSlop={10} style={albumCardStyles.menuBtn}>
          <Text style={albumCardStyles.menuIcon}>•••</Text>
        </Pressable>

        {menuOpen && (
            <View style={albumCardStyles.menu}>
              <Pressable style={albumCardStyles.menuItem} onPress={() => { setMenuOpen(false); onPress(); }}>
                <Text style={albumCardStyles.menuItemText}>👁  {tr('screens.library.viewDetails', 'View details')}</Text>
              </Pressable>
              {album.status !== 'PUBLIC' && !pendingRelease && (
                  <>
                    <Pressable style={albumCardStyles.menuItem} onPress={() => { setMenuOpen(false); onPublish(); }}>
                      <Text style={albumCardStyles.menuItemText}>🚀  {tr('screens.library.publish', 'Publish')}</Text>
                    </Pressable>
                    <Pressable style={albumCardStyles.menuItem} onPress={() => { setMenuOpen(false); onScheduleRelease(); }}>
                      <Text style={albumCardStyles.menuItemText}>📅  {tr('screens.library.scheduleRelease', 'Schedule release')}</Text>
                    </Pressable>
                  </>
              )}
              {pendingRelease && (
                  <>
                    <Pressable style={albumCardStyles.menuItem} onPress={() => { setMenuOpen(false); onScheduleRelease(); }}>
                      <Text style={albumCardStyles.menuItemText}>✏️  {tr('screens.library.changeReleaseTime', 'Change release time')}</Text>
                    </Pressable>
                    <Pressable style={albumCardStyles.menuItem} onPress={() => { setMenuOpen(false); onCancelSchedule(); }}>
                      <Text style={albumCardStyles.menuItemText}>🛑  {tr('screens.library.cancelSchedule', 'Cancel schedule')}</Text>
                    </Pressable>
                  </>
              )}
              {album.status === 'PUBLIC' && (
                  <Pressable style={albumCardStyles.menuItem} onPress={() => { setMenuOpen(false); onUnpublish(); }}>
                    <Text style={albumCardStyles.menuItemText}>🔒  {tr('screens.library.setPrivate', 'Set private')}</Text>
                  </Pressable>
              )}
              <Pressable style={albumCardStyles.menuItem} onPress={() => { setMenuOpen(false); onShare(); }}>
                <Text style={albumCardStyles.menuItemText}>↗  {tr('common.share', 'Share')}</Text>
              </Pressable>
              <View style={albumCardStyles.menuDivider} />
              <Pressable style={albumCardStyles.menuItem} onPress={() => { setMenuOpen(false); onDelete(); }}>
                <Text style={[albumCardStyles.menuItemText, { color: COLORS.error }]}><AntDesign name="delete" color={COLORS.error} size={15} />  {tr('screens.library.deleteAlbum', 'Delete album')}</Text>
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
            <Text style={modalStyles.title}>{tr('screens.library.createNewAlbum', 'Create new album')}</Text>
            <TextInput
                style={modalStyles.input}
                value={title}
                onChangeText={setTitle}
                placeholder={tr('screens.library.albumNamePlaceholder', 'Album name...')}
                placeholderTextColor={COLORS.glass30}
                autoFocus
            />
            <View style={modalStyles.actions}>
              <Pressable style={modalStyles.cancelBtn} onPress={onClose}>
                <Text style={modalStyles.cancelText}>{tr('common.cancel', 'Cancel')}</Text>
              </Pressable>
              <Pressable
                  style={[modalStyles.createBtn, !title.trim() && { opacity: 0.4 }]}
                  onPress={handleCreate}
                  disabled={!title.trim() || loading}
              >
                {loading
                    ? <ActivityIndicator size="small" color={COLORS.white} />
                    : <Text style={modalStyles.createText}>{tr('common.create', 'Create')}</Text>
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
  subTitle: { color: COLORS.glass45, fontSize: 12, marginBottom: 10 },
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
  modeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.glass08,
    borderWidth: 1,
    borderColor: COLORS.glass12,
    alignItems: 'center',
  },
  modeChipActive: {
    backgroundColor: COLORS.accentFill20,
    borderColor: COLORS.accentBorder25,
  },
  modeChipText: { color: COLORS.glass50, fontSize: 13, fontWeight: '600' },
  modeChipTextActive: { color: COLORS.accent },
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
          <Text style={sheetStyles.title}>{tr('actions.addToPlaylist', 'Add to playlist')}</Text>
          <Text style={sheetStyles.subtitle} numberOfLines={1}>{song?.title}</Text>
          <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
            {playlists.map(p => (
                <Pressable key={p.id} style={sheetStyles.item} onPress={() => onAdd(p.id)}>
                  <Text style={sheetStyles.itemIcon}><Fontisto name="play-list" color={rc.accent} size={14} /></Text>
                  <Text style={sheetStyles.itemText}>{p.name}</Text>
                  <Text style={sheetStyles.itemCount}>{p.totalSongs ?? 0} {tr('screens.library.songsSuffix', 'songs')}</Text>
                </Pressable>
            ))}
          </ScrollView>
          <View style={sheetStyles.newRow}>
            <TextInput
                style={sheetStyles.newInput}
                value={newName}
                onChangeText={setNewName}
                placeholder={tr('screens.library.createPlaylistPlaceholder', 'Create new playlist...')}
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
          <Text style={qrStyles.title}>{tr('actions.shareQR', 'Share via QR')}</Text>
          {image
              ? <Image source={{ uri: image }} style={qrStyles.image} />
              : <View style={qrStyles.placeholder}><Text style={qrStyles.placeholderText}>QR</Text></View>
          }
          <Text style={qrStyles.link} numberOfLines={2}>{link}</Text>
          <Pressable style={qrStyles.closeBtn} onPress={onClose}>
            <Text style={qrStyles.closeBtnText}>{tr('controls.close', 'Close')}</Text>
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

// ─── Share Options Bottom Sheet ───────────────────────────────────────────────

type ShareItemType = 'playlist' | 'song' | 'album';

interface ShareOptionsSheetProps {
  visible: boolean;
  item: { type: ShareItemType; id: string; title: string } | null;
  onClose: () => void;
  onExternal: () => void;
  onDiscovery: () => void;
}

const ShareOptionsSheet = ({ visible, item, onClose, onExternal, onDiscovery }: ShareOptionsSheetProps) => (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={sheetStyles.overlay} onPress={onClose} />
      <View style={sheetStyles.sheet}>
        <View style={sheetStyles.handle} />
        <Text style={sheetStyles.title}>{tr('common.share', 'Share')}</Text>
        <Text style={sheetStyles.subtitle} numberOfLines={1}>{item?.title}</Text>

        <Pressable style={shareOptionStyles.option} onPress={() => { onClose(); onDiscovery(); }}>
          <View style={[shareOptionStyles.iconWrap, { backgroundColor: rc.gradIndigo }]}>
            <Text style={{ fontSize: 20 }}>🌟</Text>
          </View>
          <View style={shareOptionStyles.info}>
            <Text style={shareOptionStyles.label}>{tr('screens.library.shareToDiscovery', 'Share to Discovery')}</Text>
            <Text style={shareOptionStyles.desc}>{tr('screens.library.shareToDiscoveryDesc', 'Post to the community feed')}</Text>
          </View>
        </Pressable>

        <Pressable style={shareOptionStyles.option} onPress={() => { onClose(); onExternal(); }}>
          <View style={[shareOptionStyles.iconWrap, { backgroundColor: rc.accentAlt }]}>
            <Text style={{ fontSize: 20 }}>↗</Text>
          </View>
          <View style={shareOptionStyles.info}>
            <Text style={shareOptionStyles.label}>{tr('screens.library.shareOutsideApp', 'Share outside app')}</Text>
            <Text style={shareOptionStyles.desc}>{tr('screens.library.shareOutsideAppDesc', 'Send link via message or social networks...')}</Text>
          </View>
        </Pressable>

        <Pressable style={shareOptionStyles.cancelBtn} onPress={onClose}>
          <Text style={shareOptionStyles.cancelText}>{tr('common.cancel', 'Cancel')}</Text>
        </Pressable>
      </View>
    </Modal>
);

const shareOptionStyles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    gap: 14,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  label: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
  desc: { color: COLORS.glass45, fontSize: 12, marginTop: 2 },
  cancelBtn: {
    marginTop: 8,
    paddingVertical: 13,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.glass08,
  },
  cancelText: { color: COLORS.glass60, fontSize: 15 },
});

// ─── Share to Discovery Modal ─────────────────────────────────────────────────

interface ShareToDiscoveryModalProps {
  visible: boolean;
  item: { type: ShareItemType; id: string; title: string } | null;
  onClose: () => void;
  onPost: (title: string, caption: string, visibility: 'PUBLIC' | 'FOLLOWERS_ONLY' | 'PRIVATE') => Promise<void>;
}

const DISCOVERY_VISIBILITY_OPTIONS: { value: 'PUBLIC' | 'FOLLOWERS_ONLY' | 'PRIVATE'; label: string }[] = [
  { value: 'PUBLIC',    label: '🌐 Công khai' },
  { value: 'FOLLOWERS_ONLY', label: '👥 Người theo dõi' },
  { value: 'PRIVATE',   label: '🔒 Riêng tư' },
];

const ShareToDiscoveryModal = ({ visible, item, onClose, onPost }: ShareToDiscoveryModalProps) => {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'FOLLOWERS_ONLY' | 'PRIVATE'>('PUBLIC');
  const [posting, setPosting] = useState(false);

  React.useEffect(() => {
    if (item && visible) {
      const typeLabel = item.type === 'playlist' ? 'Playlist' : item.type === 'album' ? 'Album' : 'Bài hát';
      setTitle(`Chia sẻ ${typeLabel}: ${item.title}`);
      setCaption('');
      setVisibility('PUBLIC');
    }
  }, [item, visible]);

  const handlePost = async () => {
    if (!title.trim()) return;
    setPosting(true);
    try {
      await onPost(title.trim(), caption.trim(), visibility);
      setTitle('');
      setCaption('');
    } finally {
      setPosting(false);
    }
  };

  const contentType = item?.type === 'playlist' ? 'PLAYLIST' : item?.type === 'album' ? 'ALBUM' : 'SONG';

  return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[discoveryShareStyles.root, { paddingTop: insets.top + 4 }]}>
            <View style={discoveryShareStyles.header}>
              <Pressable onPress={onClose} style={discoveryShareStyles.cancelBtn}>
                <Text style={discoveryShareStyles.cancelText}>Huỷ</Text>
              </Pressable>
              <Text style={discoveryShareStyles.headerTitle}>Chia sẻ lên Discovery</Text>
              <Pressable
                  style={[discoveryShareStyles.postBtn, (!title.trim() || posting) && discoveryShareStyles.postBtnDisabled]}
                  onPress={handlePost}
                  disabled={!title.trim() || posting}
              >
                {posting
                    ? <ActivityIndicator size="small" color={COLORS.white} />
                    : <Text style={discoveryShareStyles.postBtnText}>Đăng</Text>
                }
              </Pressable>
            </View>
            <View style={discoveryShareStyles.divider} />

            <ScrollView style={discoveryShareStyles.body} keyboardShouldPersistTaps="handled">
              <View style={discoveryShareStyles.contentBadge}>
                <Text style={discoveryShareStyles.contentBadgeText}>
                  {contentType === 'PLAYLIST' ? '📋 Playlist' : contentType === 'ALBUM' ? '💿 Album' : '🎵 Bài hát'}
                  {' · '}
                  <Text style={discoveryShareStyles.contentBadgeName}>{item?.title}</Text>
                </Text>
              </View>

              <TextInput
                  style={discoveryShareStyles.titleInput}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Tiêu đề bài viết..."
                  placeholderTextColor={COLORS.glass25}
                  multiline
                  autoFocus
              />
              <TextInput
                  style={discoveryShareStyles.captionInput}
                  value={caption}
                  onChangeText={setCaption}
                  placeholder="Mô tả thêm cho mọi người..."
                  placeholderTextColor={COLORS.glass20}
                  multiline
              />

              <View style={discoveryShareStyles.visibilityRow}>
                <Text style={discoveryShareStyles.visibilityLabel}>Hiển thị:</Text>
                {DISCOVERY_VISIBILITY_OPTIONS.map(opt => (
                    <Pressable
                        key={opt.value}
                        style={[discoveryShareStyles.visChip, visibility === opt.value && discoveryShareStyles.visChipActive]}
                        onPress={() => setVisibility(opt.value)}
                    >
                      <Text style={[discoveryShareStyles.visChipText, visibility === opt.value && discoveryShareStyles.visChipTextActive]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
  );
};

const discoveryShareStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cancelBtn: { minWidth: 48 },
  cancelText: { color: COLORS.glass60, fontSize: 15 },
  headerTitle: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  postBtn: {
    backgroundColor: COLORS.accentDim,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 8,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postBtnDisabled: { opacity: 0.35 },
  postBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  divider: { height: 1, backgroundColor: COLORS.glass08 },
  body: { flex: 1, paddingHorizontal: 16 },
  contentBadge: {
    marginTop: 16,
    marginBottom: 12,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.glass12,
  },
  contentBadgeText: { color: COLORS.glass60, fontSize: 13 },
  contentBadgeName: { color: COLORS.white, fontWeight: '600' },
  titleInput: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 26,
    minHeight: 56,
    textAlignVertical: 'top',
  },
  captionInput: {
    color: COLORS.glass70,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 100,
    textAlignVertical: 'top',
    marginTop: 4,
  },
  visibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.glass08,
    marginTop: 12,
  },
  visibilityLabel: { color: COLORS.glass50, fontSize: 13, fontWeight: '600', marginRight: 4 },
  visChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: COLORS.glass08,
    borderWidth: 1,
    borderColor: COLORS.glass12,
  },
  visChipActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accentFill20 },
  visChipText: { color: COLORS.glass60, fontSize: 12, fontWeight: '600' },
  visChipTextActive: { color: COLORS.accent },
});

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
      const data = await getMyAlbumById(albumId);
      setAlbum(data);
    } catch {
      setAlbum(null);
    } finally {
      setLoading(false);
    }
  };

  const pendingSchedule = album ? isAlbumPendingScheduledRelease(album) : false;

  const handleAddSong = async (songId: string) => {
    if (!albumId || pendingSchedule) return;
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
      (s.status === 'PUBLIC' || s.status === 'PRIVATE' || s.status === 'ALBUM_ONLY') &&
      !album?.songs?.some((as: any) => as.id === s.id || as.songId === s.id)
  );

  const queue = albumTracksAsPlayableSongs(album);

  const getAlbumSongId = (song: any): string | undefined => song?.id ?? song?.songId;
  const getAlbumSongTitle = (song: any): string => song?.title ?? 'Bài hát';
  const getAlbumSongArtist = (song: any): string => song?.primaryArtist?.stageName ?? song?.artistStageName ?? 'Nghệ sĩ';
  const getAlbumSongThumb = (song: any): string | undefined => song?.thumbnailUrl;

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
            {!pendingSchedule ? (
              <Pressable onPress={() => setAddOpen(true)} style={albumDetailStyles.addBtn}>
                <Text style={albumDetailStyles.addBtnText}>+ Thêm bài</Text>
              </Pressable>
            ) : (
              <View style={{ maxWidth: 120 }} />
            )}
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
                            pendingSchedule ? '⏳ Chờ phát hành' :
                            album?.status === 'PRIVATE' ? '🟡 Riêng tư' : '⚪ Bản nháp'}
                      </Text>
                    </View>
                    {pendingSchedule && album?.scheduledPublishAt ? (
                      <Text style={albumDetailStyles.metaCount}>
                        {new Date(album.scheduledPublishAt).toLocaleString()}
                      </Text>
                    ) : null}
                    {album?.credits ? (
                      <Text style={[albumDetailStyles.metaCount, { marginTop: 4 }]} numberOfLines={3}>
                        {album.credits}
                      </Text>
                    ) : null}
                    <Text style={albumDetailStyles.metaCount}>
                      {album?.songs?.length ?? 0} bài hát
                    </Text>
                    {pendingSchedule ? (
                      <Text style={[albumDetailStyles.metaCount, { color: COLORS.warningMid, marginTop: 6 }]}>
                        Không thể thêm bài khi đang chờ phát hành.
                      </Text>
                    ) : null}
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
                    (album?.songs ?? []).map((song: any, idx: number) => {
                        const songId = getAlbumSongId(song);
                        const songTitle = getAlbumSongTitle(song);
                        const artistName = getAlbumSongArtist(song);
                        const thumbUrl = getAlbumSongThumb(song);
                        return (
                        <View key={songId ?? `${idx}`} style={albumDetailStyles.songRow}>
                          <Pressable
                              style={albumDetailStyles.songMain}
                              onPress={() => {
                                const sid = getAlbumSongId(song);
                                if (!sid) return;
                                const playable = queue.find((q) => q.id === sid);
                                if (playable && playable.transcodeStatus === 'COMPLETED') {
                                  playSong(playable, queue);
                                }
                              }}
                          >
                            {thumbUrl ? (
                                <Image source={{ uri: thumbUrl }} style={albumDetailStyles.songThumb} />
                            ) : (
                                <View style={[albumDetailStyles.songThumb, { backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' }]}>
                                  <Text>🎵</Text>
                                </View>
                            )}
                            <View style={{ flex: 1 }}>
                              <Text style={albumDetailStyles.songTitle} numberOfLines={1}>
                                {songTitle}
                              </Text>
                              <Text style={albumDetailStyles.songArtist} numberOfLines={1}>
                                {artistName}
                              </Text>
                            </View>
                          </Pressable>
                          <Pressable
                              onPress={() => Alert.alert(
                                  'Xoá khỏi album?',
                                  `"${songTitle}" sẽ bị xoá khỏi album này.`,
                                  [
                                    { text: 'Huỷ', style: 'cancel' },
                                    { text: 'Xoá', style: 'destructive', onPress: () => { if (songId) void handleRemoveSong(songId); } },
                                  ]
                              )}
                              hitSlop={10}
                              style={albumDetailStyles.removeBtn}
                          >
                            <Text style={albumDetailStyles.removeBtnText}>✕</Text>
                          </Pressable>
                        </View>
                    );
                    })
                )}
              </ScrollView>
          )}

          <Modal visible={addOpen} transparent animationType="slide" onRequestClose={() => setAddOpen(false)}>
            <Pressable style={sheetStyles.overlay} onPress={() => setAddOpen(false)} />
            <View style={sheetStyles.sheet}>
              <View style={sheetStyles.handle} />
              <Text style={sheetStyles.title}>Thêm bài hát vào album</Text>
              <Text style={sheetStyles.subtitle}>Bài hát của bạn (PUBLIC/PRIVATE/ALBUM_ONLY, đã transcode xong)</Text>
              {availableSongs.length === 0 ? (
                  <Text style={{ color: COLORS.glass40, padding: 16, textAlign: 'center' }}>
                    Không có bài hát nào khả dụng.{'\n'}
                    Bài hát cần hoàn thành transcode (COMPLETED).
                  </Text>
              ) : (
                  <ScrollView style={{ maxHeight: 300 }}>
                    {availableSongs.map((s, idx) => (
                        <Pressable
                            key={s.id ?? `${idx}`}
                            style={sheetStyles.item}
                            onPress={() => { setAddOpen(false); void handleAddSong(s.id); }}
                        >
                          <Text style={sheetStyles.itemIcon}>🎵</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={sheetStyles.itemText} numberOfLines={1}>{s.title}</Text>
                            <Text style={{ color: COLORS.glass40, fontSize: 11 }}>
                              {s.status === 'PUBLIC' ? '🌐 Công khai' : s.status === 'PRIVATE' ? '🔒 Riêng tư' : '💿 Album only'}
                            </Text>
                          </View>
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
  const { t } = useTranslation();
  const themeColors = useThemeColors();
  tr = t;
  rc = themeColors;
  const { playSong, currentSong, isPlaying } = usePlayer();
  const { toast, show: showToast, hide: hideToast } = useToast();

  const [activeTab, setActiveTab] = useState<Tab>('playlists');
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [songs, setSongs]         = useState<Song[]>([]);
  const [albums, setAlbums]       = useState<Album[]>([]);
  const [artistProfile, setArtistProfile] = useState<ArtistProfile | null>(null);
  const [hasActiveSub, setHasActiveSub] = useState(false);
  const [canCreateAlbumByPlan, setCanCreateAlbumByPlan] = useState(false);

  // Modals
  const [addSongTo, setAddSongTo]   = useState<Song | null>(null);
  const [createPlaylistOpen, setCreatePlaylistOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [createAlbumOpen, setCreateAlbumOpen] = useState(false);
  const [publishAlbumTarget, setPublishAlbumTarget] = useState<Album | null>(null);
  const [publishModalMode, setPublishModalMode] = useState<'now' | 'schedule'>('now');
  const [releaseDateDraft, setReleaseDateDraft] = useState('');
  const [scheduleDateDraft, setScheduleDateDraft] = useState('');
  const [scheduleTimeDraft, setScheduleTimeDraft] = useState('12:00');
  const [creditsDraft, setCreditsDraft] = useState('');
  const [detailAlbumId, setDetailAlbumId]     = useState<string | null>(null);
  const [editPlaylist, setEditPlaylist]        = useState<Playlist | null>(null);
  const [editPlaylistName, setEditPlaylistName] = useState('');

  // Share flow
  const [shareOptionsItem, setShareOptionsItem] = useState<{ type: ShareItemType; id: string; title: string } | null>(null);
  const [discoveryShareItem, setDiscoveryShareItem] = useState<{ type: ShareItemType; id: string; title: string } | null>(null);

  /** Lần đầu vào tab: có spinner; các lần sau chỉ refresh nền — tránh chặn UI mỗi lần chuyển tab */
  const libraryFocusPassRef = useRef(0);

  useEffect(() => {
    libraryFocusPassRef.current = 0;
  }, [authSession?.tokens.accessToken]);

  // ── Load ──────────────────────────────────────────────────────────────────
  useFocusEffect(useCallback(() => {
    const silent = libraryFocusPassRef.current > 0;
    libraryFocusPassRef.current += 1;
    void load(silent);
    const pollIntervalId = setInterval(() => void load(true), 60_000);
    return () => clearInterval(pollIntervalId);
  }, [authSession?.tokens.accessToken]));

  const load = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(false);
      const [plRes, soRes, alRes, artistRes, subRes] = await Promise.allSettled([
        getMyPlaylists({ page: 1, size: 50 }),
        getMySongs({ page: 1, size: 50 }),
        getMyAlbums({ page: 1, size: 50 }),
        apiClient.get<ArtistProfile>('/artists/me'),
        getMySubscription(),
      ]);

      if (plRes.status === 'fulfilled') setPlaylists(plRes.value.content ?? []);
      if (soRes.status === 'fulfilled') setSongs(soRes.value.content ?? []);
      if (alRes.status === 'fulfilled') setAlbums(alRes.value.content ?? []);
      if (soRes.status === 'rejected') {
        const err: any = soRes.reason;
        const status = err?.response?.status;
        const backendMessage = err?.response?.data?.message;
        console.warn('Tải bài hát thất bại', { status, data: err?.response?.data, message: err?.message });
        if (!silent) {
          showToast(
            `${t('screens.library.loadSongsFailedTitle', 'Failed to load songs')}: ${backendMessage || err?.message || t('errors.tryAgain', 'Please try again.')}`,
            'error',
          );
        }
      }

      if (artistRes.status === 'fulfilled') {
        setArtistProfile(artistRes.value.data ?? null);
      } else {
        setArtistProfile(null);
      }
      if (subRes.status === 'fulfilled') {
        const sub = subRes.value;
        const active = sub?.status === 'ACTIVE' && new Date(sub.expiresAt).getTime() > Date.now();
        const features = sub?.plan?.features ?? {};
        const hasAlbumFeature = Boolean(features.create_album ?? features.can_become_artist);
        setHasActiveSub(active);
        setCanCreateAlbumByPlan(active && hasAlbumFeature);
      } else {
        setHasActiveSub(false);
        setCanCreateAlbumByPlan(false);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const isArtist = !!artistProfile?.id;
  const canCreateAlbum = isArtist && canCreateAlbumByPlan;

  // ── Share helper ──────────────────────────────────────────────────────────
  const openShareOptions = (type: ShareItemType, id: string, title: string) => {
    setShareOptionsItem({ type, id, title });
  };

  const handleShareExternal = async () => {
    if (!shareOptionsItem) return;
    const { type, id, title } = shareOptionsItem;
    try {
      const res = type === 'playlist' ? await getPlaylistShareLink(id) :
          type === 'song'     ? await getSongShareLink(id) :
              await getAlbumShareLink(id);
      await Share.share({ message: `${title}\n${res.shareUrl}` });
    } catch (e: any) {
      showToast(e?.message ?? t('screens.library.cannotShare', 'Cannot share.'), 'error');
    }
  };

  const handleDiscoveryPost = async (title: string, caption: string, visibility: 'PUBLIC' | 'FOLLOWERS_ONLY' | 'PRIVATE') => {
    if (!discoveryShareItem) return;
    try {
      const contentType = discoveryShareItem.type === 'playlist' ? 'PLAYLIST' :
          discoveryShareItem.type === 'album'    ? 'ALBUM' : 'SONG';
      await createFeedPost({
        visibility,
        title,
        caption: caption || undefined,
        contentId: discoveryShareItem.id,
        contentType,
      });
      setDiscoveryShareItem(null);
      showToast(t('screens.library.postedToDiscovery', 'Your post has been shared to Discovery.'), 'success');
    } catch (e: any) {
      showToast(e?.message ?? t('screens.library.cannotPostToDiscovery', 'Cannot post to Discovery.'), 'error');
    }
  };

  // ── Playlist actions ──────────────────────────────────────────────────────
  const handleDeletePlaylist = (p: Playlist) => {
    Alert.alert(t('screens.library.deletePlaylistConfirmTitle', 'Delete playlist?'), `"${p.name}" ${t('screens.library.deletePermanentlySuffix', 'will be deleted permanently.')}`, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => {
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
      showToast(e?.message ?? t('screens.library.cannotUpdate', 'Cannot update.'), 'error');
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    try {
      await createPlaylist({
        name: newPlaylistName.trim(),
        visibility: 'PUBLIC',
      });
      setNewPlaylistName('');
      setCreatePlaylistOpen(false);
      await load(true);
    } catch (e: any) {
      showToast(e?.message ?? t('screens.library.cannotCreatePlaylist', 'Cannot create playlist.'), 'error');
    }
  };

  // ── Album actions ─────────────────────────────────────────────────────────
  const handleCreateAlbum = async (title: string) => {
    try {
      await apiClient.post('/albums', { title });
      setCreateAlbumOpen(false);
      await load(true);
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? t('screens.library.cannotCreateAlbum', 'Cannot create album.'));
    }
  };

  const handlePublishAlbum = async (albumId: string, releaseDate?: string) => {
    try {
      const normalizedReleaseDate = (releaseDate ?? '').trim();
      if (normalizedReleaseDate) {
        await updateAlbum(albumId, { releaseDate: normalizedReleaseDate });
      }
      await publishAlbum(albumId);
      await load(true);
      showToast(t('screens.library.albumPublicNow', 'Your album is now public.'), 'success');
    } catch (e: any) {
      showToast(
        e?.message ?? t('screens.library.checkAlbumSongs', 'Check whether your album has enough songs.'),
        'error',
      );
    }
  };

  const handleUnpublishAlbum = async (albumId: string) => {
    try {
      await apiClient.post(`/albums/${albumId}/unpublish`);
      await load(true);
    } catch (e: any) {
      showToast(e?.message ?? t('screens.library.cannotSetPrivate', 'Cannot set private.'), 'error');
    }
  };

  const pad2 = (n: number) => n.toString().padStart(2, '0');

  const openPublishAlbumModal = (album: Album, mode: 'now' | 'schedule' = 'now') => {
    setPublishAlbumTarget(album);
    setPublishModalMode(mode);
    setReleaseDateDraft(album.releaseDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
    if (album.scheduledPublishAt) {
      const d = new Date(album.scheduledPublishAt);
      setScheduleDateDraft(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`);
      setScheduleTimeDraft(`${pad2(d.getHours())}:${pad2(d.getMinutes())}`);
    } else {
      const t = new Date(Date.now() + 24 * 60 * 60 * 1000);
      setScheduleDateDraft(`${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`);
      setScheduleTimeDraft('12:00');
    }
    setCreditsDraft(album.credits ?? '');
  };

  const handleCancelAlbumSchedule = (a: Album) => {
    Alert.alert(
      t('screens.library.cancelSchedule', 'Cancel schedule'),
      t('screens.library.cancelScheduleConfirm', 'Remove the scheduled release time?'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('screens.library.cancelSchedule', 'Cancel schedule'),
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelAlbumSchedule(a.id);
              await load(true);
              showToast(t('screens.library.scheduleCancelled', 'Schedule cancelled.'), 'success');
            } catch (e: any) {
              showToast(e?.response?.data?.message ?? e?.message ?? t('common.error'), 'error');
            }
          },
        },
      ],
    );
  };

  const handleConfirmSchedule = async () => {
    if (!publishAlbumTarget) return;
    try {
      const publishAt = localDateAndTimeToPublishAtIso(scheduleDateDraft, scheduleTimeDraft);
      if (new Date(publishAt).getTime() <= Date.now()) {
        showToast(t('screens.library.scheduleMustBeFuture', 'Choose a date and time in the future.'), 'error');
        return;
      }
      await commitAlbumSchedule(publishAlbumTarget.id, {
        publishAt,
        credits: creditsDraft.trim() || undefined,
      });
      setPublishAlbumTarget(null);
      await load(true);
      showToast(t('screens.library.scheduleSaved', 'Release scheduled.'), 'success');
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? t('common.error');
      showToast(msg, 'error');
    }
  };

  const handleDeleteAlbum = (a: Album) => {
    Alert.alert(t('screens.library.deleteAlbumConfirmTitle', 'Delete album?'), `"${a.title}" ${t('screens.library.deletePermanentlySuffix', 'will be deleted permanently.')}`, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => {
          try {
            await apiClient.delete(`/albums/${a.id}`);
            await load(true);
          } catch (e: any) {
            showToast(e?.message ?? t('common.error', 'Error'), 'error');
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
      showToast(`${t('screens.library.songAddedToPlaylist', 'Song has been added to playlist.')} ✓`);
    } catch (e: any) {
      showToast(e?.message ?? t('common.error', 'Error'), 'error');
    }
  };

  const handleCreateAndAddToPlaylist = async (name: string) => {
    if (!addSongTo) return;
    try {
      const pl = await createPlaylist({ name, visibility: 'PUBLIC' });
      await addSongToPlaylist(pl.id, addSongTo.id);
      setAddSongTo(null);
      await load(true);
      showToast(`${t('screens.library.songAddedToPlaylist', 'Song has been added to playlist.')} ✓`);
    } catch (e: any) {
      showToast(e?.message ?? t('common.error', 'Error'), 'error');
    }
  };

  // ── Render content by tab ─────────────────────────────────────────────────
  const renderPlaylists = () => (
      <>
        <Pressable
            style={styles.createBtn}
            onPress={() => {
              setCreateAlbumOpen(false);
              setCreatePlaylistOpen(true);
            }}
        >
          <View style={styles.createBtnInner}>
            <AnimatedDecorIcon intensity="medium">
              <Text style={styles.createBtnIcon}>+</Text>
            </AnimatedDecorIcon>
            <Text style={styles.createBtnText}>{t('screens.library.createNewPlaylist', 'Create new playlist')}</Text>
          </View>
        </Pressable>

        {playlists.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}><Fontisto name="play-list" color={themeColors.accent} size={14} /></Text>
              <Text style={styles.emptyTitle}>{t('screens.library.noPlaylists', 'No playlists yet')}</Text>
              <Text style={styles.emptySub}>{t('screens.library.noPlaylistsHint', 'Create playlists to organize your favorite songs')}</Text>
            </View>
        ) : playlists.map(p => (
            <Pressable
                key={p.id}
                style={styles.listItem}
                onPress={() => navigation.navigate('PlaylistDetail', { slug: p.slug })}
            >
              <View style={styles.listItemThumb}>
                <Text style={{ fontSize: 22 }}><Fontisto name="play-list" color={themeColors.accent} size={14} /></Text>
              </View>
              <View style={styles.listItemInfo}>
                <Text style={styles.listItemTitle} numberOfLines={1}>{p.name}</Text>
                <Text style={styles.listItemSub}>{p.totalSongs ?? 0} {t('screens.library.songsSuffix', 'songs')}</Text>
              </View>
              <View style={styles.listItemActions}>
                <Pressable
                    hitSlop={8}
                    onPress={() => { setEditPlaylist(p); setEditPlaylistName(p.name); }}
                    style={styles.iconBtn}
                >
                  <Text style={styles.iconBtnText}>
                    <FontAwesome name="edit" color={themeColors.accentAlt} size={18} />
                      </Text>
                </Pressable>
                <Pressable hitSlop={8} onPress={() => openShareOptions('playlist', p.id, p.name)} style={styles.iconBtn}>
                  <Text style={styles.iconBtnText}>↗</Text>
                </Pressable>
                <Pressable hitSlop={8} onPress={() => handleDeletePlaylist(p)} style={styles.iconBtn}>
                  <Text style={[styles.iconBtnText, { color: COLORS.error }]}><AntDesign name="delete" color={COLORS.error} size={15} /></Text>
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
              <Text style={styles.emptyTitle}>{t('screens.library.noSongs', 'No songs yet')}</Text>
              <Text style={styles.emptySub}>{t('screens.library.noSongsHint', 'Upload songs in the Create tab')}</Text>
            </View>
        ) : songs.map(s => (
            <SongRow
                key={s.id}
                song={s}
                isActive={currentSong?.id === s.id}
                isPlaying={currentSong?.id === s.id && isPlaying}
                onPlay={() => playSong(s, songs)}
                onAddToPlaylist={() => setAddSongTo(s)}
                onShare={() => openShareOptions('song', s.id, s.title)}
                onEdit={isArtist ? () => navigation.navigate('EditSong', { songId: s.id }) : undefined}
            />
        ))}
      </>
  );

  const renderAlbums = () => (
      <>
        {canCreateAlbum ? (
            <Pressable style={[styles.createBtn, { marginBottom: 12 }]} onPress={() => setCreateAlbumOpen(true)}>
              <View style={styles.createBtnInner}>
                <AnimatedDecorIcon intensity="medium">
                  <Text style={styles.createBtnIcon}>+</Text>
                </AnimatedDecorIcon>
                <Text style={styles.createBtnText}>{t('screens.library.createNewAlbum', 'Create new album')}</Text>
              </View>
            </Pressable>
        ) : (
            <View style={styles.albumGateCard}>
              {!isArtist ? (
                  <>
                    <Text style={styles.albumGateTitle}>{t('screens.create.becomeArtist', 'Become an Artist')}</Text>
                    <Text style={styles.albumGateSub}>
                      {t('screens.create.registerArtistToStart', 'Register as an artist to start uploading music')}
                    </Text>
                    <Pressable style={styles.albumGateBtn} onPress={() => navigation.navigate('Create')}>
                      <Text style={styles.albumGateBtnText}>{t('screens.create.registerArtistButton', 'Register Artist')}</Text>
                    </Pressable>
                  </>
              ) : (
                  <>
                    <Text style={styles.albumGateTitle}>{t('screens.create.renewSubscription', 'Renew subscription')}</Text>
                    <Text style={styles.albumGateSub}>
                      {t('screens.create.subscriptionExpiredMessagePrefix', 'Your subscription has expired. Go to')}{' '}
                      <Text style={{ color: themeColors.accent }}>{t('navigation.premium', 'Premium')}</Text>
                      {' '}{t('screens.create.subscriptionExpiredMessageSuffix', 'to renew and continue uploading music.')}
                    </Text>
                    {!hasActiveSub && (
                        <Pressable style={styles.albumGateBtn} onPress={() => navigation.navigate('Premium')}>
                          <Text style={styles.albumGateBtnText}>{t('navigation.premium', 'Premium')}</Text>
                        </Pressable>
                    )}
                  </>
              )}
            </View>
        )}

        {canCreateAlbum ? (
            albums.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyEmoji}>💿</Text>
                  <Text style={styles.emptyTitle}>{t('screens.library.noAlbums', 'No albums yet')}</Text>
                  <Text style={styles.emptySub}>{t('screens.library.noAlbumsHint', 'Organize songs into albums for release')}</Text>
                </View>
            ) : albums.map(a => (
                <AlbumCard
                    key={a.id}
                    album={a}
                    onPress={() => setDetailAlbumId(a.id)}
                    onPublish={() => openPublishAlbumModal(a, 'now')}
                    onScheduleRelease={() => openPublishAlbumModal(a, 'schedule')}
                    onCancelSchedule={() => handleCancelAlbumSchedule(a)}
                    onUnpublish={() => void handleUnpublishAlbum(a.id)}
                    onDelete={() => handleDeleteAlbum(a)}
                    onShare={() => openShareOptions('album', a.id, a.title)}
                />
            ))
        ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>💿</Text>
              <Text style={styles.emptyTitle}>{t('screens.library.noAlbums', 'No albums yet')}</Text>
              <Text style={styles.emptySub}>{t('screens.library.noAlbumsHint', 'Organize songs into albums for release')}</Text>
            </View>
        )}
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
              colors={[themeColors.gradSlate, themeColors.bg]}
              style={[styles.header, { paddingTop: insets.top + 18 }]}
          >
            <Text style={styles.headerTitle}>{t('screens.library.title', 'Library')}</Text>
            <Text style={styles.headerSub}>
              {playlists.length} {t('screens.library.tabPlaylists', 'playlists')} · {songs.length} {t('screens.library.tabSongs', 'songs')} · {albums.length} {t('screens.library.tabAlbums', 'albums')}
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
              <Text style={modalStyles.title}>{t('screens.library.editPlaylistName', 'Edit playlist name')}</Text>
              <TextInput
                  style={modalStyles.input}
                  value={editPlaylistName}
                  onChangeText={setEditPlaylistName}
                  autoFocus
              />
              <View style={modalStyles.actions}>
                <Pressable style={modalStyles.cancelBtn} onPress={() => setEditPlaylist(null)}>
                  <Text style={modalStyles.cancelText}>{t('common.cancel')}</Text>
                </Pressable>
                <Pressable style={modalStyles.createBtn} onPress={handleSavePlaylistEdit}>
                  <Text style={modalStyles.createText}>{t('common.save')}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
            visible={createPlaylistOpen}
            transparent
            animationType="fade"
            onRequestClose={() => setCreatePlaylistOpen(false)}
        >
          <View style={modalStyles.overlay}>
            <View style={modalStyles.card}>
              <Text style={modalStyles.title}>{t('screens.library.createNewPlaylist', 'Create new playlist')}</Text>
              <TextInput
                  style={modalStyles.input}
                  value={newPlaylistName}
                  onChangeText={setNewPlaylistName}
                  placeholder={t('screens.library.createPlaylistPlaceholder', 'Create new playlist...')}
                  placeholderTextColor={COLORS.glass30}
                  autoFocus
              />
              <View style={modalStyles.actions}>
                <Pressable
                    style={modalStyles.cancelBtn}
                    onPress={() => {
                      setCreatePlaylistOpen(false);
                      setNewPlaylistName('');
                    }}
                >
                  <Text style={modalStyles.cancelText}>{t('common.cancel')}</Text>
                </Pressable>
                <Pressable
                    style={[modalStyles.createBtn, !newPlaylistName.trim() && { opacity: 0.4 }]}
                    onPress={handleCreatePlaylist}
                    disabled={!newPlaylistName.trim()}
                >
                  <Text style={modalStyles.createText}>{t('common.create', 'Create')}</Text>
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

        <Modal
          visible={!!publishAlbumTarget}
          transparent
          animationType="fade"
          onRequestClose={() => setPublishAlbumTarget(null)}
        >
          <View style={modalStyles.overlay}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 24 }}
            >
              <View style={modalStyles.card}>
                <Text style={modalStyles.title}>{t('screens.library.publishAlbum', 'Publish album')}</Text>
                <Text style={modalStyles.subTitle} numberOfLines={2}>{publishAlbumTarget?.title}</Text>

                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                  <Pressable
                    style={[
                      modalStyles.modeChip,
                      publishModalMode === 'now' && modalStyles.modeChipActive,
                    ]}
                    onPress={() => setPublishModalMode('now')}
                  >
                    <Text style={[modalStyles.modeChipText, publishModalMode === 'now' && modalStyles.modeChipTextActive]}>
                      {t('screens.library.publishNowTab', 'Publish now')}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      modalStyles.modeChip,
                      publishModalMode === 'schedule' && modalStyles.modeChipActive,
                    ]}
                    onPress={() => setPublishModalMode('schedule')}
                  >
                    <Text style={[modalStyles.modeChipText, publishModalMode === 'schedule' && modalStyles.modeChipTextActive]}>
                      {t('screens.library.scheduleTab', 'Schedule')}
                    </Text>
                  </Pressable>
                </View>

                {publishModalMode === 'now' ? (
                  <>
                    <Text style={modalStyles.subTitle}>
                      {t('screens.library.releaseDateOptional', 'Release date (optional, YYYY-MM-DD)')}
                    </Text>
                    <TextInput
                      style={modalStyles.input}
                      value={releaseDateDraft}
                      onChangeText={setReleaseDateDraft}
                      placeholder="2026-03-27"
                      placeholderTextColor={COLORS.glass30}
                    />
                  </>
                ) : (
                  <>
                    <Text style={modalStyles.subTitle}>
                      {t('screens.library.scheduleDateLabel', 'Release date (YYYY-MM-DD)')}
                    </Text>
                    <TextInput
                      style={modalStyles.input}
                      value={scheduleDateDraft}
                      onChangeText={setScheduleDateDraft}
                      placeholder="2026-03-30"
                      placeholderTextColor={COLORS.glass30}
                    />
                    <Text style={modalStyles.subTitle}>
                      {t('screens.library.scheduleTimeLabel', 'Time (HH:mm, local)')}
                    </Text>
                    <TextInput
                      style={modalStyles.input}
                      value={scheduleTimeDraft}
                      onChangeText={setScheduleTimeDraft}
                      placeholder="20:00"
                      placeholderTextColor={COLORS.glass30}
                    />
                    <Text style={modalStyles.subTitle}>
                      {t('screens.library.creditsLabel', 'Credits / collaborators')}
                    </Text>
                    <TextInput
                      style={[modalStyles.input, { minHeight: 72, textAlignVertical: 'top' }]}
                      value={creditsDraft}
                      onChangeText={setCreditsDraft}
                      placeholder={t('screens.library.creditsPlaceholder', 'Featuring, producers...')}
                      placeholderTextColor={COLORS.glass30}
                      multiline
                    />
                    <Text style={[modalStyles.subTitle, { fontSize: 11, opacity: 0.85 }]}>
                      {t('screens.library.scheduleCooldownHint', 'You can change the scheduled time only 6 hours after the last confirmation.')}
                    </Text>
                  </>
                )}

                <View style={modalStyles.actions}>
                  <Pressable style={modalStyles.cancelBtn} onPress={() => setPublishAlbumTarget(null)}>
                    <Text style={modalStyles.cancelText}>{t('common.cancel', 'Cancel')}</Text>
                  </Pressable>
                  <Pressable
                    style={modalStyles.createBtn}
                    onPress={async () => {
                      if (!publishAlbumTarget) return;
                      if (publishModalMode === 'now') {
                        await handlePublishAlbum(publishAlbumTarget.id, releaseDateDraft);
                        setPublishAlbumTarget(null);
                      } else {
                        await handleConfirmSchedule();
                      }
                    }}
                  >
                    <Text style={modalStyles.createText}>
                      {publishModalMode === 'now'
                        ? t('screens.library.publish', 'Publish')
                        : t('screens.library.confirmSchedule', 'Confirm schedule')}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </View>
        </Modal>

        {/* Add to playlist */}
        <AddToPlaylistModal
            visible={!!addSongTo}
            song={addSongTo}
            playlists={playlists}
            onClose={() => setAddSongTo(null)}
            onAdd={handleAddToPlaylist}
            onCreateAndAdd={handleCreateAndAddToPlaylist}
        />

        {/* Share options sheet */}
        <ShareOptionsSheet
            visible={!!shareOptionsItem}
            item={shareOptionsItem}
            onClose={() => setShareOptionsItem(null)}
            onExternal={() => void handleShareExternal()}
            onDiscovery={() => setDiscoveryShareItem(shareOptionsItem)}
        />

        {/* Share to Discovery modal */}
        <ShareToDiscoveryModal
            visible={!!discoveryShareItem}
            item={discoveryShareItem}
            onClose={() => setDiscoveryShareItem(null)}
            onPost={(title, caption, visibility) => handleDiscoveryPost(title, caption, visibility)}
        />

        <Toast {...toast} onHide={hideToast} />
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
  albumGateCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.glass12,
    backgroundColor: COLORS.surface,
    gap: 8,
  },
  albumGateTitle: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  albumGateSub: { color: COLORS.glass50, fontSize: 13, lineHeight: 20 },
  albumGateBtn: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: COLORS.accentDim,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  albumGateBtnText: { color: COLORS.white, fontSize: 13, fontWeight: '700' },

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
