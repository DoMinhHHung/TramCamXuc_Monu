import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import { FontAwesome, Ionicons, AntDesign } from '@expo/vector-icons';

import { COLORS, useThemeColors } from '../../config/colors';
import { SectionSkeleton } from '../../components/SkeletonLoader';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LocalizationContext';
import {
  Comment,
  createFeedPost,
  createPostComment,
  deleteComment,
  deleteFeedPost,
  FeedPost,
  getCommentReplies,
  getPostComments,
  getTimeline,
  likeComment,
  likeFeedPost,
  unlikeComment,
  unlikeFeedPost,
  updateComment,
  updateFeedPost,
  getArtistByUserId,
  getMyFollowedArtists,
  getPublicFeed,
} from '../../services/social';
import {
  Song,
  getAlbumById,
  getMyAlbumById,
  getPlaylistById,
  getSongById,
  getSongsByIds,
  getPlaylistBySlug,
  addSongToPlaylist,
  createPlaylist,
  getMyAlbums,
  getMyPlaylists,
  Album,
  Playlist,
  savePlaylistFromDiscovery,
} from '../../services/music';
import { getMySubscription } from '../../services/payment';
import { apiClient } from '../../services/api';
import { usePlayer } from '../../context/PlayerContext';
import { notifyFeedUpdated, subscribeFeedUpdates } from '../../services/feedEvents';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface OwnerInfo {
  displayName: string;
  artistId: string | null;
  avatarUrl?: string;
}

interface PostContentInfo {
  type: 'SONG' | 'ALBUM' | 'PLAYLIST';
  id: string;
  slug?: string;
  title: string;
  subtitle?: string;
  coverUrl?: string;
  songs: Song[];
  totalCount?: number;
  ownerName?: string;
}

let tr = (key: string, fallback?: string) => fallback ?? key;
let rc = COLORS;

// ─── Helpers ───────────────────────────────────────────────────────────────────

const timeAgo = (iso: string): string => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.floor(diffMs / 60_000));
  if (mins < 60) return `${mins} ${tr('screens.history.minutesAgoSuffix', 'phút trước')}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ${tr('screens.history.hoursAgoSuffix', 'giờ trước')}`;
  return `${Math.floor(hours / 24)} ${tr('screens.history.daysAgoSuffix', 'ngày trước')}`;
};

const getAvatarColors = (id: string): [string, string] => {
  const palette: [string, string][] = [
    [COLORS.gradPurple, COLORS.accent],
    [COLORS.cardTrendingFrom, COLORS.cardTrendingTo],
    [COLORS.cardAcousticFrom, COLORS.cardAcousticTo],
    [COLORS.gradIndigo, COLORS.accentAlt],
    [COLORS.cardLofiFrom, COLORS.catRnbTo],
  ];
  return palette[id.charCodeAt(0) % palette.length];
};

const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

const parsePlaylistLimit = (features?: Record<string, any>): number | null => {
  if (!features) return null;
  const raw = features.playlist_limit;
  if (raw == null) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) && raw > 0 ? raw : null;
  if (typeof raw === 'string') {
    const value = raw.trim().toLowerCase();
    if (!value || value === 'unlimited') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
};

// ─── Sub-components ────────────────────────────────────────────────────────────

const Avatar = ({
                  id, displayName, size = 40, avatarUrl,
                }: { id: string; displayName?: string; size?: number; avatarUrl?: string }) => (
    <LinearGradient
        colors={getAvatarColors(id)}
        style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
    >
      {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      ) : (
          <Text style={[styles.avatarText, { fontSize: size * 0.34 }]}>
            {getInitials(displayName ?? id)}
          </Text>
      )}
    </LinearGradient>
);

const ActionBtn = ({
                     icon, label, active, onPress, isLikeBtn = false,
                   }: { icon: string | React.ReactNode; label: string | number; active?: boolean; onPress: () => void; isLikeBtn?: boolean; }) => (
    <Pressable
        style={[styles.actionBtn, active && isLikeBtn ? styles.likeWrapActive : styles.likeWrap]}
        onPress={onPress}
        hitSlop={8}
    >
      {typeof icon === 'string' ? (
          <Text style={[styles.actionIcon, active && isLikeBtn && styles.likeEmoji]}>{icon}</Text>
      ) : (
          icon
      )}
      {Number(label) > 0 && (
          <Text style={[styles.actionLabel, active && isLikeBtn && styles.labelLiked]}>{label}</Text>
      )}
    </Pressable>
);

// ─── Save Content Modal ────────────────────────────────────────────────────────
// Hỗ trợ lưu vào cả Playlist và Album (2 tab)

interface SaveContentModalProps {
  visible: boolean;
  songs: Song[];
  sourceTitle: string;
  sourceOwner?: string;
  canManageAlbums?: boolean;
  onClose: () => void;
  discoveryPlaylistId?: string; // Nếu là copy từ Discovery, truyền id playlist gốc
}

const SaveContentModal: React.FC<SaveContentModalProps> = ({
  visible, songs, sourceTitle, sourceOwner, canManageAlbums = false, onClose, discoveryPlaylistId,
}) => {
  const insets = useSafeAreaInsets();

  // Tab state: 'playlist' | 'album'
  const [activeTab, setActiveTab] = useState<'playlist' | 'album'>('playlist');

  // Playlist state
  const [playlists, setPlaylists]     = useState<Playlist[]>([]);
  const [loadingPl, setLoadingPl]     = useState(false);
  const [savingPl, setSavingPl]       = useState<string | null>(null);
  const [newPlName, setNewPlName]     = useState('');
  const [creatingPl, setCreatingPl]   = useState(false);
  const [playlistNameError, setPlaylistNameError] = useState<string | null>(null);
  const [playlistLimit, setPlaylistLimit] = useState<number | null>(null);

  // Album state
  const [albums, setAlbums]           = useState<Album[]>([]);
  const [loadingAl, setLoadingAl]     = useState(false);
  const [savingAl, setSavingAl]       = useState<string | null>(null);
  const [newAlName, setNewAlName]     = useState('');
  const [creatingAl, setCreatingAl]   = useState(false);

  // Load khi mở modal
  useEffect(() => {
    if (!visible) {
      setPlaylistLimit(null);
      return;
    }
    // Load playlists
    setLoadingPl(true);
    getMyPlaylists({ page: 1, size: 50 })
        .then(res => setPlaylists(res.content ?? []))
        .catch(() => setPlaylists([]))
        .finally(() => setLoadingPl(false));
    // Load current subscription limits to align create rule with payment features.
    getMySubscription()
        .then(sub => setPlaylistLimit(parsePlaylistLimit(sub?.plan?.features)))
        .catch(() => setPlaylistLimit(null));
    // Load albums của mình
    setLoadingAl(true);
    getMyAlbums({ page: 1, size: 50 })
        .then(res => setAlbums(res.content ?? []))
        .catch(() => setAlbums([]))
        .finally(() => setLoadingAl(false));
    if (!canManageAlbums) setActiveTab('playlist');
    setPlaylistNameError(null);
    setNewPlName('');
    setNewAlName('');
  }, [visible, canManageAlbums]);

  // ── Lưu vào Playlist ─────────────────────────────────────────────────────────
  const handleSaveToPlaylist = useCallback(async (plId: string, plName: string) => {
    setSavingPl(plId);
    if (discoveryPlaylistId) {
      // Nếu là copy từ Discovery, gọi API đặc biệt
      try {
        await savePlaylistFromDiscovery(discoveryPlaylistId, sourceOwner || '');
        setSavingPl(null);
        Alert.alert(
          '✓ Đã lưu',
          `Đã tạo bản copy Discovery từ "${sourceTitle}"`,
          [{ text: 'OK', onPress: onClose }]
        );
      } catch (e: any) {
        setSavingPl(null);
        Alert.alert('Lỗi', e?.message || 'Không thể lưu playlist từ Discovery');
      }
      return;
    }
    let ok = 0;
    for (const s of songs) {
      try { await addSongToPlaylist(plId, s.id); ok++; } catch { /* duplicate bỏ qua */ }
    }
    setSavingPl(null);
    Alert.alert(
        '✓ Đã lưu vào playlist',
        `${ok}/${songs.length} bài từ "${sourceTitle}" → playlist "${plName}"`,
        [{ text: 'OK', onPress: onClose }],
    );
  }, [songs, sourceTitle, onClose, discoveryPlaylistId, sourceOwner]);

  const handleCreatePlaylistAndSave = useCallback(async () => {
    const trimmedName = newPlName.trim();
    if (!trimmedName) {
      setPlaylistNameError('Tên playlist không được để trống');
      return;
    }
    if (trimmedName.length < 2) {
      setPlaylistNameError('Tên playlist cần ít nhất 2 ký tự');
      return;
    }
    if (playlistLimit !== null && playlists.length >= playlistLimit) {
      Alert.alert(
          'Đã đạt giới hạn playlist',
          `Gói hiện tại cho phép tối đa ${playlistLimit} playlist. Vui lòng xoá bớt hoặc nâng cấp gói để tạo mới.`,
      );
      return;
    }
    setCreatingPl(true);
    setPlaylistNameError(null);
    try {
      const pl = await createPlaylist({ name: trimmedName, visibility: 'PUBLIC' });
      setNewPlName('');
      await handleSaveToPlaylist(pl.id, pl.name);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message ?? 'Không thể tạo playlist');
    } finally { setCreatingPl(false); }
  }, [newPlName, handleSaveToPlaylist, playlistLimit, playlists.length]);

  // ── Lưu vào Album ─────────────────────────────────────────────────────────────
  const handleSaveToAlbum = useCallback(async (albumId: string, albumTitle: string) => {
    setSavingAl(albumId);
    let ok = 0;
    for (const s of songs) {
      try {
        await apiClient.post(`/albums/${albumId}/songs/${s.id}`);
        ok++;
      } catch { /* bài đã có trong album → bỏ qua */ }
    }
    setSavingAl(null);
    Alert.alert(
        '✓ Đã lưu vào album',
        `${ok}/${songs.length} bài từ "${sourceTitle}" → album "${albumTitle}"`,
        [{ text: 'OK', onPress: onClose }],
    );
  }, [songs, sourceTitle, onClose]);

  const handleCreateAlbumAndSave = useCallback(async () => {
    if (!newAlName.trim()) return;
    setCreatingAl(true);
    try {
      const res = await apiClient.post<{ id: string; title: string }>('/albums', {
        title: newAlName.trim(),
      });
      const newAlbum = res.data as any;
      setNewAlName('');
      await handleSaveToAlbum(newAlbum.id ?? newAlbum?.result?.id, newAlName.trim());
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message ?? 'Không thể tạo album');
    } finally { setCreatingAl(false); }
  }, [newAlName, handleSaveToAlbum]);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <Pressable style={saveStyles.overlay} onPress={onClose} />
        <View style={[saveStyles.sheet, { paddingBottom: insets.bottom + 8 }]}>
          <View style={saveStyles.handle} />

          {/* Title */}
          <Text style={saveStyles.title}>💾 Lưu vào thư viện của tôi</Text>

          {/* Source badge */}
          <View style={saveStyles.sourceBadge}>
            <Text style={saveStyles.sourceText} numberOfLines={2}>
              📎 {sourceTitle}
              {sourceOwner ? `  ·  bởi ${sourceOwner}` : ''}
              {'  ·  '}{songs.length} bài
            </Text>
          </View>

          {/* Tab bar: Playlist | Album */}
          <View style={saveStyles.tabBar}>
            <Pressable
                style={[saveStyles.tab, activeTab === 'playlist' && saveStyles.tabActive]}
                onPress={() => setActiveTab('playlist')}
            >
              <Text style={[saveStyles.tabText, activeTab === 'playlist' && saveStyles.tabTextActive]}>
                🎵 Playlist
              </Text>
            </Pressable>
            {canManageAlbums && (
                <Pressable
                    style={[saveStyles.tab, activeTab === 'album' && saveStyles.tabActive]}
                    onPress={() => setActiveTab('album')}
                >
                  <Text style={[saveStyles.tabText, activeTab === 'album' && saveStyles.tabTextActive]}>
                    💿 Album
                  </Text>
                </Pressable>
            )}
          </View>

          {!canManageAlbums && (
              <View style={saveStyles.lockedNotice}>
                <Text style={saveStyles.lockedNoticeText}>
                  Album chỉ dành cho tài khoản Nghệ sĩ. Hiện bạn vẫn có thể lưu nhanh vào Playlist.
                </Text>
              </View>
          )}

          {/* ── Tab Playlist ── */}
          {activeTab === 'playlist' && (
              <>
                {loadingPl ? (
                    <ActivityIndicator color={COLORS.accent} style={{ marginVertical: 20 }} />
                ) : (
                    <FlatList
                        data={playlists}
                        keyExtractor={p => p.id}
                        style={{ maxHeight: 210 }}
                        renderItem={({ item }) => (
                            <Pressable
                                style={saveStyles.row}
                                onPress={() => void handleSaveToPlaylist(item.id, item.name)}
                                disabled={savingPl === item.id}
                            >
                              <View style={saveStyles.rowIcon}><Text style={{ fontSize: 18 }}>🎵</Text></View>
                              <View style={{ flex: 1 }}>
                                <Text style={saveStyles.rowName} numberOfLines={1}>{item.name}</Text>
                                <Text style={saveStyles.rowCount}>{item.totalSongs ?? 0} bài</Text>
                              </View>
                              {savingPl === item.id
                                  ? <ActivityIndicator size="small" color={COLORS.accent} />
                                  : <Text style={saveStyles.addIcon}>＋</Text>}
                            </Pressable>
                        )}
                        ListEmptyComponent={
                          <Text style={saveStyles.empty}>Chưa có playlist nào</Text>
                        }
                    />
                )}

                {/* Tạo playlist mới */}
                <View style={saveStyles.createSection}>
                  <Text style={saveStyles.createLabel}>Tạo playlist mới</Text>
                <View style={saveStyles.newRow}>
                  <TextInput
                      style={saveStyles.input}
                      value={newPlName}
                      onChangeText={text => {
                        setNewPlName(text);
                        if (playlistNameError) setPlaylistNameError(null);
                      }}
                      placeholder="Tạo playlist mới và lưu..."
                      placeholderTextColor={COLORS.glass30}
                      maxLength={60}
                  />
                  <Pressable
                      style={[saveStyles.newBtn, (!newPlName.trim() || creatingPl) && { opacity: 0.4 }]}
                      onPress={handleCreatePlaylistAndSave}
                      disabled={!newPlName.trim() || creatingPl}
                  >
                    {creatingPl
                        ? <ActivityIndicator size="small" color={COLORS.white} />
                        : <Text style={saveStyles.newBtnText}>Tạo</Text>}
                  </Pressable>
                </View>
                  <View style={saveStyles.inputMetaRow}>
                    <Text style={[saveStyles.inputMetaText, playlistNameError && saveStyles.inputMetaError]}>
                      {playlistNameError ?? ' '}
                    </Text>
                    <Text style={saveStyles.inputMetaText}>{newPlName.trim().length}/60</Text>
                  </View>
                </View>
              </>
          )}

          {/* ── Tab Album ── */}
          {activeTab === 'album' && canManageAlbums && (
              <>
                <Text style={saveStyles.tabHint}>
                  Chỉ album DRAFT / PRIVATE mới nhận bài mới
                </Text>

                {loadingAl ? (
                    <ActivityIndicator color={COLORS.accent} style={{ marginVertical: 20 }} />
                ) : (
                    <FlatList
                        data={albums}
                        keyExtractor={a => a.id}
                        style={{ maxHeight: 210 }}
                        renderItem={({ item }) => {
                          const statusIcon =
                              item.status === 'PUBLIC'  ? '🌐' :
                                  item.status === 'PRIVATE' ? '🔒' : '📝';
                          return (
                              <Pressable
                                  style={saveStyles.row}
                                  onPress={() => void handleSaveToAlbum(item.id, item.title)}
                                  disabled={savingAl === item.id}
                              >
                                <View style={saveStyles.rowIcon}><Text style={{ fontSize: 18 }}>💿</Text></View>
                                <View style={{ flex: 1 }}>
                                  <Text style={saveStyles.rowName} numberOfLines={1}>{item.title}</Text>
                                  <Text style={saveStyles.rowCount}>
                                    {statusIcon} {item.status}  ·  {item.totalSongs ?? item.songs?.length ?? 0} bài
                                  </Text>
                                </View>
                                {savingAl === item.id
                                    ? <ActivityIndicator size="small" color={COLORS.accent} />
                                    : <Text style={saveStyles.addIcon}>＋</Text>}
                              </Pressable>
                          );
                        }}
                        ListEmptyComponent={
                          <Text style={saveStyles.empty}>Chưa có album nào</Text>
                        }
                    />
                )}

                {/* Tạo album mới */}
                <View style={saveStyles.newRow}>
                  <TextInput
                      style={saveStyles.input}
                      value={newAlName}
                      onChangeText={setNewAlName}
                      placeholder="Tạo album mới và lưu..."
                      placeholderTextColor={COLORS.glass30}
                  />
                  <Pressable
                      style={[saveStyles.newBtn, (!newAlName.trim() || creatingAl) && { opacity: 0.4 }]}
                      onPress={handleCreateAlbumAndSave}
                      disabled={!newAlName.trim() || creatingAl}
                  >
                    {creatingAl
                        ? <ActivityIndicator size="small" color={COLORS.white} />
                        : <Text style={saveStyles.newBtnText}>＋</Text>}
                  </Pressable>
                </View>
              </>
          )}

          <Pressable style={saveStyles.closeBtn} onPress={onClose}>
            <Text style={saveStyles.closeBtnText}>Đóng</Text>
          </Pressable>
        </View>
      </Modal>
  );
};


// ─── Shared Content Detail Modal ───────────────────────────────────────────────

interface SharedContentDetailModalProps {
  visible: boolean;
  content: PostContentInfo | null;
  canManageAlbums: boolean;
  onClose: () => void;
}

const SharedContentDetailModal: React.FC<SharedContentDetailModalProps> = ({
                                                                             visible, content, canManageAlbums, onClose,
                                                                           }) => {
  const insets = useSafeAreaInsets();
  const { playSong, currentSong } = usePlayer();
  const [saveOpen, setSaveOpen] = useState(false);

  if (!content) return null;

  const typeLabel =
      content.type === 'ALBUM'    ? 'Album' :
          content.type === 'PLAYLIST' ? 'Playlist' : 'Bài hát';

  const saveBtnLabel =
      content.type === 'ALBUM'    ? '💿 Lưu vào playlist / album' :
          content.type === 'PLAYLIST' ? '📋 Lưu vào playlist / album' :
              '➕ Lưu vào playlist / album';

  return (
      <>
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={onClose}
        >
          <View style={detailStyles.root}>
            {/* Header */}
            <View style={[detailStyles.header, { paddingTop: insets.top + 6 }]}>
              <Pressable style={detailStyles.backBtn} onPress={onClose}>
                <Ionicons name="arrow-back" size={22} color={COLORS.white} />
                <Text style={detailStyles.backText}>Quay lại</Text>
              </Pressable>

              {content.songs.length > 0 && (
                  <Pressable
                      style={detailStyles.saveBtn}
                      onPress={() => setSaveOpen(true)}
                  >
                    <Text style={detailStyles.saveBtnText}>{saveBtnLabel}</Text>
                  </Pressable>
              )}
            </View>

            <ScrollView
                contentContainerStyle={detailStyles.body}
                showsVerticalScrollIndicator={false}
            >
              {/* Cover */}
              <Image
                  source={{ uri: content.coverUrl || 'https://via.placeholder.com/220' }}
                  style={detailStyles.cover}
              />

              {/* Meta */}
              <View style={detailStyles.typeBadge}>
                <Text style={detailStyles.typeText}>{typeLabel}</Text>
              </View>
              <Text style={detailStyles.title}>{content.title}</Text>
              {content.subtitle ? (
                  <Text style={detailStyles.subtitle}>{content.subtitle}</Text>
              ) : null}
              {content.ownerName ? (
                  <Text style={detailStyles.owner}>
                    Chia sẻ bởi{' '}
                    <Text style={{ color: COLORS.accent, fontWeight: '700' }}>
                      {content.ownerName}
                    </Text>
                  </Text>
              ) : null}
              <Text style={detailStyles.count}>
                {content.totalCount ?? content.songs.length} bài hát
              </Text>

              {/* Track list */}
              {content.songs.length > 0 ? (
                  <View style={detailStyles.tracks}>
                    {content.songs.map((song, idx) => {
                      const active = currentSong?.id === song.id;
                      return (
                          <Pressable
                              key={`${song.id}-${idx}`}
                              style={[detailStyles.trackRow, active && detailStyles.trackRowActive]}
                              onPress={() => playSong(song, content.songs)}
                          >
                            <Text style={detailStyles.trackNum}>{idx + 1}</Text>
                            <View style={detailStyles.trackInfo}>
                              <Text
                                  style={[detailStyles.trackTitle, active && { color: COLORS.accent }]}
                                  numberOfLines={1}
                              >
                                {song.title}
                              </Text>
                              <Text style={detailStyles.trackArtist} numberOfLines={1}>
                                {song.primaryArtist?.stageName ?? 'Nghệ sĩ'}
                              </Text>
                            </View>
                            <Ionicons
                                name={active ? 'pause' : 'play'}
                                size={18}
                                color={active ? COLORS.accent : COLORS.glass50}
                            />
                          </Pressable>
                      );
                    })}
                  </View>
              ) : (
                  <Text style={detailStyles.empty}>Không có bài hát nào</Text>
              )}
            </ScrollView>
          </View>
        </Modal>

        <SaveContentModal
          visible={saveOpen}
          songs={content.songs}
          sourceTitle={content.title}
          sourceOwner={content.ownerName ?? content.subtitle}
          canManageAlbums={canManageAlbums}
          onClose={() => setSaveOpen(false)}
          discoveryPlaylistId={content.type === 'PLAYLIST' && content.slug === 'discovery' ? content.id : undefined}
        />
      </>
  );
};

// ─── Compose Modal ──────────────────────────────────────────────────────────────

const VISIBILITY_OPTIONS: { value: 'PUBLIC' | 'PRIVATE' | 'FOLLOWERS_ONLY'; label: string; icon: string }[] = [
  { value: 'PUBLIC',         label: 'Công khai',       icon: '🌐' },
  { value: 'FOLLOWERS_ONLY', label: 'Người theo dõi',  icon: '👥' },
  { value: 'PRIVATE',        label: 'Riêng tư',        icon: '🔒' },
];

interface ComposeModalProps {
  visible: boolean;
  userId: string;
  displayName: string | null;
  onClose: () => void;
  onPost: (title: string, caption: string, visibility: 'PUBLIC' | 'PRIVATE' | 'FOLLOWERS_ONLY') => Promise<void>;
  posting: boolean;
}

const ComposeModal = ({ visible, userId, displayName, onClose, onPost, posting }: ComposeModalProps) => {
  const insets = useSafeAreaInsets();
  const [title, setTitle]       = useState('');
  const [caption, setCaption]   = useState('');
  const [visibility, setVis]    = useState<'PUBLIC' | 'PRIVATE' | 'FOLLOWERS_ONLY'>('PUBLIC');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      const t = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(t);
    } else {
      setTitle(''); setCaption(''); setVis('PUBLIC');
    }
  }, [visible]);

  const canPost = title.trim().length > 0;
  const shownName = displayName || userId?.slice(0, 8) + '...';

  return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[composeStyles.root, { paddingTop: insets.top + 4 }]}>
            <View style={composeStyles.header}>
              <Pressable onPress={onClose} style={composeStyles.cancelBtn}>
                <Text style={composeStyles.cancelText}>Huỷ</Text>
              </Pressable>
              <Text style={composeStyles.headerTitle}>Tạo bài viết</Text>
              <Pressable
                  style={[composeStyles.postBtn, !canPost && composeStyles.postBtnDisabled]}
                  onPress={() => canPost && !posting && onPost(title.trim(), caption.trim(), visibility)}
                  disabled={!canPost || posting}
              >
                {posting
                    ? <ActivityIndicator size="small" color={COLORS.white} />
                    : <Text style={composeStyles.postBtnText}>Đăng</Text>}
              </Pressable>
            </View>

            <View style={composeStyles.divider} />

            <View style={composeStyles.userRow}>
              <Avatar id={userId} displayName={displayName ?? userId} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={composeStyles.userName}>{shownName}</Text>
                <View style={composeStyles.visBadge}>
                  <Text style={composeStyles.visIcon}>
                    {VISIBILITY_OPTIONS.find(v => v.value === visibility)?.icon ?? '🌐'}
                  </Text>
                  <Text style={composeStyles.visText}>
                    {VISIBILITY_OPTIONS.find(v => v.value === visibility)?.label ?? 'Công khai'}
                  </Text>
                </View>
              </View>
            </View>

            <ScrollView style={{ flex: 1, paddingHorizontal: 16 }} keyboardShouldPersistTaps="handled">
              <TextInput
                  ref={inputRef}
                  style={composeStyles.titleInput}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Tiêu đề bài viết..."
                  placeholderTextColor={COLORS.glass25}
                  multiline
              />
              <TextInput
                  style={composeStyles.captionInput}
                  value={caption}
                  onChangeText={setCaption}
                  placeholder="Chia sẻ cảm xúc âm nhạc của bạn..."
                  placeholderTextColor={COLORS.glass20}
                  multiline
              />
              <View style={composeStyles.visRow}>
                <Text style={composeStyles.visLabel}>Hiển thị:</Text>
                {VISIBILITY_OPTIONS.map(opt => (
                    <Pressable
                        key={opt.value}
                        style={[composeStyles.visChip, visibility === opt.value && composeStyles.visChipActive]}
                        onPress={() => setVis(opt.value)}
                    >
                      <Text style={composeStyles.visChipIcon}>{opt.icon}</Text>
                      <Text style={[composeStyles.visChipText, visibility === opt.value && composeStyles.visChipTextActive]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                ))}
              </View>
            </ScrollView>

            <View style={[composeStyles.toolbar, { paddingBottom: insets.bottom + 8 }]}>
              <Text style={composeStyles.toolbarLabel}>Thêm vào bài viết</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {['🎵', '🎧', '🎸', '💿'].map(e => (
                    <Pressable key={e} style={composeStyles.toolbarIcon}>
                      <Text style={{ fontSize: 20 }}>{e}</Text>
                    </Pressable>
                ))}
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
  );
};

// ─── Edit Post Modal ───────────────────────────────────────────────────────────

interface EditPostModalProps {
  visible: boolean;
  post: FeedPost | null;
  onClose: () => void;
  onSave: (title: string, caption: string, visibility: 'PUBLIC' | 'PRIVATE' | 'FOLLOWERS_ONLY') => Promise<void>;
}

const EditPostModal = ({ visible, post, onClose, onSave }: EditPostModalProps) => {
  const insets = useSafeAreaInsets();
  const [title, setTitle]     = useState('');
  const [caption, setCaption] = useState('');
  const [vis, setVis]         = useState<'PUBLIC' | 'PRIVATE' | 'FOLLOWERS_ONLY'>('PUBLIC');
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    if (post) {
      setTitle(post.title ?? '');
      setCaption(post.caption ?? '');
      setVis((post.visibility ?? 'PUBLIC') as 'PUBLIC' | 'PRIVATE' | 'FOLLOWERS_ONLY');
    }
  }, [post]);

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(title, caption, vis); }
    finally { setSaving(false); }
  };

  return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[composeStyles.root, { paddingTop: insets.top + 4 }]}>
            <View style={composeStyles.header}>
              <Pressable onPress={onClose} style={composeStyles.cancelBtn}>
                <Text style={composeStyles.cancelText}>Huỷ</Text>
              </Pressable>
              <Text style={composeStyles.headerTitle}>Chỉnh sửa</Text>
              <Pressable
                  style={[composeStyles.postBtn, saving && composeStyles.postBtnDisabled]}
                  onPress={handleSave}
                  disabled={saving}
              >
                {saving
                    ? <ActivityIndicator size="small" color={COLORS.white} />
                    : <Text style={composeStyles.postBtnText}>Lưu</Text>}
              </Pressable>
            </View>
            <View style={composeStyles.divider} />
            <ScrollView style={{ flex: 1, paddingHorizontal: 16 }} keyboardShouldPersistTaps="handled">
              <TextInput
                  style={composeStyles.titleInput}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Tiêu đề..."
                  placeholderTextColor={COLORS.glass25}
                  multiline
                  autoFocus
              />
              <TextInput
                  style={composeStyles.captionInput}
                  value={caption}
                  onChangeText={setCaption}
                  placeholder="Caption..."
                  placeholderTextColor={COLORS.glass20}
                  multiline
              />
              <View style={composeStyles.visRow}>
                <Text style={composeStyles.visLabel}>Hiển thị:</Text>
                {VISIBILITY_OPTIONS.map(opt => (
                    <Pressable
                        key={opt.value}
                        style={[composeStyles.visChip, vis === opt.value && composeStyles.visChipActive]}
                        onPress={() => setVis(opt.value)}
                    >
                      <Text style={composeStyles.visChipIcon}>{opt.icon}</Text>
                      <Text style={[composeStyles.visChipText, vis === opt.value && composeStyles.visChipTextActive]}>
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

// ─── Comment Sheet ─────────────────────────────────────────────────────────────

interface CommentSheetProps {
  visible: boolean;
  post: FeedPost | null;
  comments: Comment[];
  currentUserId: string | null;
  myDisplayName: string | null;
  onClose: () => void;
  onSendComment: (content: string, parentId?: string) => Promise<void>;
  onLikeComment: (c: Comment) => Promise<void>;
  onDeleteComment: (id: string) => Promise<void>;
  onEditComment: (id: string, content: string) => Promise<void>;
}

const CommentSheet: React.FC<CommentSheetProps> = ({
                                                     visible, post, comments, currentUserId, myDisplayName,
                                                     onClose, onSendComment, onLikeComment, onDeleteComment, onEditComment,
                                                   }) => {
  const insets    = useSafeAreaInsets();
  const inputRef  = useRef<TextInput>(null);
  const [text, setText]             = useState('');
  const [sending, setSending]       = useState(false);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editText, setEditText]     = useState('');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [replies, setReplies]       = useState<Record<string, Comment[]>>({});
  const [expandedR, setExpandedR]   = useState<Record<string, boolean>>({});
  const [loadingR, setLoadingR]     = useState<Record<string, boolean>>({});
  const [authorCache, setAuthorCache] = useState<Record<string, string>>({});

  useEffect(() => {
    const missing = comments.filter(c => c.userId && !authorCache[c.userId] && c.userId !== currentUserId);
    if (!missing.length) return;
    const ids = [...new Set(missing.map(c => c.userId))];
    Promise.allSettled(ids.map(async id => {
      const a = await getArtistByUserId(id);
      return { id, name: a?.stageName || id.slice(0, 8) };
    })).then(results => {
      const updates: Record<string, string> = {};
      results.forEach(r => { if (r.status === 'fulfilled' && r.value) updates[r.value.id] = r.value.name; });
      setAuthorCache(prev => ({ ...prev, ...updates }));
    });
  }, [comments]);

  const getDisplayName = (userId: string) => {
    if (userId === currentUserId) return myDisplayName || 'Bạn';
    return authorCache[userId] || userId.slice(0, 8);
  };

  const loadReplies = async (parentId: string) => {
    setLoadingR(p => ({ ...p, [parentId]: true }));
    try {
      const res = await getCommentReplies(parentId, { page: 0, size: 50 });
      setReplies(p => ({ ...p, [parentId]: res.content ?? [] }));
      setExpandedR(p => ({ ...p, [parentId]: true }));
    } catch {}
    finally { setLoadingR(p => ({ ...p, [parentId]: false })); }
  };

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await onSendComment(text.trim(), replyingTo?.id);
      setText('');
      if (replyingTo?.id) await loadReplies(replyingTo.id);
      setReplyingTo(null);
    } finally { setSending(false); }
  };

  const handleEdit = async (id: string, parentId?: string) => {
    if (!editText.trim()) return;
    await onEditComment(id, editText.trim());
    setEditingId(null);
    if (parentId) await loadReplies(parentId);
  };

  const renderComment = (comment: Comment, depth = 0): React.ReactNode => {
    const isOwn = comment.userId === currentUserId;
    const name  = getDisplayName(comment.userId);
    const childReplies = replies[comment.id] ?? [];
    const isExpanded   = expandedR[comment.id];
    const isLoadingR   = loadingR[comment.id];
    const ml = Math.min(depth, 3) * 12;

    return (
        <View key={`${comment.id}-${depth}`} style={{ marginLeft: ml }}>
          <View style={depth === 0 ? commentStyles.row : commentStyles.replyRow}>
            <Avatar id={comment.userId} displayName={name} size={depth === 0 ? 34 : 28} />
            <View style={{ flex: 1, gap: 4 }}>
              {editingId === comment.id ? (
                  <View style={{ gap: 6 }}>
                    <TextInput
                        style={commentStyles.editInput}
                        value={editText}
                        onChangeText={setEditText}
                        autoFocus multiline
                    />
                    <View style={{ flexDirection: 'row', gap: 12, paddingLeft: 4 }}>
                      <Pressable onPress={() => setEditingId(null)}>
                        <Text style={commentStyles.editCancel}>Huỷ</Text>
                      </Pressable>
                      <Pressable onPress={() => void handleEdit(comment.id, comment.parentId)}>
                        <Text style={commentStyles.editSave}>Lưu</Text>
                      </Pressable>
                    </View>
                  </View>
              ) : (
                  <>
                    <View style={commentStyles.bubble}>
                      <Text style={commentStyles.name}>{name}</Text>
                      <Text style={commentStyles.text}>{comment.content}</Text>
                    </View>
                    <View style={commentStyles.meta}>
                      <Text style={commentStyles.time}>{timeAgo(comment.createdAt)}</Text>
                      <Pressable onPress={() => void onLikeComment(comment)} hitSlop={8}>
                        <Text style={[commentStyles.likeBtn, comment.likedByCurrentUser && { color: COLORS.accent }]}>
                          {comment.likedByCurrentUser ? '♥' : '♡'}
                          {comment.likeCount > 0 ? ` ${comment.likeCount}` : ''}
                        </Text>
                      </Pressable>
                      <Pressable onPress={() => { setReplyingTo(comment); setTimeout(() => inputRef.current?.focus(), 50); }} hitSlop={8}>
                        <Text style={commentStyles.action}>Trả lời</Text>
                      </Pressable>
                      {isOwn && (
                          <>
                            <Pressable onPress={() => { setEditingId(comment.id); setEditText(comment.content); }} hitSlop={8}>
                              <Text style={commentStyles.action}>Sửa</Text>
                            </Pressable>
                            <Pressable onPress={async () => { await onDeleteComment(comment.id); if (comment.parentId) await loadReplies(comment.parentId); }} hitSlop={8}>
                              <Text style={[commentStyles.action, { color: COLORS.error }]}>Xoá</Text>
                            </Pressable>
                          </>
                      )}
                    </View>
                    {comment.replyCount > 0 && (
                        <Pressable
                            style={{ paddingLeft: 4 }}
                            onPress={() => isExpanded ? setExpandedR(p => ({ ...p, [comment.id]: false })) : void loadReplies(comment.id)}
                        >
                          <Text style={commentStyles.replyToggle}>
                            {isExpanded ? 'Ẩn trả lời' : `Xem ${comment.replyCount} trả lời`}
                          </Text>
                        </Pressable>
                    )}
                    {isExpanded && (
                        <View style={{ marginTop: 8, gap: 10 }}>
                          {isLoadingR
                              ? <ActivityIndicator color={COLORS.accent} size="small" />
                              : childReplies.map(r => renderComment(r, depth + 1))}
                        </View>
                    )}
                  </>
              )}
            </View>
          </View>
        </View>
    );
  };

  if (!post) return null;

  return (
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <Pressable style={commentStyles.overlay} onPress={onClose} />
        <KeyboardAvoidingView style={commentStyles.kbWrapper} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[commentStyles.sheet, { paddingBottom: insets.bottom }]}>
            <View style={commentStyles.handle} />
            <View style={commentStyles.sheetHeader}>
              <Text style={commentStyles.sheetTitle}>Bình luận</Text>
              <Pressable onPress={onClose} hitSlop={10}>
                <Text style={commentStyles.close}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={{ flex: 1, paddingHorizontal: 16 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {comments.length === 0 && (
                  <Text style={commentStyles.empty}>Hãy là người đầu tiên bình luận!</Text>
              )}
              {comments.map(c => renderComment(c, 0))}
              <View style={{ height: 16 }} />
            </ScrollView>

            {replyingTo && (
                <View style={commentStyles.replyBar}>
                  <Text style={commentStyles.replyBarText}>
                    Đang trả lời {getDisplayName(replyingTo.userId)}
                  </Text>
                  <Pressable onPress={() => { setReplyingTo(null); setText(''); }} hitSlop={8}>
                    <Text style={commentStyles.replyBarCancel}>Huỷ</Text>
                  </Pressable>
                </View>
            )}

            <View style={commentStyles.inputBar}>
              <Avatar id={currentUserId ?? 'anon'} displayName={myDisplayName ?? 'Bạn'} size={32} />
              <View style={commentStyles.inputWrap}>
                <TextInput
                    ref={inputRef}
                    style={commentStyles.input}
                    value={text}
                    onChangeText={setText}
                    placeholder={replyingTo ? `Trả lời ${getDisplayName(replyingTo.userId)}...` : 'Viết bình luận...'}
                    placeholderTextColor={COLORS.glass30}
                    multiline
                    maxLength={500}
                />
              </View>
              <Pressable
                  style={[commentStyles.sendBtn, (!text.trim() || sending) && { opacity: 0.35 }]}
                  onPress={handleSend}
                  disabled={!text.trim() || sending}
              >
                <Ionicons name="send-sharp" color={COLORS.bg} size={22} />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
  );
};

// ─── Post Card ─────────────────────────────────────────────────────────────────

interface PostCardProps {
  post: FeedPost;
  currentUserId: string | null;
  ownerInfo: OwnerInfo;
  contentInfo: PostContentInfo | null;
  likeBusy?: boolean;
  onOpenContent: (c: PostContentInfo) => void;
  onLike: (p: FeedPost) => void;
  onComment: (p: FeedPost) => void;
  onShare: (p: FeedPost) => void;
  onDelete: (p: FeedPost) => void;
  onEdit: (p: FeedPost) => void;
  onViewProfile: (artistId: string) => void;
}

const PostCard: React.FC<PostCardProps> = ({
                                             post, currentUserId, ownerInfo, contentInfo,
                                             likeBusy = false,
                                             onOpenContent, onLike, onComment, onShare, onDelete, onEdit, onViewProfile,
                                           }) => {
  const isOwner = currentUserId === post.ownerId;
  const [menuOpen, setMenuOpen] = useState(false);
  const { playSong } = usePlayer();

  const visBadge = (() => {
    if (post.visibility === 'PRIVATE') return { icon: '🔒', label: tr('screens.discover.private', 'Riêng tư') };
    if (post.visibility === 'FOLLOWERS_ONLY') return { icon: '👥', label: 'Người theo dõi' };
    return { icon: '🌐', label: tr('screens.discover.public', 'Công khai') };
  })();

  const handleNamePress = async () => {
    if (ownerInfo.artistId) { onViewProfile(ownerInfo.artistId); return; }
    try {
      const a = await getArtistByUserId(post.ownerId);
      if (a?.id) onViewProfile(a.id);
      else Alert.alert('Không có hồ sơ nghệ sĩ', 'Người dùng này chưa đăng ký Nghệ sĩ.');
    } catch {}
  };

  return (
      <View style={styles.postCard}>
        {/* Header */}
        <View style={styles.postHeader}>
          <Pressable onPress={() => void handleNamePress()}>
            <Avatar id={post.ownerId} displayName={ownerInfo.displayName} avatarUrl={ownerInfo.avatarUrl} size={42} />
          </Pressable>
          <View style={styles.postMeta}>
            <Pressable onPress={() => void handleNamePress()}>
              <Text style={[styles.postOwner, ownerInfo.artistId && { color: COLORS.accent }]}>
                {ownerInfo.displayName}{ownerInfo.artistId ? ' 🎤' : ''}
              </Text>
            </Pressable>
            <View style={styles.postMetaRow}>
              <Text style={styles.postTime}>{timeAgo(post.createdAt)} trước</Text>
              <Text style={styles.dot}>·</Text>
              <Text style={{ fontSize: 12 }}>
                {post.contentType === 'SONG' ? '🎵' : post.contentType === 'ALBUM' ? '💿' : post.contentType === 'PLAYLIST' ? '📋' : '📝'}
              </Text>
              <Text style={styles.dot}>·</Text>
              <View style={styles.visBadge}>
                <Text style={{ fontSize: 11 }}>{visBadge.icon}</Text>
                <Text style={styles.visText}>{visBadge.label}</Text>
              </View>
            </View>
          </View>
          {isOwner && (
              <Pressable onPress={() => setMenuOpen(v => !v)} hitSlop={10} style={styles.menuBtn}>
                <Text style={styles.menuIcon}>•••</Text>
              </Pressable>
          )}
        </View>

        {menuOpen && isOwner && (
            <View style={styles.menu}>
              <Pressable style={styles.menuItem} onPress={() => { setMenuOpen(false); onEdit(post); }}>
                <FontAwesome name="edit" color={COLORS.accentAlt} size={16} />
                <Text style={styles.menuItemText}>{tr('screens.discover.editPost', 'Chỉnh sửa')}</Text>
              </Pressable>
              <View style={styles.menuDivider} />
              <Pressable style={styles.menuItem} onPress={() => { setMenuOpen(false); onDelete(post); }}>
                <AntDesign name="delete" color={COLORS.error} size={16} />
                <Text style={[styles.menuItemText, { color: COLORS.error }]}>{tr('screens.discover.deletePost', 'Xoá bài viết')}</Text>
              </Pressable>
            </View>
        )}

        {/* Content */}
        <View style={styles.postContent}>
          {post.title   && <Text style={styles.postTitle}>{post.title}</Text>}
          {post.caption && <Text style={styles.postCaption}>{post.caption}</Text>}

          {contentInfo && (
              <Pressable
                  style={styles.contentCard}
                  onPress={() => {
                    if (contentInfo.type === 'SONG') {
                      const s = contentInfo.songs[0];
                      if (s) playSong(s, contentInfo.songs);
                    } else {
                      onOpenContent(contentInfo);
                    }
                  }}
              >
                <View style={styles.contentHeader}>
                  <Image
                      source={{ uri: contentInfo.coverUrl || post.coverImageUrl || 'https://via.placeholder.com/80' }}
                      style={styles.contentCover}
                  />
                  <View style={styles.contentMeta}>
                    <Text style={styles.contentTitle} numberOfLines={1}>{contentInfo.title}</Text>
                    {contentInfo.subtitle ? <Text style={styles.contentSub} numberOfLines={1}>{contentInfo.subtitle}</Text> : null}
                    <Text style={styles.contentBadge}>
                      {contentInfo.type === 'SONG' ? 'Bài hát' : contentInfo.type === 'ALBUM' ? 'Album' : 'Playlist'}
                      {contentInfo.totalCount ? ` · ${contentInfo.totalCount} bài` : ''}
                    </Text>
                    {contentInfo.ownerName && (
                        <Text style={styles.contentOwner} numberOfLines={1}>bởi {contentInfo.ownerName}</Text>
                    )}
                  </View>
                </View>

                {contentInfo.songs.length > 0 && (
                    <View style={styles.contentTracks}>
                      {(contentInfo.type === 'SONG' ? contentInfo.songs : contentInfo.songs.slice(0, 3)).map((s, i) => (
                          <Pressable
                              key={`${s.id}-${i}`}
                              style={styles.trackRow}
                              onPress={() => {
                                if (contentInfo.type === 'ALBUM' || contentInfo.type === 'PLAYLIST') {
                                  onOpenContent(contentInfo);
                                  return;
                                }
                                playSong(s, contentInfo.songs);
                              }}
                          >
                            <View style={{ flex: 1 }}>
                              <Text style={styles.trackTitle} numberOfLines={1}>{s.title}</Text>
                              <Text style={styles.trackArtist} numberOfLines={1}>{s.primaryArtist?.stageName}</Text>
                            </View>
                            {contentInfo.type === 'SONG' && <Text style={styles.trackPlay}>▶</Text>}
                          </Pressable>
                      ))}
                      {(contentInfo.type === 'ALBUM' || contentInfo.type === 'PLAYLIST') && (contentInfo.totalCount ?? 0) > 3 && (
                          <Pressable onPress={() => onOpenContent(contentInfo)}>
                            <Text style={styles.trackMore}>+{(contentInfo.totalCount ?? 0) - 3} bài khác · Xem tất cả ›</Text>
                          </Pressable>
                      )}
                    </View>
                )}
              </Pressable>
          )}
        </View>

        {/* Stats */}
        {(post.likeCount > 0 || post.commentCount > 0) && (
            <View style={styles.postStats}>
              {post.likeCount > 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={styles.likeDot}><Text style={{ fontSize: 10 }}>♥</Text></View>
                    <Text style={styles.statText}>{post.likeCount}</Text>
                  </View>
              )}
              {post.commentCount > 0 && (
                  <Text style={styles.statText}>{post.commentCount} bình luận</Text>
              )}
            </View>
        )}

        <View style={styles.postDivider} />

        {/* Actions */}
        <View style={styles.postActions}>
          <ActionBtn
              icon={post.likedByCurrentUser ? '♥' : '♡'}
              label={post.likeCount}
              active={post.likedByCurrentUser}
              onPress={() => !likeBusy && onLike(post)}
              isLikeBtn={true}
          />
          <ActionBtn
              icon={<FontAwesome name="commenting-o" color={'rgba(255,255,255,0.5)'} size={18} />}
              label={post.commentCount}
              onPress={() => onComment(post)}
          />
          <ActionBtn icon="↗" label={post.shareCount} onPress={() => onShare(post)} />
        </View>
      </View>
  );
};

// ─── Main Screen ───────────────────────────────────────────────────────────────

export const DiscoverScreen = () => {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { t }      = useTranslation();
  const themeColors = useThemeColors();
  tr = t;
  rc = themeColors;

  const { authSession } = useAuth();
  const currentUserId   = authSession?.profile?.id ?? null;
  const myDisplayName   = authSession?.profile?.displayName ?? authSession?.profile?.fullName ?? authSession?.profile?.email ?? null;
  const myAvatarUrl     = authSession?.profile?.avatarUrl;
  const [canManageAlbums, setCanManageAlbums] = useState(false);

  type FeedTab = 'for_you' | 'following';
  const [feedTab, setFeedTab] = useState<FeedTab>('for_you');

  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [posting, setPosting]     = useState(false);
  const [posts, setPosts]         = useState<FeedPost[]>([]);
  const postsSignatureRef = useRef('');
  const [likePendingIds, setLikePendingIds] = useState<Record<string, boolean>>({});
  const likePendingRef = useRef<Set<string>>(new Set());
  const likeSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Owner info cache
  const [ownerCache, setOwnerCache] = useState<Record<string, OwnerInfo>>({});
  const ownerCacheRef = useRef<Record<string, OwnerInfo>>({});

  // Content cache
  const [contentCache, setContentCache]   = useState<Record<string, PostContentInfo>>({});
  const contentLoadingRef = useRef<Set<string>>(new Set());

  // Modals
  const [composeOpen, setComposeOpen]     = useState(false);
  const [editingPost, setEditingPost]     = useState<FeedPost | null>(null);
  const [commentPost, setCommentPost]     = useState<FeedPost | null>(null);
  const [comments, setComments]           = useState<Comment[]>([]);
  const [openedContent, setOpenedContent] = useState<PostContentInfo | null>(null);

  // Seeding current user's owner info
  useEffect(() => {
    if (!currentUserId || !myDisplayName) return;
    const mine: OwnerInfo = { displayName: myDisplayName, artistId: null, avatarUrl: myAvatarUrl ?? undefined };
    ownerCacheRef.current[currentUserId] = mine;
    setOwnerCache(p => ({ ...p, [currentUserId]: mine }));
  }, [currentUserId, myDisplayName, myAvatarUrl]);

  useEffect(() => {
    let mounted = true;
    if (!currentUserId) {
      setCanManageAlbums(false);
      return;
    }
    getArtistByUserId(currentUserId)
        .then(artist => {
          if (mounted) setCanManageAlbums(!!artist?.id);
        })
        .catch(() => {
          if (mounted) setCanManageAlbums(false);
        });
    return () => { mounted = false; };
  }, [currentUserId]);

  // Fetch owner info for posts
  const fetchOwnerInfos = useCallback(async (newPosts: FeedPost[]) => {
    const toFetch = newPosts.filter(p => !ownerCacheRef.current[p.ownerId]);
    const ids = [...new Set(toFetch.map(p => p.ownerId))];
    if (!ids.length) return;

    const results = await Promise.allSettled(ids.map(id => getArtistByUserId(id)));
    const updates: Record<string, OwnerInfo> = {};
    ids.forEach((id, i) => {
      const res = results[i];
      if (res.status === 'fulfilled' && res.value) {
        updates[id] = { displayName: res.value.stageName || id, artistId: res.value.id, avatarUrl: res.value.avatarUrl };
      } else {
        // If the post was created by a normal USER, backend can embed display name/email for nicer rendering.
        const embedded = toFetch.find(p => p.ownerId === id && p.ownerType === 'USER')?.ownerDisplayName;
        const embeddedAvatar = toFetch.find(p => p.ownerId === id && p.ownerType === 'USER')?.ownerAvatarUrl;
        updates[id] = {
          displayName: embedded || (id === currentUserId ? myDisplayName ?? `User ${id.slice(0, 6)}` : `User ${id.slice(0, 6)}`),
          artistId: null,
          avatarUrl: embeddedAvatar ?? undefined,
        };
      }
    });
    ownerCacheRef.current = { ...ownerCacheRef.current, ...updates };
    setOwnerCache(p => ({ ...p, ...updates }));
  }, [currentUserId, myDisplayName]);

  // Fetch content for each post
  const loadContentForPost = useCallback(async (post: FeedPost) => {
    if (!post.contentId) return;
    const key = `${post.id}:${post.contentType}:${post.contentId}`;
    if (contentCache[key] || contentLoadingRef.current.has(key)) return;

    contentLoadingRef.current.add(key);
    try {
      // Resolve ownerName from ownerCache
      const owner = ownerCacheRef.current[post.ownerId];

      if (post.contentType === 'SONG') {
        const song = await getSongById(post.contentId);
        setContentCache(p => ({
          ...p,
          [key]: {
            type: 'SONG', id: song.id,
            title: song.title,
            subtitle: song.primaryArtist?.stageName,
            coverUrl: song.thumbnailUrl,
            songs: [song], totalCount: 1,
            ownerName: owner?.displayName,
          },
        }));
        return;
      }

      if (post.contentType === 'ALBUM') {
        let album = null;
        try { album = await getAlbumById(post.contentId); }
        catch { if (post.ownerId === currentUserId) album = await getMyAlbumById(post.contentId); }
        if (!album) throw new Error('not found');
        setContentCache(p => ({
          ...p,
          [key]: {
            type: 'ALBUM', id: album.id,
            title: album.title, subtitle: album.description,
            coverUrl: album.coverUrl,
            songs: (album.songs ?? []) as Song[],
            totalCount: album.songs?.length,
            ownerName: album.ownerStageName ?? owner?.displayName,
          },
        }));
        return;
      }

      if (post.contentType === 'PLAYLIST') {
        let playlist = null;
        try { playlist = await getPlaylistById(post.contentId); }
        catch {
          try { playlist = await getPlaylistBySlug(post.contentId); }
          catch { throw new Error('not found'); }
        }
        if (!playlist) throw new Error('not found');

        const pSongs = playlist.songs ?? [];
        const ids = pSongs.map(s => s.songId).filter(Boolean) as string[];
        let songs: Song[] = [];
        if (ids.length) {
          try { songs = await getSongsByIds(ids.slice(0, 50)); }
          catch { songs = []; }
        }
        if (!songs.length) {
          songs = pSongs.map(s => ({
            id: s.songId || s.playlistSongId,
            title: s.title,
            primaryArtist: { artistId: s.artistId || '', stageName: s.artistStageName || 'Nghệ sĩ' },
            genres: [], durationSeconds: s.durationSeconds || 0, playCount: 0,
            status: 'PUBLIC', transcodeStatus: 'COMPLETED',
            thumbnailUrl: s.thumbnailUrl, createdAt: '', updatedAt: '',
          }));
        }
        setContentCache(p => ({
          ...p,
          [key]: {
            type: 'PLAYLIST', id: playlist.id, slug: playlist.slug,
            title: playlist.name, subtitle: playlist.description,
            coverUrl: playlist.coverUrl, songs,
            totalCount: playlist.totalSongs ?? pSongs.length,
            ownerName: owner?.displayName,
          },
        }));
      }
    } catch {
      setContentCache(p => ({
        ...p,
        [key]: { type: post.contentType as any, id: post.contentId ?? key, title: post.title ?? 'Nội dung', songs: [] },
      }));
    } finally {
      contentLoadingRef.current.delete(key);
    }
  }, [contentCache, currentUserId]);

  const getOwnerInfo = useCallback((post: FeedPost): OwnerInfo =>
          ownerCache[post.ownerId] ?? {
            displayName: post.ownerId === currentUserId ? myDisplayName ?? `User ${post.ownerId.slice(0, 6)}` : `User ${post.ownerId.slice(0, 6)}`,
            artistId: null,
          }
      , [ownerCache, currentUserId, myDisplayName]);

  const getContentInfo = useCallback((post: FeedPost): PostContentInfo | null => {
    if (!post.contentId) return null;
    return contentCache[`${post.id}:${post.contentType}:${post.contentId}`] ?? null;
  }, [contentCache]);

  const loadContentForPostRef = useRef(loadContentForPost);
  loadContentForPostRef.current = loadContentForPost;

  // Load feed
  const loadFeed = useCallback(async (mode: 'initial' | 'refresh' | 'silent' = 'initial') => {
    try {
      if (mode === 'initial')  setLoading(true);
      if (mode === 'refresh')  setRefreshing(true);
      const isFollowingFeed = feedTab === 'following' && !!currentUserId;

      const [data, followed] = await Promise.all([
        isFollowingFeed
          ? getTimeline({ page: 0, size: 30 })
          : getPublicFeed({ page: 0, size: 30 }),
        isFollowingFeed
          ? getMyFollowedArtists({ page: 0, size: 200 }).catch(() => null)
          : Promise.resolve(null),
      ]);

      const newPosts = data.content ?? [];
      let filteredPosts = newPosts;

      // Nếu user chưa follow ai, không show "famous" trong tab Đang theo dõi (đúng kỳ vọng UX)
      if (isFollowingFeed && followed) {
        const ids = new Set((followed.content ?? []).map((f) => f.artistId));
        filteredPosts = ids.size === 0
          ? newPosts.filter((p) => p.ownerId === currentUserId)
          : newPosts.filter((p) => p.ownerId === currentUserId || ids.has(p.ownerId));
      }
      const nextSignature = filteredPosts
          .map(p =>
              [
                p.id,
                p.visibility,
                p.title ?? '',
                p.caption ?? '',
                p.likeCount ?? 0,
                p.commentCount ?? 0,
                p.shareCount ?? 0,
                p.likedByCurrentUser ? '1' : '0',
                p.createdAt ?? '',
              ].join('|'),
          )
          .join('||');

      if (postsSignatureRef.current !== nextSignature) {
        postsSignatureRef.current = nextSignature;
        setPosts(filteredPosts);
        void fetchOwnerInfos(filteredPosts);
      }
    } catch {
      if (mode !== 'silent') setPosts([]);
    } finally {
      if (mode === 'initial')  setLoading(false);
      if (mode === 'refresh')  setRefreshing(false);
    }
  }, [fetchOwnerInfos, currentUserId, feedTab]);

  const handleTabChange = useCallback((nextTab: FeedTab) => {
    setFeedTab((prev) => (prev === nextTab ? prev : nextTab));
  }, []);

  useEffect(() => {
    loadFeed('initial');
    const id = setInterval(() => loadFeed('silent'), 20_000);
    return () => clearInterval(id);
  }, [loadFeed]);

  useFocusEffect(useCallback(() => {
    void loadFeed('silent');
    const unsubscribe = subscribeFeedUpdates(() => { void loadFeed('silent'); });
    return unsubscribe;
  }, [loadFeed]));

  /** Tải metadata từng bài theo lô — tránh 20–30 request song song làm chậm mạng / JS thread */
  useEffect(() => {
    let cancelled = false;
    const BATCH = 4;
    let i = 0;
    const step = () => {
      if (cancelled) return;
      const slice = posts.slice(i, i + BATCH);
      i += BATCH;
      slice.forEach((p) => { void loadContentForPostRef.current(p); });
      if (i < posts.length) {
        setTimeout(step, 40);
      }
    };
    if (posts.length) step();
    return () => { cancelled = true; };
  }, [posts]);

  // Actions
  const handleCreatePost = async (title: string, caption: string, visibility: 'PUBLIC' | 'PRIVATE' | 'FOLLOWERS_ONLY') => {
    setPosting(true);
    try {
      await createFeedPost({
        visibility,
        title,
        caption: caption || undefined,
        ownerDisplayName: myDisplayName ?? undefined,
        ownerAvatarUrl: myAvatarUrl ?? null,
      });
      setComposeOpen(false);
      await loadFeed('silent');
      notifyFeedUpdated();
    } catch (e: any) {
      Alert.alert('Không thể đăng', e?.message ?? 'Vui lòng thử lại.');
    } finally { setPosting(false); }
  };

  const handleLike = async (post: FeedPost) => {
    if (likePendingRef.current.has(post.id)) return;
    likePendingRef.current.add(post.id);
    setLikePendingIds(prev => ({ ...prev, [post.id]: true }));

    const wasLiked = !!post.likedByCurrentUser;
    // Optimistic toggle so heart button updates immediately.
    setPosts(prev => prev.map(p => {
      if (p.id !== post.id) return p;
      const nextLiked = !wasLiked;
      const currentCount = Number(p.likeCount ?? 0);
      return {
        ...p,
        likedByCurrentUser: nextLiked,
        likeCount: Math.max(0, currentCount + (nextLiked ? 1 : -1)),
      };
    }));

    try {
      if (wasLiked) await unlikeFeedPost(post.id);
      else await likeFeedPost(post.id);
    } catch (e: any) {
      const rawMessage = String(e?.response?.data?.message || e?.message || '').toLowerCase();
      // Backend can be slightly stale; recover by applying idempotent opposite call.
      try {
        if (!wasLiked && rawMessage.includes('already liked')) {
          await unlikeFeedPost(post.id);
          setPosts(prev => prev.map(p => p.id === post.id ? {
            ...p,
            likedByCurrentUser: false,
            likeCount: Math.max(0, Number(p.likeCount ?? 0) - 1),
          } : p));
        } else if (wasLiked && (rawMessage.includes('not liked') || rawMessage.includes('not yet liked'))) {
          await likeFeedPost(post.id);
          setPosts(prev => prev.map(p => p.id === post.id ? {
            ...p,
            likedByCurrentUser: true,
            likeCount: Number(p.likeCount ?? 0) + 1,
          } : p));
        } else {
          throw e;
        }
      } catch (inner: any) {
        // Rollback optimistic update on unrecoverable failure.
        setPosts(prev => prev.map(p => {
          if (p.id !== post.id) return p;
          const currentCount = Number(p.likeCount ?? 0);
          return {
            ...p,
            likedByCurrentUser: wasLiked,
            likeCount: Math.max(0, currentCount + (wasLiked ? 1 : -1)),
          };
        }));
        Alert.alert('Lỗi', inner?.response?.data?.message || inner?.message || 'Không thể cập nhật lượt thích');
      }
    } finally {
      likePendingRef.current.delete(post.id);
      setLikePendingIds(prev => {
        const next = { ...prev };
        delete next[post.id];
        return next;
      });
      // Debounced background sync to avoid visible flicker after every tap.
      if (likeSyncTimeoutRef.current) clearTimeout(likeSyncTimeoutRef.current);
      likeSyncTimeoutRef.current = setTimeout(() => {
        void loadFeed('silent');
      }, 1200);
    }
  };

  useEffect(() => {
    return () => {
      if (likeSyncTimeoutRef.current) clearTimeout(likeSyncTimeoutRef.current);
    };
  }, []);

  const handleShare = (post: FeedPost) => {
    Share.share({ message: `${post.title ?? 'Bài viết âm nhạc'}\nhttps://phazelsound.oopsgolden.id.vn/feed/${post.id}` });
  };

  const handleDelete = (post: FeedPost) => {
    Alert.alert('Xoá bài viết?', 'Không thể hoàn tác.', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'), style: 'destructive',
        onPress: async () => {
          try {
            await deleteFeedPost(post.id);
            setPosts(p => p.filter(x => x.id !== post.id));
            notifyFeedUpdated();
          } catch (e: any) {
            Alert.alert(t('screens.discover.cannotDeletePost', 'Không thể xoá'), e?.response?.data?.message || e?.message || 'Thử lại');
          }
        },
      },
    ]);
  };

  const handleSaveEdit = async (title: string, caption: string, visibility: 'PUBLIC' | 'PRIVATE' | 'FOLLOWERS_ONLY') => {
    if (!editingPost) return;
    await updateFeedPost(editingPost.id, { visibility, title: title.trim(), caption: caption.trim() || undefined });
    setEditingPost(null);
    await loadFeed('silent');
    notifyFeedUpdated();
  };

  const openComments = async (post: FeedPost) => {
    setCommentPost(post);
    try {
      const data = await getPostComments(post.id, { page: 0, size: 50 });
      setComments(data.content ?? []);
    } catch { setComments([]); }
  };

  const reloadComments = async () => {
    if (!commentPost) return;
    try {
      const data = await getPostComments(commentPost.id, { page: 0, size: 50 });
      setComments(data.content ?? []);
      await loadFeed('silent');
    } catch {}
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
      <View style={styles.root}>
        <StatusBar style="light" />

        <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => loadFeed('refresh')} tintColor={COLORS.accent} />
            }
            contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* Header */}
          <LinearGradient
              colors={[themeColors.gradNavy, themeColors.bg]}
              style={[styles.header, { paddingTop: insets.top + 16 }]}
          >
            <View style={styles.headerRow}>
              <Text style={styles.headerTitle}>{t('screens.discover.title', 'Khám phá')}</Text>
              <View style={styles.liveBadge}>
                <Text style={styles.liveBadgeText}>LIVE</Text>
              </View>
            </View>
            <Text style={styles.headerSub}>
              {t('screens.discover.communityLabel', 'Cộng đồng âm nhạc')} · {posts.length} {t('screens.discover.posts', 'bài đăng')}
            </Text>

            {/* Feed tabs */}
            <View style={styles.tabBar}>
              <Pressable
                  style={[styles.tab, feedTab === 'for_you' && styles.tabActive]}
                  onPress={() => handleTabChange('for_you')}
              >
                <Text style={[styles.tabText, feedTab === 'for_you' && styles.tabTextActive]}>
                  Dành cho bạn
                </Text>
              </Pressable>
              <Pressable
                  style={[styles.tab, feedTab === 'following' && styles.tabActive]}
                  onPress={() => handleTabChange('following')}
                  disabled={!currentUserId}
              >
                <Text style={[styles.tabText, feedTab === 'following' && styles.tabTextActive, !currentUserId && { opacity: 0.6 }]}>
                  Đang theo dõi
                </Text>
              </Pressable>
            </View>
            {feedTab === 'following' && !currentUserId ? (
                <Text style={styles.tabHint}>Đăng nhập để xem bài từ người bạn theo dõi</Text>
            ) : null}
          </LinearGradient>

          {/* Composer bar */}
          <View style={styles.composerBar}>
            <Avatar id={currentUserId ?? 'guest'} displayName={myDisplayName ?? 'guest'} avatarUrl={myAvatarUrl} size={40} />
            <Pressable style={styles.composerInput} onPress={() => setComposeOpen(true)}>
              <Text style={styles.composerPlaceholder}>
                {t('screens.discover.composerPlaceholder', 'Bạn đang nghĩ gì về âm nhạc?')}
              </Text>
            </Pressable>
            <Pressable style={styles.composerIconBtn} onPress={() => setComposeOpen(true)}>
              <Text style={{ fontSize: 18 }}>🎵</Text>
            </Pressable>
          </View>

          <View style={styles.feedDivider} />

          {loading ? (
              <View style={styles.loadingWrap}>
                <SectionSkeleton rows={4} />
                <ActivityIndicator color={COLORS.accent} style={{ marginTop: 16 }} />
              </View>
          ) : posts.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyEmoji}>🎵</Text>
                <Text style={styles.emptyTitle}>{t('screens.discover.noPosts', 'Chưa có bài đăng')}</Text>
                <Text style={styles.emptySub}>{t('screens.discover.beFirstToShare', 'Hãy là người đầu tiên!')}</Text>
                <Pressable style={styles.emptyBtn} onPress={() => setComposeOpen(true)}>
                  <Text style={styles.emptyBtnText}>{t('screens.discover.createPost', 'Tạo bài viết')}</Text>
                </Pressable>
              </View>
          ) : (
              posts.map(post => (
                  <PostCard
                      key={post.id}
                      post={post}
                      currentUserId={currentUserId}
                      ownerInfo={getOwnerInfo(post)}
                      contentInfo={getContentInfo(post)}
                      likeBusy={!!likePendingIds[post.id]}
                      onOpenContent={setOpenedContent}
                      onLike={handleLike}
                      onComment={openComments}
                      onShare={handleShare}
                      onDelete={handleDelete}
                      onEdit={setEditingPost}
                      onViewProfile={id => navigation.navigate('ArtistProfile', { artistId: id })}
                  />
              ))
          )}
        </ScrollView>

        {/* Modals */}
        <ComposeModal
            visible={composeOpen}
            userId={currentUserId ?? 'guest'}
            displayName={myDisplayName}
            onClose={() => setComposeOpen(false)}
            onPost={handleCreatePost}
            posting={posting}
        />

        <EditPostModal
            visible={!!editingPost}
            post={editingPost}
            onClose={() => setEditingPost(null)}
            onSave={handleSaveEdit}
        />

        <CommentSheet
            visible={!!commentPost}
            post={commentPost}
            comments={comments}
            currentUserId={currentUserId}
            myDisplayName={myDisplayName}
            onClose={() => setCommentPost(null)}
            onSendComment={async (content, parentId) => {
              if (!commentPost) return;
              await createPostComment({ postId: commentPost.id, content, parentId });
              await reloadComments();
            }}
            onLikeComment={async c => {
              if (c.likedByCurrentUser) await unlikeComment(c.id);
              else await likeComment(c.id);
              await reloadComments();
            }}
            onDeleteComment={async id => { await deleteComment(id); await reloadComments(); }}
            onEditComment={async (id, content) => { await updateComment(id, content); await reloadComments(); }}
        />

        <SharedContentDetailModal
            visible={!!openedContent}
            content={openedContent}
            canManageAlbums={canManageAlbums}
            onClose={() => setOpenedContent(null)}
        />
      </View>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: COLORS.white, fontWeight: '700' },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { color: COLORS.white, fontSize: 26, fontWeight: '800' },
  liveBadge: { backgroundColor: COLORS.error, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  liveBadgeText: { color: COLORS.white, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  headerSub: { color: COLORS.glass40, fontSize: 13, marginTop: 4 },
  tabBar: { flexDirection: 'row', backgroundColor: COLORS.surfaceLow, borderRadius: 12, padding: 3, marginTop: 12, borderWidth: 1, borderColor: COLORS.glass10 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: COLORS.accentFill20, borderWidth: 1, borderColor: COLORS.accentBorder25 },
  tabText: { color: COLORS.glass45, fontSize: 13, fontWeight: '700' },
  tabTextActive: { color: COLORS.accent },
  tabHint: { color: COLORS.glass35, fontSize: 11, marginTop: 6 },
  composerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  composerInput: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.glass10 },
  composerPlaceholder: { color: COLORS.glass35, fontSize: 14 },
  composerIconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.glass10, alignItems: 'center', justifyContent: 'center' },
  feedDivider: { height: 6, backgroundColor: COLORS.surface, borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.glass06 },
  loadingWrap: { paddingVertical: 48, alignItems: 'center' },
  emptyWrap: { paddingVertical: 64, alignItems: 'center', paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { color: COLORS.white, fontSize: 18, fontWeight: '700', marginBottom: 6 },
  emptySub: { color: COLORS.glass40, fontSize: 14, textAlign: 'center', marginBottom: 20 },
  emptyBtn: { backgroundColor: COLORS.accentDim, borderRadius: 999, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnText: { color: COLORS.white, fontWeight: '700' },
  // Post card
  postCard: { backgroundColor: COLORS.bg, borderBottomWidth: 6, borderBottomColor: COLORS.surface, paddingVertical: 12 },
  postHeader: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, marginBottom: 10, gap: 10 },
  postMeta: { flex: 1 },
  postOwner: { color: COLORS.white, fontWeight: '700', fontSize: 14, lineHeight: 18 },
  postMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  postTime: { color: COLORS.glass40, fontSize: 12 },
  dot: { color: COLORS.glass25, fontSize: 12 },
  visBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.glass08, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  visText: { color: COLORS.glass40, fontSize: 11, fontWeight: '600' },
  menuBtn: { paddingHorizontal: 6, paddingVertical: 4 },
  menuIcon: { color: COLORS.glass50, fontSize: 13, letterSpacing: 1, fontWeight: '700' },
  menu: { marginHorizontal: 16, marginBottom: 8, backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.glass10, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  menuItemText: { color: COLORS.white, fontSize: 14, fontWeight: '500' },
  menuDivider: { height: 1, backgroundColor: COLORS.glass06 },
  postContent: { paddingHorizontal: 16, marginBottom: 10 },
  postTitle: { color: COLORS.white, fontSize: 15, fontWeight: '700', lineHeight: 21, marginBottom: 4 },
  postCaption: { color: COLORS.glass80, fontSize: 14, lineHeight: 20 },
  contentCard: { marginTop: 10, borderRadius: 14, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.glass08, padding: 10, gap: 10 },
  contentHeader: { flexDirection: 'row', gap: 10 },
  contentCover: { width: 68, height: 68, borderRadius: 12, backgroundColor: COLORS.glass06 },
  contentMeta: { flex: 1, gap: 3, justifyContent: 'center' },
  contentTitle: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  contentSub: { color: COLORS.glass70, fontSize: 12 },
  contentBadge: { color: COLORS.accent, fontSize: 12, fontWeight: '700' },
  contentOwner: { color: COLORS.glass45, fontSize: 11 },
  contentTracks: { gap: 6 },
  trackRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6, paddingVertical: 6, backgroundColor: COLORS.surfaceLow, borderRadius: 10 },
  trackTitle: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  trackArtist: { color: COLORS.glass60, fontSize: 12, marginTop: 2 },
  trackPlay: { color: COLORS.accent, fontSize: 14, fontWeight: '800' },
  trackMore: { color: COLORS.accent, fontSize: 12, marginLeft: 6, paddingVertical: 4, fontWeight: '600' },
  postStats: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 },
  likeDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
  statText: { color: COLORS.glass45, fontSize: 12 },
  postDivider: { height: 1, backgroundColor: COLORS.glass06, marginHorizontal: 16, marginBottom: 4 },

  // ─── Actions patches applied ───
  postActions: { flexDirection: 'row', paddingHorizontal: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 5,
    borderRadius: 8
  },
  likeWrap: {},
  likeWrapActive: {},
  likeEmoji: {
    fontSize: 20,
    color: '#FF4081'
  },
  actionIcon: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 18
  },
  actionLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '500'
  },
  labelLiked: {
    color: '#FF4081',
    fontWeight: '700'
  },
});

// ─── Detail modal styles ───────────────────────────────────────────────────────

const detailStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: COLORS.glass08 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4, paddingVertical: 6 },
  backText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  saveBtn: { backgroundColor: COLORS.accentDim, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  saveBtnText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  body: { paddingHorizontal: 18, paddingBottom: 34, paddingTop: 14 },
  cover: { width: 200, height: 200, borderRadius: 14, alignSelf: 'center', marginBottom: 14, backgroundColor: COLORS.glass08 },
  typeBadge: { alignSelf: 'center', backgroundColor: COLORS.accentFill20, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: COLORS.accentBorder25, marginBottom: 8 },
  typeText: { color: COLORS.accent, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { color: COLORS.white, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: COLORS.glass70, fontSize: 14, textAlign: 'center', marginTop: 4 },
  owner: { color: COLORS.glass50, fontSize: 13, textAlign: 'center', marginTop: 6 },
  count: { color: COLORS.glass40, fontSize: 12, textAlign: 'center', marginTop: 4, marginBottom: 18 },
  tracks: { gap: 8 },
  trackRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: COLORS.glass08 },
  trackRowActive: { backgroundColor: COLORS.accentFill20, borderWidth: 1, borderColor: COLORS.accentBorder25 },
  trackNum: { color: COLORS.glass60, width: 20, textAlign: 'center', fontWeight: '700' },
  trackInfo: { flex: 1 },
  trackTitle: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  trackArtist: { color: COLORS.glass60, fontSize: 12, marginTop: 2 },
  empty: { color: COLORS.glass45, fontSize: 14, textAlign: 'center', paddingVertical: 24 },
});

// ─── Save modal styles ─────────────────────────────────────────────────────────

const saveStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: COLORS.scrim },
  sheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: '85%', borderWidth: 1, borderBottomWidth: 0, borderColor: COLORS.glass12 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.glass20, alignSelf: 'center', marginBottom: 14 },
  title: { color: COLORS.white, fontSize: 17, fontWeight: '700', marginBottom: 10 },
  sourceBadge: { backgroundColor: COLORS.glass07, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10, borderWidth: 1, borderColor: COLORS.glass10 },
  sourceText: { color: COLORS.glass70, fontSize: 12, lineHeight: 17 },
  lockedNotice: { backgroundColor: COLORS.glass08, borderWidth: 1, borderColor: COLORS.glass12, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10 },
  lockedNoticeText: { color: COLORS.glass50, fontSize: 12, lineHeight: 17 },
  // Tab bar
  tabBar: { flexDirection: 'row', backgroundColor: COLORS.surfaceLow, borderRadius: 10, padding: 3, marginBottom: 10 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: COLORS.accentFill20, borderWidth: 1, borderColor: COLORS.accentBorder25 },
  tabText: { color: COLORS.glass45, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: COLORS.accent },
  tabHint: { color: COLORS.glass35, fontSize: 11, textAlign: 'center', marginBottom: 6 },
  // List
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, gap: 12, borderBottomWidth: 1, borderBottomColor: COLORS.glass06 },
  rowIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.glass08, alignItems: 'center', justifyContent: 'center' },
  rowName: { color: COLORS.white, fontSize: 14, fontWeight: '500' },
  rowCount: { color: COLORS.glass40, fontSize: 12, marginTop: 2 },
  addIcon: { color: COLORS.accent, fontSize: 22, fontWeight: '300' },
  empty: { color: COLORS.glass40, textAlign: 'center', paddingVertical: 16 },
  createSection: { marginTop: 10, backgroundColor: COLORS.glass07, borderRadius: 12, borderWidth: 1, borderColor: COLORS.glass10, padding: 10 },
  createLabel: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
  createHint: { color: COLORS.glass45, fontSize: 11, marginTop: 2 },
  newRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  input: { flex: 1, backgroundColor: COLORS.surfaceLow, borderWidth: 1, borderColor: COLORS.glass15, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, color: COLORS.white, fontSize: 14 },
  newBtn: { minWidth: 56, height: 44, borderRadius: 10, paddingHorizontal: 12, backgroundColor: COLORS.accentDim, alignItems: 'center', justifyContent: 'center' },
  newBtnText: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
  inputMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  inputMetaText: { color: COLORS.glass35, fontSize: 11 },
  inputMetaError: { color: COLORS.error },
  closeBtn: { marginTop: 10, paddingVertical: 13, alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.glass08 },
  closeBtnText: { color: COLORS.glass60, fontSize: 15 },
});

// ─── Compose modal styles ──────────────────────────────────────────────────────

const composeStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  cancelBtn: { minWidth: 48 },
  cancelText: { color: COLORS.glass60, fontSize: 15 },
  headerTitle: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  postBtn: { backgroundColor: COLORS.accentDim, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 8, minWidth: 64, alignItems: 'center', justifyContent: 'center' },
  postBtnDisabled: { opacity: 0.35 },
  postBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  divider: { height: 1, backgroundColor: COLORS.glass08 },
  userRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  userName: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  visBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, backgroundColor: COLORS.glass08, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', borderWidth: 1, borderColor: COLORS.glass12 },
  visIcon: { fontSize: 11 },
  visText: { color: COLORS.glass60, fontSize: 12, fontWeight: '600' },
  titleInput: { color: COLORS.white, fontSize: 20, fontWeight: '700', lineHeight: 28, minHeight: 60, textAlignVertical: 'top' },
  captionInput: { color: COLORS.glass70, fontSize: 16, lineHeight: 24, minHeight: 100, textAlignVertical: 'top', marginTop: 4 },
  visRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, paddingVertical: 16, borderTopWidth: 1, borderTopColor: COLORS.glass08, marginTop: 12 },
  visLabel: { color: COLORS.glass50, fontSize: 13, fontWeight: '600', marginRight: 4 },
  visChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: COLORS.glass08, borderWidth: 1, borderColor: COLORS.glass12 },
  visChipActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accentFill20 },
  visChipIcon: { fontSize: 13 },
  visChipText: { color: COLORS.glass60, fontSize: 12, fontWeight: '600' },
  visChipTextActive: { color: COLORS.accent },
  toolbar: { borderTopWidth: 1, borderTopColor: COLORS.glass08, paddingHorizontal: 16, paddingTop: 12 },
  toolbarLabel: { color: COLORS.glass40, fontSize: 12, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 },
  toolbarIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.glass10, alignItems: 'center', justifyContent: 'center' },
});

// ─── Comment styles ────────────────────────────────────────────────────────────

const commentStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: COLORS.scrim },
  kbWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0, maxHeight: '85%' },
  sheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '100%', minHeight: 400 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.glass20, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.glass08 },
  sheetTitle: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  close: { color: COLORS.glass40, fontSize: 16 },
  empty: { color: COLORS.glass35, fontSize: 14, textAlign: 'center', paddingVertical: 32 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  replyRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  bubble: { backgroundColor: COLORS.surfaceLow, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  name: { color: COLORS.white, fontSize: 12, fontWeight: '700', marginBottom: 2 },
  text: { color: COLORS.glass85, fontSize: 14, lineHeight: 19 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 4 },
  time: { color: COLORS.glass35, fontSize: 11 },
  likeBtn: { color: COLORS.glass45, fontSize: 12, fontWeight: '600' },
  action: { color: COLORS.glass45, fontSize: 12, fontWeight: '600' },
  replyToggle: { color: COLORS.accent, fontSize: 12, fontWeight: '600' },
  editInput: { backgroundColor: COLORS.surfaceLow, borderRadius: 12, padding: 10, color: COLORS.white, fontSize: 14, borderWidth: 1, borderColor: COLORS.accentBorder25 },
  editCancel: { color: COLORS.glass45, fontSize: 12, fontWeight: '600' },
  editSave: { color: COLORS.accent, fontSize: 12, fontWeight: '700' },
  replyBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 6, backgroundColor: COLORS.surfaceLow, borderTopWidth: 1, borderTopColor: COLORS.glass08 },
  replyBarText: { color: COLORS.glass40, fontSize: 12 },
  replyBarCancel: { color: COLORS.accent, fontSize: 12, fontWeight: '600' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.glass08, gap: 10 },
  inputWrap: { flex: 1, backgroundColor: COLORS.surfaceLow, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.glass10, minHeight: 38, justifyContent: 'center' },
  input: { color: COLORS.white, fontSize: 14, maxHeight: 100, lineHeight: 19 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.accentDim, alignItems: 'center', justifyContent: 'center' },
});
