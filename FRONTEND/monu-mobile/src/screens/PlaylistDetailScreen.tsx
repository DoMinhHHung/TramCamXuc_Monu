import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';

import { COLORS, useThemeColors } from '../config/colors';
import { BackButton } from '../components/BackButton';
import { RetryState } from '../components/RetryState';
import { SectionSkeleton } from '../components/SkeletonLoader';
import { usePlayer } from '../context/PlayerContext';
import { useTranslation } from '../context/LocalizationContext';
import {
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
  dragTargetIndex: number | null;
  onPress:        () => void;
  onLongPress:    () => void;
  onRemove:       () => void;
  onDropHere:     () => void;
  activeColor:    string;
}

const SongRow: React.FC<SongRowProps> = ({
                                           item, index, isActive, isPlaying,
                                           isDragging, isSelected, dragTargetIndex,
                                           onPress, onLongPress, onRemove, onDropHere,
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

  const showDropZone = isDragging && !isSelected && dragTargetIndex === index;

  return (
      <View>
        {showDropZone && (
            <Pressable onPress={onDropHere} style={rowStyles.dropZone}>
              <View style={rowStyles.dropLine} />
              <Text style={rowStyles.dropText}>↓ Thả vào đây</Text>
              <View style={rowStyles.dropLine} />
            </Pressable>
        )}

        <Animated.View
            style={[
              rowStyles.row,
              isActive    && { backgroundColor: `${activeColor}18` },
              isSelected  && rowStyles.rowSelected,
              { opacity: fadeAnim },
            ]}
        >
          {/* Drag handle */}
          <Pressable
              onLongPress={onLongPress}
              delayLongPress={280}
              style={rowStyles.handle}
              hitSlop={{ top: 12, bottom: 12, left: 4, right: 4 }}
          >
            <Text style={[rowStyles.handleIcon, isSelected && { color: activeColor }]}>
              {isSelected ? '✦' : '⠿'}
            </Text>
          </Pressable>

          {/* Content */}
          <Pressable
              style={rowStyles.content}
              onPress={isDragging ? onDropHere : onPress}
          >
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
          </Pressable>

          {/* Remove */}
          {!isDragging && (
              <Pressable onPress={onRemove} hitSlop={10} style={rowStyles.removeBtn}>
                <AntDesign name="close" size={13} color={COLORS.glass35} />
              </Pressable>
          )}
        </Animated.View>
      </View>
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
  dropZone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginVertical: 2,
  },
  dropLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: COLORS.accent,
    opacity: 0.7,
  },
  dropText: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '700',
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const PlaylistDetailScreen = () => {
  const route      = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets     = useSafeAreaInsets();
  const slug       = route.params?.slug as string;
  const fallbackName = route.params?.name as string | undefined;

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading]   = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);

  // Drag state
  const [selectedIdx,   setSelectedIdx]   = useState<number | null>(null);
  const [dragTargetIdx, setDragTargetIdx] = useState<number | null>(null);

  const { playSong, currentSong, isPlaying } = usePlayer();
  const themeColors = useThemeColors();
  const { t }       = useTranslation();

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

  // ── Drag: long press chọn bài ─────────────────────────────────────────────
  const handleLongPress = useCallback((idx: number) => {
    setSelectedIdx(idx);
    setDragTargetIdx(null);
  }, []);

  const handleCancelDrag = useCallback(() => {
    setSelectedIdx(null);
    setDragTargetIdx(null);
  }, []);

  // ── Drag: thả vào vị trí targetIdx ────────────────────────────────────────
  const handleDropHere = useCallback(async (targetIdx: number) => {
    if (selectedIdx === null || !playlist?.id || !playlist.songs) return;

    if (selectedIdx === targetIdx) {
      handleCancelDrag();
      return;
    }

    const songs   = playlist.songs;
    const dragged = songs[selectedIdx];
    const newSongs = [...songs];
    newSongs.splice(selectedIdx, 1);
    const adjustedTarget = targetIdx > selectedIdx ? targetIdx - 1 : targetIdx;
    newSongs.splice(adjustedTarget, 0, dragged);

    // Optimistic update
    setPlaylist(prev => prev ? { ...prev, songs: newSongs } : prev);
    setSelectedIdx(null);
    setDragTargetIdx(null);

    const prevSong = newSongs[adjustedTarget - 1] ?? null;
    const nextSong = newSongs[adjustedTarget + 1] ?? null;

    setSaving(true);
    try {
      await reorderPlaylistSong(playlist.id, {
        draggedId: dragged.playlistSongId,
        prevId:    prevSong?.playlistSongId ?? null,
        nextId:    nextSong?.playlistSongId ?? null,
      });
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.message || 'Không thể sắp xếp lại');
      await loadPlaylist();
    } finally {
      setSaving(false);
    }
  }, [selectedIdx, playlist, loadPlaylist, handleCancelDrag]);

  // ── Xoá bài ────────────────────────────────────────────────────────────────
  const handleRemoveSong = useCallback(async (song: PlaylistSong) => {
    if (!playlist?.id) return;
    Alert.alert('Xoá khỏi playlist?', `"${song.title}" sẽ bị xoá.`, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await removeSongFromPlaylist(playlist.id, song.songId);
            await loadPlaylist();
          } catch (err: any) {
            Alert.alert(t('common.error'), err?.message);
          }
        },
      },
    ]);
  }, [playlist, loadPlaylist]);

  // ── Styles phụ thuộc theme ─────────────────────────────────────────────────
  const screenStyles = useMemo(() => createScreenStyles(themeColors), [themeColors]);

  return (
      <View style={screenStyles.root}>
        <StatusBar style="light" />

        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>

          {/* Header */}
          <LinearGradient
              colors={[themeColors.gradIndigo, themeColors.bg]}
              style={[screenStyles.header, { paddingTop: insets.top + 14 }]}
          >
            <View style={screenStyles.backRow}>
              <BackButton onPress={isDragging ? handleCancelDrag : () => navigation.goBack()} />
              {saving && (
                  <View style={screenStyles.savingBadge}>
                    <ActivityIndicator size="small" color={themeColors.accent} />
                    <Text style={screenStyles.savingText}>Đang lưu...</Text>
                  </View>
              )}
            </View>

            <Text style={screenStyles.title}>
              {playlist?.name || fallbackName || t('labels.title')}
            </Text>
            <Text style={screenStyles.sub}>
              {playlist?.totalSongs ?? playlist?.songs?.length ?? 0} {t('playlistDetails.songs')}
              {isDragging
                  ? <Text style={{ color: themeColors.accent }}>  ·  ✦ Đang sắp xếp</Text>
                  : null
              }
            </Text>
          </LinearGradient>

          {/* Drag mode banner */}
          {isDragging && (
              <Pressable style={screenStyles.dragBanner} onPress={handleCancelDrag}>
                <Text style={screenStyles.dragBannerText}>
                  Nhấn giữ ⠿ để chọn bài → bấm vị trí muốn thả để di chuyển
                </Text>
                <Text style={screenStyles.dragBannerCancel}>✕ Huỷ</Text>
              </Pressable>
          )}

          {/* Song list */}
          <View style={screenStyles.body}>
            {loading ? (
                <View style={screenStyles.center}>
                  <SectionSkeleton rows={4} />
                </View>
            ) : loadError && !playlist ? (
              <RetryState
                title="Không tải được playlist"
                description={loadError}
                onRetry={loadPlaylist}
                fallbackLabel="Quay lại"
                onFallback={() => navigation.goBack()}
                icon="🎵"
              />
            ) : !(playlist?.songs?.length) ? (
                <View style={screenStyles.emptyCard}>
                  <Text style={screenStyles.emptyText}>
                    {t('playlistDetails.addSongsToGetStarted')}
                  </Text>
                </View>
            ) : (
                playlist.songs.map((song, index) => (
                    <SongRow
                        key={song.playlistSongId || song.songId}
                        item={song}
                        index={index}
                        isActive={currentSong?.id === song.songId}
                        isPlaying={currentSong?.id === song.songId && isPlaying}
                        isDragging={isDragging}
                        isSelected={selectedIdx === index}
                        dragTargetIndex={dragTargetIdx}
                        onPress={() => {
                          if (isDragging) {
                            selectedIdx === index
                                ? handleCancelDrag()
                                : void handleDropHere(index);
                          } else {
                            playSong(toSong(song), songQueue);
                          }
                        }}
                        onLongPress={() => handleLongPress(index)}
                        onRemove={() => void handleRemoveSong(song)}
                        onDropHere={() => void handleDropHere(index)}
                        activeColor={themeColors.accent}
                    />
                ))
            )}

            {/* Drop zone cuối list */}
            {isDragging &&
                selectedIdx !== null &&
                playlist?.songs &&
                selectedIdx !== playlist.songs.length - 1 && (
                    <Pressable
                        onPress={() => void handleDropHere(playlist.songs!.length)}
                        style={rowStyles.dropZone}
                    >
                      <View style={rowStyles.dropLine} />
                      <Text style={rowStyles.dropText}>↓ Thả vào cuối</Text>
                      <View style={rowStyles.dropLine} />
                    </Pressable>
                )}
          </View>
        </ScrollView>
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
    });