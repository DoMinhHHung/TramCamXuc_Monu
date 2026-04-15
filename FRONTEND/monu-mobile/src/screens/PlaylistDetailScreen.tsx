import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import DraggableFlatList, { type RenderItemParams } from 'react-native-draggable-flatlist';

import { COLORS, useThemeColors } from '../config/colors';
import { useLayoutConstants } from '../config/layout';
import { BackButton } from '../components/BackButton';
import { RetryState } from '../components/RetryState';
import { SectionSkeleton } from '../components/SkeletonLoader';
import { usePlayerControls, usePlayerState, usePlayerStatus } from '../context/PlayerContext';
import { useTranslation } from '../context/LocalizationContext';
import { useHomeDataPriority } from '../hooks/useHomeDataPriority';
import {
  addSongToPlaylist,
  getPlaylistBySlug,
  Playlist,
  PlaylistSong,
  removeSongFromPlaylist,
  reorderPlaylistSong,
  Song,
} from '../services/music';

// ─── Helper ───────────────────────────────────────────────────────────────────

const toSong = (s: PlaylistSong): Song => ({
  id: s.songId,
  title: s.title,
  primaryArtist: { artistId: s.artistId || '', stageName: s.artistStageName || 'Unknown' },
  genres: [],
  durationSeconds: s.durationSeconds || 0,
  playCount: s.playCount || 0,
  status: 'PUBLIC',
  transcodeStatus: 'COMPLETED',
  thumbnailUrl: s.thumbnailUrl,
  createdAt: '',
  updatedAt: '',
});

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// ─── Song Row ─────────────────────────────────────────────────────────────────

interface SongRowProps {
  item:           PlaylistSong;
  index:          number;
  isActive:       boolean;
  isPlaying:      boolean;
  isDragging:     boolean;
  isSelected:     boolean;
  onPress:        () => void;
  onLongPress:    (e?: unknown) => void;
  onRemove:       () => void;
  activeColor:    string;
}

const SongRow: React.FC<SongRowProps> = ({
                                           item, index, isActive, isPlaying,
                                           isDragging, isSelected,
                                           onPress, onLongPress, onRemove,
                                           activeColor,
                                         }) => {
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isSelected) {
      const loop = Animated.loop(
          Animated.sequence([
            Animated.timing(fadeAnim, { toValue: 0.45, duration: 550, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 1,    duration: 550, useNativeDriver: true }),
          ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      fadeAnim.setValue(1);
    }
  }, [isSelected]);

  return (
    <Pressable
      onPress={isDragging ? undefined : onPress}
      onLongPress={onLongPress}
      delayLongPress={500}
      disabled={isDragging && !isSelected}
    >
      <Animated.View
        style={[
          rowStyles.row,
          isActive && { backgroundColor: `${activeColor}18` },
          isSelected && rowStyles.rowSelected,
          { opacity: fadeAnim },
        ]}
      >
        {/* Drag affordance */}
        <View style={rowStyles.handle} pointerEvents="none">
          <Text style={[rowStyles.handleIcon, isSelected && { color: activeColor }]}>
            {isSelected ? '✦' : '⠿'}
          </Text>
        </View>

        {/* Content */}
        <View style={rowStyles.content} pointerEvents="none">
          {item.thumbnailUrl ? (
            <Image source={{ uri: item.thumbnailUrl }} style={rowStyles.thumb} />
          ) : (
            <View style={rowStyles.thumbFallback}>
              <Text style={{ fontSize: 18 }}>🎵</Text>
            </View>
          )}

          <View style={rowStyles.info}>
            <Text
              style={[rowStyles.songTitle, isActive && { color: activeColor }]}
              numberOfLines={1}
            >
              {item.title}
              {isPlaying ? ' ♫' : ''}
            </Text>
            <Text style={rowStyles.artist} numberOfLines={1}>
              {item.artistStageName ?? 'Nghệ sĩ'}
            </Text>
          </View>

          <Text style={rowStyles.duration}>{formatDuration(item.durationSeconds ?? 0)}</Text>
        </View>

        {/* Remove */}
        {!isDragging && (
          <Pressable onPress={onRemove} hitSlop={10} style={rowStyles.removeBtn}>
            <AntDesign name="close" size={13} color={COLORS.glass35} />
          </Pressable>
        )}
      </Animated.View>
    </Pressable>
  );
};

// ─── Styles cho SongRow (static — không dùng theme hook) ──────────────────────
const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 3,
    height: 56,
  },
  rowSelected: {
    backgroundColor: COLORS.accentFill20,
    borderWidth: 1,
    borderColor: COLORS.accentBorder25,
  },
  handle: {
    width: 36,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 4,
  },
  handleIcon: {
    fontSize: 18,
    color: COLORS.glass20,
    letterSpacing: 2,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  thumb: {
    width: 46,
    height: 46,
    borderRadius: 8,
  },
  thumbFallback: {
    width: 46,
    height: 46,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  songTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  artist: {
    color: COLORS.glass45,
    fontSize: 12,
    marginTop: 2,
  },
  duration: {
    color: COLORS.glass35,
    fontSize: 11,
    marginRight: 4,
  },
  removeBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 4,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const PlaylistDetailScreen = () => {
  const route      = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets     = useSafeAreaInsets();
  const layout = useLayoutConstants();
  const slug       = route.params?.slug as string;
  const fallbackName = route.params?.name as string | undefined;

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading]   = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);

  // Drag state
  const [selectedIdx,   setSelectedIdx]   = useState<number | null>(null);
  const [dragTargetIdx, setDragTargetIdx] = useState<number | null>(null); // hover index
  const draggedNodeIdRef = useRef<string | null>(null);

  const { playSong } = usePlayerControls();
  const { currentSong } = usePlayerState();
  const { isPlaying } = usePlayerStatus();
  const themeColors = useThemeColors();
  const { t, language }       = useTranslation();
  const isVi = (language as string | undefined) !== 'en';

  const home = useHomeDataPriority();

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addQuery, setAddQuery] = useState('');
  const [addingIds, setAddingIds] = useState<Record<string, boolean>>({});
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  const loadPlaylist = useCallback(async () => {
    if (!slug) return;
    try {
      setLoading(true);
      setLoadError(null);
      setPlaylist(await getPlaylistBySlug(slug));
    } catch (err: any) {
      setLoadError(err?.message || t('errors.loadingFailed'));
      Alert.alert(t('common.error'), err?.message || t('errors.loadingFailed'));
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { void loadPlaylist(); }, [loadPlaylist]);

  const songQueue: Song[] = useMemo(
      () => (playlist?.songs ?? []).map(toSong),
      [playlist?.songs],
  );

  const isDragging = selectedIdx !== null;

  const homeSongsPool: Song[] = useMemo(() => {
    const pool = [
      ...(home.legacyTrendingSongs ?? []),
      ...(home.legacyNewestSongs ?? []),
    ];
    const byId = new Map<string, Song>();
    pool.forEach((s) => {
      if (s?.id && !byId.has(s.id)) byId.set(s.id, s);
    });
    return Array.from(byId.values());
  }, [home.legacyTrendingSongs, home.legacyNewestSongs]);

  const playlistSongIdSet = useMemo(() => {
    const set = new Set<string>();
    (playlist?.songs ?? []).forEach((ps) => {
      if (ps?.songId) set.add(ps.songId);
    });
    return set;
  }, [playlist?.songs]);

  const searchableSongs = useMemo(() => {
    const q = addQuery.trim().toLowerCase();
    const base = homeSongsPool.filter((s) => !playlistSongIdSet.has(s.id));
    if (!q) return base;
    return base.filter((s) => {
      const title = (s.title ?? '').toLowerCase();
      const artist = (s.primaryArtist?.stageName ?? '').toLowerCase();
      return title.includes(q) || artist.includes(q);
    });
  }, [addQuery, homeSongsPool, playlistSongIdSet]);

  const handleAddSong = useCallback(async (song: Song) => {
    if (!playlist?.id) return;
    if (!song?.id) return;
    if (addingIds[song.id] || addedIds[song.id]) return;

    setAddingIds((prev) => ({ ...prev, [song.id]: true }));
    try {
      await addSongToPlaylist(playlist.id, song.id);
      setAddedIds((prev) => ({ ...prev, [song.id]: true }));
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? (isVi ? 'Không thể thêm bài hát.' : 'Cannot add song.'));
    } finally {
      setAddingIds((prev) => {
        const next = { ...prev };
        delete next[song.id];
        return next;
      });
    }
  }, [playlist?.id, addingIds, addedIds, t, isVi]);

  const handleCancelDrag = useCallback(() => {
    setSelectedIdx(null);
    setDragTargetIdx(null);
  }, []);

  const handleReorder = useCallback(async (from: number, _to: number, nextSongs: PlaylistSong[]) => {
    if (!playlist?.id) return;

    // Prefer the node id captured at drag-begin (prevents issues if the list mutates).
    const draggedId =
      draggedNodeIdRef.current
      ?? ((playlist.songs?.[from] as any)?.playlistSongId ?? (playlist.songs?.[from] as any)?.id ?? null);

    if (!draggedId) {
      Alert.alert(t('common.error'), isVi ? 'Không xác định được ID node trong playlist.' : 'Cannot resolve playlistSongId.');
      await loadPlaylist();
      return;
    }

    // Find the dragged node position in the new order, then compute neighbors.
    const newIndex = nextSongs.findIndex((s) => ((s as any)?.playlistSongId ?? (s as any)?.id) === draggedId);
    if (newIndex < 0) {
      Alert.alert(t('common.error'), isVi ? 'Không tìm thấy bài hát vừa kéo trong danh sách mới.' : 'Dragged item not found in new list.');
      await loadPlaylist();
      return;
    }

    const prevSong = nextSongs[newIndex - 1] ?? null;
    const nextSong = nextSongs[newIndex + 1] ?? null;

    let prevId = (prevSong as any)?.playlistSongId ?? (prevSong as any)?.id ?? null;
    let nextId = (nextSong as any)?.playlistSongId ?? (nextSong as any)?.id ?? null;

    // Backend rejects if prev/next equals dragged.
    if (prevId === draggedId) prevId = null;
    if (nextId === draggedId) nextId = null;

    // For lists > 1, avoid sending both null.
    if (nextSongs.length > 1 && prevId == null && nextId == null) {
      if (newIndex === 0) nextId = ((nextSongs[1] as any)?.playlistSongId ?? (nextSongs[1] as any)?.id ?? null);
      else if (newIndex === nextSongs.length - 1) prevId = ((nextSongs[nextSongs.length - 2] as any)?.playlistSongId ?? (nextSongs[nextSongs.length - 2] as any)?.id ?? null);
    }

    setSaving(true);
    try {
      await reorderPlaylistSong(playlist.id, {
        draggedId,
        prevId,
        nextId,
      });
    } catch (err: any) {
      const backendMessage = err?.response?.data?.message as string | undefined;
      const backendCode = err?.response?.data?.code as number | undefined;
      const msg = backendMessage || err?.message || (isVi ? 'Không thể sắp xếp lại' : 'Cannot reorder');
      const hint = backendCode === 9998
        ? (isVi ? '\n\nGợi ý: Playlist có thể đang bị lệch thứ tự trên server. Thử thoát ra vào lại playlist rồi kéo lại.' : '\n\nHint: Playlist order may be inconsistent on server. Reopen playlist and try again.')
        : '';
      Alert.alert(t('common.error'), `${msg}${hint}`);
      await loadPlaylist();
    } finally {
      setSaving(false);
    }
  }, [playlist?.id, playlist?.songs, t, isVi, loadPlaylist]);

  // ── Xoá bài ────────────────────────────────────────────────────────────────
  const handleRemoveSong = useCallback(async (song: PlaylistSong) => {
    if (!playlist?.id) return;
    Alert.alert(
      t('playlistDetails.removeFromPlaylistTitle', isVi ? 'Xoá khỏi playlist?' : 'Remove from playlist?'),
      t('playlistDetails.removeFromPlaylistMessage', isVi ? `"${song.title}" sẽ bị xoá.` : `"${song.title}" will be removed.`).replace('{title}', song.title),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
      {
        text: t('common.delete', 'Delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await removeSongFromPlaylist(playlist.id, song.songId);
            await loadPlaylist();
          } catch (err: any) {
            Alert.alert(t('common.error', 'Error'), err?.message);
          }
        },
      },
      ],
    );
  }, [playlist, loadPlaylist]);

  // ── Styles phụ thuộc theme ─────────────────────────────────────────────────
  const screenStyles = useMemo(() => createScreenStyles(themeColors), [themeColors]);

  return (
      <View style={screenStyles.root}>
        <StatusBar style="light" />

        <DraggableFlatList
          data={playlist?.songs ?? []}
          keyExtractor={(item) => item.playlistSongId || item.songId}
          contentContainerStyle={{ paddingBottom: layout.tabBarHeight + layout.miniPlayerHeight + 16, paddingHorizontal: 12, paddingTop: 8 }}
          ListHeaderComponent={(
            <>
              <LinearGradient
                colors={[themeColors.gradIndigo, themeColors.bg]}
                style={[screenStyles.header, { paddingTop: insets.top + 14 }]}
              >
                <View style={screenStyles.backRow}>
                  <BackButton onPress={isDragging ? handleCancelDrag : () => navigation.goBack()} />
                  {!isDragging && (
                    <Pressable
                      onPress={() => {
                        setAddedIds({});
                        setAddingIds({});
                        setAddQuery('');
                        setAddModalOpen(true);
                      }}
                      style={screenStyles.addSongsBtn}
                      hitSlop={8}
                    >
                      <Text style={screenStyles.addSongsBtnText}>
                        + {t('playlistDetails.addSongsCta', isVi ? 'Thêm bài hát' : 'Add songs')}
                      </Text>
                    </Pressable>
                  )}
                  {saving && (
                    <View style={screenStyles.savingBadge}>
                      <ActivityIndicator size="small" color={themeColors.accent} />
                      <Text style={screenStyles.savingText}>{isVi ? 'Đang lưu...' : 'Saving...'}</Text>
                    </View>
                  )}
                </View>

                <Text style={screenStyles.title}>
                  {playlist?.name || fallbackName || t('labels.title')}
                </Text>
                <Text style={screenStyles.sub}>
                  {playlist?.totalSongs ?? playlist?.songs?.length ?? 0} {t('playlistDetails.songs')}
                  {isDragging ? <Text style={{ color: themeColors.accent }}>  ·  ✦ {isVi ? 'Đang sắp xếp' : 'Reordering'}</Text> : null}
                </Text>
              </LinearGradient>

              {isDragging && (
                <Pressable style={screenStyles.dragBanner} onPress={handleCancelDrag}>
                  <Text style={screenStyles.dragBannerText}>
                    {isVi
                      ? 'Nhấn giữ ~0.5s vào bài hát, kéo thả để sắp xếp (như Trello)'
                      : 'Long press ~0.5s then drag to reorder (like Trello)'}
                  </Text>
                  <Text style={screenStyles.dragBannerCancel}>✕ {isVi ? 'Huỷ' : 'Cancel'}</Text>
                </Pressable>
              )}

              {loading && (
                <View style={screenStyles.center}>
                  <SectionSkeleton rows={4} />
                </View>
              )}

              {!loading && loadError && !playlist && (
                <RetryState
                  title={isVi ? 'Không tải được playlist' : 'Cannot load playlist'}
                  description={loadError}
                  onRetry={loadPlaylist}
                  fallbackLabel={isVi ? 'Quay lại' : 'Back'}
                  onFallback={() => navigation.goBack()}
                  icon="🎵"
                />
              )}

              {!loading && playlist && !(playlist?.songs?.length) && (
                <View style={screenStyles.emptyCard}>
                  <Text style={screenStyles.emptyText}>
                    {t('playlistDetails.addSongsToGetStarted')}
                  </Text>
                </View>
              )}
            </>
          )}
          renderItem={({ item, drag, isActive: isRowActive, getIndex }: RenderItemParams<PlaylistSong>) => {
            const index = getIndex?.() ?? 0;
            return (
            <SongRow
              item={item}
              index={index}
              isActive={currentSong?.id === item.songId}
              isPlaying={currentSong?.id === item.songId && isPlaying}
              isDragging={isDragging}
              isSelected={isRowActive}
              onPress={() => playSong(toSong(item), songQueue)}
              onLongPress={() => {
                setSelectedIdx(index);
                setDragTargetIdx(index);
                draggedNodeIdRef.current = (item as any)?.playlistSongId ?? (item as any)?.id ?? null;
                drag();
              }}
              onRemove={() => void handleRemoveSong(item)}
              activeColor={themeColors.accent}
            />
            );
          }}
          onDragBegin={(index) => {
            setSelectedIdx(index);
            setDragTargetIdx(index);
            const item = playlist?.songs?.[index];
            draggedNodeIdRef.current = (item as any)?.playlistSongId ?? (item as any)?.id ?? null;
          }}
          onDragEnd={({ data, from, to }) => {
            setPlaylist((prev) => (prev ? { ...prev, songs: data } : prev));
            setSelectedIdx(null);
            setDragTargetIdx(null);
            if (from !== to) {
              void handleReorder(from, to, data);
            }
            draggedNodeIdRef.current = null;
          }}
        />

        <Modal
          visible={addModalOpen}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setAddModalOpen(false)}
        >
          <KeyboardAvoidingView style={{ flex: 1, backgroundColor: themeColors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[screenStyles.modalHeader, { paddingTop: insets.top + 10 }]}>
              <Text style={screenStyles.modalTitle}>
                {t('playlistDetails.addSongsTitle', isVi ? 'Thêm bài hát' : 'Add songs')}
              </Text>
              <Pressable
                onPress={async () => {
                  setAddModalOpen(false);
                  if (Object.keys(addedIds).length > 0) await loadPlaylist();
                }}
                hitSlop={8}
                style={screenStyles.modalDoneBtn}
              >
                <Text style={screenStyles.modalDoneBtnText}>
                  {t('common.done', isVi ? 'Xong' : 'Done')}
                </Text>
              </Pressable>
            </View>

            <View style={screenStyles.modalSearchRow}>
              <TextInput
                value={addQuery}
                onChangeText={setAddQuery}
                placeholder={t('playlistDetails.searchPlaceholder', isVi ? 'Tìm bài hát hoặc nghệ sĩ...' : 'Search songs or artists...')}
                placeholderTextColor={themeColors.glass30}
                style={screenStyles.modalSearchInput}
                autoCorrect={false}
                autoCapitalize="none"
              />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
              {searchableSongs.length === 0 ? (
                <View style={screenStyles.modalEmpty}>
                  <Text style={screenStyles.modalEmptyText}>
                    {isVi ? 'Không có bài hát phù hợp.' : 'No matching songs.'}
                  </Text>
                </View>
              ) : (
                searchableSongs.map((s) => {
                  const isAdding = !!addingIds[s.id];
                  const isAdded = !!addedIds[s.id];
                  return (
                    <View key={s.id} style={screenStyles.modalSongRow}>
                      <View style={screenStyles.modalSongMain}>
                        {s.thumbnailUrl ? (
                          <Image source={{ uri: s.thumbnailUrl }} style={screenStyles.modalSongThumb} />
                        ) : (
                          <View style={[screenStyles.modalSongThumb, screenStyles.modalSongThumbFallback]}>
                            <Text style={{ fontSize: 16 }}>🎵</Text>
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={screenStyles.modalSongTitle} numberOfLines={1}>
                            {s.title}
                          </Text>
                          <Text style={screenStyles.modalSongArtist} numberOfLines={1}>
                            {s.primaryArtist?.stageName ?? (isVi ? 'Nghệ sĩ' : 'Artist')}
                          </Text>
                        </View>
                      </View>

                      <Pressable
                        onPress={() => { void handleAddSong(s); }}
                        disabled={isAdding || isAdded}
                        hitSlop={8}
                        style={[
                          screenStyles.modalAddBtn,
                          (isAdding || isAdded) && { opacity: 0.55 },
                          isAdded && { backgroundColor: themeColors.success + '22', borderColor: themeColors.success + '55' },
                        ]}
                      >
                        {isAdding ? (
                          <ActivityIndicator size="small" color={themeColors.accent} />
                        ) : (
                          <Text style={[screenStyles.modalAddBtnText, isAdded && { color: themeColors.success }]}>
                            {isAdded ? (isVi ? 'Đã thêm' : 'Added') : (isVi ? 'Thêm' : 'Add')}
                          </Text>
                        )}
                      </Pressable>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      </View>
  );
};

// ─── Screen styles (theme-dependent) ─────────────────────────────────────────
type TC = ReturnType<typeof useThemeColors>;

const createScreenStyles = (colors: TC) =>
    StyleSheet.create({
      root:   { flex: 1, backgroundColor: colors.bg },
      header: { paddingHorizontal: 20, paddingBottom: 22 },
      backRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
      },
      addSongsBtn: {
        backgroundColor: colors.accentFill20,
        borderWidth: 1,
        borderColor: colors.accentBorder25,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8,
      },
      addSongsBtnText: { color: colors.accent, fontSize: 12, fontWeight: '700' },
      savingBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: colors.glass08,
        borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6,
      },
      savingText: { color: colors.glass60, fontSize: 12 },
      title: { color: colors.white, fontSize: 26, fontWeight: '800' },
      sub:   { color: colors.glass60, marginTop: 6, fontSize: 13 },
      dragBanner: {
        marginHorizontal: 16, marginVertical: 8,
        backgroundColor: colors.accentFill20,
        borderRadius: 12, borderWidth: 1, borderColor: colors.accentBorder25,
        padding: 12,
        flexDirection: 'row', alignItems: 'center', gap: 8,
      },
      dragBannerText:   { flex: 1, color: colors.glass70, fontSize: 12, lineHeight: 17 },
      dragBannerCancel: { color: colors.error, fontSize: 13, fontWeight: '700' },
      body:  { paddingHorizontal: 12, paddingTop: 8 },
      center: { justifyContent: 'center', alignItems: 'center', paddingTop: 32 },
      emptyCard: {
        borderRadius: 12, borderWidth: 1,
        borderColor: colors.glass10,
        padding: 14,
        backgroundColor: colors.surface,
        margin: 4,
      },
      emptyText: { color: colors.glass60 },

      dragOverlayShadow: {
        shadowColor: colors.black,
        shadowOpacity: 0.35,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8,
      },

      modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.glass08,
        backgroundColor: colors.bg,
      },
      modalTitle: { color: colors.white, fontSize: 16, fontWeight: '800' },
      modalDoneBtn: {
        backgroundColor: colors.accentDim,
        borderRadius: 999,
        paddingHorizontal: 16,
        paddingVertical: 8,
      },
      modalDoneBtnText: { color: colors.white, fontSize: 13, fontWeight: '700' },
      modalSearchRow: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
      modalSearchInput: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.glass12,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        color: colors.white,
        fontSize: 14,
      },
      modalEmpty: { padding: 28, alignItems: 'center' },
      modalEmptyText: { color: colors.glass45, fontSize: 13, textAlign: 'center' },
      modalSongRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.glass06,
      },
      modalSongMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
      modalSongThumb: { width: 44, height: 44, borderRadius: 10, backgroundColor: colors.surface },
      modalSongThumbFallback: { alignItems: 'center', justifyContent: 'center' },
      modalSongTitle: { color: colors.white, fontSize: 14, fontWeight: '700' },
      modalSongArtist: { color: colors.glass45, fontSize: 12, marginTop: 2 },
      modalAddBtn: {
        minWidth: 74,
        height: 34,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.accentBorder25,
        backgroundColor: colors.accentFill20,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 10,
      },
      modalAddBtnText: { color: colors.accent, fontSize: 12, fontWeight: '800' },
    });