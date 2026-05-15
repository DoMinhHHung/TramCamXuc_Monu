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
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Entypo, AntDesign, FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { ColorScheme, useThemeColors } from '../../config/colors';
import { useLayoutConstants } from '../../config/layout';
import { SectionSkeleton } from '../../components/SkeletonLoader';
import { useAuth } from '../../context/AuthContext';
import { usePlayerControls, usePlayerState, usePlayerStatus } from '../../context/PlayerContext';
import { useTranslation } from '../../context/LocalizationContext';
import {
  addSongToPlaylist,
  Album,
  createAlbum,
  createPlaylist,
  deleteOwnedSong,
  deletePlaylist,
  finalizeAiDraftSong,
  getMyAlbums,
  getMyPlaylists,
  getMySongs,
  isSoundCloudExternalSong,
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
import { AddToPlaylistSheet } from '../../components/AddToPlaylistSheet';
import { AnimatedDecorIcon } from '../../components/AnimatedDecorIcon';
import { MonuBrandHeaderTitle } from '../../components/MonuBrandHeaderTitle';
import { Toast, useToast } from '../../components/Toast';
import { SmartPlaylistCard } from '../../components/SmartPlaylistCard';
import { useSmartPlaylists } from '../../hooks/useSmartPlaylists';
import { getMySubscription } from '../../services/payment';
import { fetchWithRetry, loadCache, saveCache } from '../../utils/swrCache';
import { uiPresets } from '../../config/uiPresets';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'playlists' | 'songs' | 'albums' | 'smart';
let tr = (key: string, fallback?: string) => fallback ?? key;

const getStatusBarStyle = (backgroundColor: string): 'light' | 'dark' => {
  const hex = backgroundColor.replace('#', '');
  if (hex.length !== 6) return 'light';
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance > 0.6 ? 'dark' : 'light';
};

const getLibraryCacheStorageKey = (userScope: string) => `library.cache.${userScope}`;
const LIBRARY_STALE_MS = 5 * 60 * 1000;

type LibraryCachePayload = {
  playlists: Playlist[];
  songs: Song[];
  albums: Album[];
  artistProfile: ArtistProfile | null;
  hasActiveSub: boolean;
  canCreateAlbumByPlan: boolean;
  updatedAt: number;
};

type ArtistProfile = {
  id: string;
  stageName?: string;
  status?: 'ACTIVE' | 'PENDING' | 'BANNED';
};

const getSongStatusLabel = (song: Song, c: ColorScheme): { label: string; color: string; pulse: boolean } => {
  if (song.status === 'DELETED') {
    return { label: tr('screens.library.songDeleted', 'Deleted'), color: c.error, pulse: false };
  }
  if (song.sourceType === 'AI' && song.status === 'DRAFT' && song.transcodeStatus === 'PENDING') {
    return {
      label: tr('screens.library.aiAwaitingDecision', 'AI draft — choose visibility'),
      color: c.warningMid,
      pulse: true,
    };
  }
  if (song.status === 'PRIVATE') {
    return { label: tr('screens.library.private', 'Private'), color: c.glass40, pulse: false };
  }
  switch (song.transcodeStatus as string) {
    case 'PENDING':
      return { label: tr('screens.library.releasePending', 'Pending release...'), color: c.warningMid, pulse: true };
    case 'PROCESSING':
      return { label: tr('screens.library.processing', 'Preparing, almost done ✨'), color: c.accent, pulse: true };
    case 'FAILED':
      return { label: tr('screens.library.releaseFailed', 'Release failed — try re-uploading'), color: c.error, pulse: false };
    case 'COMPLETED':
      return { label: tr('screens.library.published', 'Published'), color: c.success, pulse: false };
    default:
      return { label: '', color: c.glass40, pulse: false };
  }
};

// ─── Sub-components ───────────────────────────────────────────────────────────

// ─── Tab config ───────────────────────────────────────────────────────────────

const TAB_CONFIG: Array<{
  key: Tab;
  labelFn: () => string;
  iconName: string;
  iconLib: 'mci' | 'entypo';
  activeColor: string;
}> = [
  { key: 'playlists', labelFn: () => tr('screens.library.tabPlaylists', 'Playlist'), iconName: 'playlist-music', iconLib: 'mci', activeColor: '#A78BFA' },
  { key: 'songs',     labelFn: () => tr('screens.library.tabSongs', 'Bài hát'),     iconName: 'music',           iconLib: 'entypo', activeColor: '#60A5FA' },
  { key: 'albums',    labelFn: () => tr('screens.library.tabAlbums', 'Album'),      iconName: 'album',           iconLib: 'mci', activeColor: '#FBBF24' },
  { key: 'smart',     labelFn: () => 'Đề xuất',                                     iconName: 'auto-fix',        iconLib: 'mci', activeColor: '#F472B6' },
];

const TabBar = ({
  active,
  onChange,
  counts,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
  counts: Record<Tab, number>;
}) => {
  const themeColors = useThemeColors();
  const activeIndex = TAB_CONFIG.findIndex((t) => t.key === active);

  // Animated indicator position
  const indicatorX = useRef(new Animated.Value(activeIndex)).current;

  useEffect(() => {
    Animated.spring(indicatorX, {
      toValue: activeIndex,
      useNativeDriver: true,
      tension: 180,
      friction: 18,
    }).start();
  }, [activeIndex, indicatorX]);

  const tabWidth = 1 / TAB_CONFIG.length;

  return (
    <View style={tabBarStyles.container}>
      {/* Tabs */}
      <View style={tabBarStyles.row}>
        {TAB_CONFIG.map((tab) => {
          const isActive = tab.key === active;
          const iconColor = isActive ? tab.activeColor : themeColors.glass40;
          const count = counts[tab.key] ?? 0;

          return (
            <Pressable
              key={tab.key}
              style={tabBarStyles.tab}
              onPress={() => onChange(tab.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              {/* Icon */}
              <View style={tabBarStyles.iconWrap}>
                {tab.iconLib === 'mci' ? (
                  <MaterialCommunityIcons name={tab.iconName as any} size={22} color={iconColor} />
                ) : (
                  <Entypo name={tab.iconName as any} size={20} color={iconColor} />
                )}
                {count > 0 && (
                  <View style={[tabBarStyles.dot, { backgroundColor: tab.activeColor }]} />
                )}
              </View>
              {/* Label */}
              <Text style={[
                tabBarStyles.label,
                { color: isActive ? tab.activeColor : themeColors.glass40 },
                isActive && tabBarStyles.labelActive,
              ]}>
                {tab.labelFn()}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Sliding underline indicator */}
      <View style={tabBarStyles.indicatorTrack}>
        <Animated.View
          style={[
            tabBarStyles.indicator,
            {
              width: `${tabWidth * 100}%` as any,
              backgroundColor: TAB_CONFIG[activeIndex]?.activeColor ?? themeColors.accent,
              transform: [{
                translateX: indicatorX.interpolate({
                  inputRange: TAB_CONFIG.map((_, i) => i),
                  outputRange: TAB_CONFIG.map((_, i) => i * 0),
                }),
              }],
              left: `${activeIndex * tabWidth * 100}%` as any,
            },
          ]}
        />
      </View>
    </View>
  );
};

const tabBarStyles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    gap: 5,
  },
  iconWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: -2,
    right: -5,
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#05050A',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  labelActive: {
    fontWeight: '800',
  },
  indicatorTrack: {
    height: 2,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
    position: 'relative',
    overflow: 'hidden',
  },
  indicator: {
    position: 'absolute',
    height: 2,
    borderRadius: 2,
    top: 0,
  },
});

// ─── Pulsing dot for in-progress status ──────────────────────────────────────

const PulsingDot = ({ color }: { color: string }) => {
  const anim = useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }),
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
  showAiReview,
  onAiPublish,
  onAiKeepPrivate,
  onAiDiscard,
  aiFinalizeBusy,
}: {
  song: Song;
  isActive: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  onAddToPlaylist: () => void;
  onShare: () => void;
  onEdit?: () => void;
  showAiReview?: boolean;
  onAiPublish?: () => void;
  onAiKeepPrivate?: () => void;
  onAiDiscard?: () => void;
  aiFinalizeBusy?: boolean;
}) => {
  const themeColors = useThemeColors();
  const { t } = useTranslation();
  const songRowStyles = useMemo(() => getSongRowStyles(themeColors), [themeColors]);
  const { label, color, pulse } = getSongStatusLabel(song, themeColors);
  const isReady = (song.transcodeStatus as string) === 'COMPLETED';
  const canPlayStream = isReady || !!showAiReview;

  return (
    <View style={[songRowStyles.rowOuter, isActive && songRowStyles.rowActive]}>
      <View style={songRowStyles.rowMain}>
        {/* Thumbnail */}
        <Pressable onPress={canPlayStream ? onPlay : undefined} style={songRowStyles.thumbWrap}>
          {song.thumbnailUrl ? (
            <Image source={{ uri: song.thumbnailUrl }} style={songRowStyles.thumb} />
          ) : (
            <View style={[songRowStyles.thumb, songRowStyles.thumbPlaceholder]}>
              <Text style={{ fontSize: 20 }}>🎵</Text>
            </View>
          )}
          {isActive && canPlayStream && (
            <View style={songRowStyles.playingOverlay}>
              <FontAwesome name={isPlaying ? 'pause' : 'play'} size={14} color={themeColors.white} />
            </View>
          )}
        </Pressable>

        {/* Info */}
        <View style={songRowStyles.info}>
          <Text style={[songRowStyles.title, isActive && { color: themeColors.accent }]} numberOfLines={1}>
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
                <FontAwesome name="edit" color={themeColors.glass60} size={14} />
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

      {showAiReview && onAiPublish && onAiKeepPrivate ? (
        <View style={songRowStyles.aiDecisionBar}>
          <Pressable
            onPress={onAiPublish}
            disabled={aiFinalizeBusy}
            style={[songRowStyles.aiDecisionBtnPrimary, aiFinalizeBusy && songRowStyles.aiDecisionBtnDisabled]}
          >
            <Text style={songRowStyles.aiDecisionBtnPrimaryText}>
              {t('screens.library.aiPublishPublic', 'Go public')}
            </Text>
          </Pressable>
          <Pressable
            onPress={onAiKeepPrivate}
            disabled={aiFinalizeBusy}
            style={[songRowStyles.aiDecisionBtnSecondary, aiFinalizeBusy && songRowStyles.aiDecisionBtnDisabled]}
          >
            <Text style={songRowStyles.aiDecisionBtnSecondaryText}>
              {t('screens.library.aiKeepPrivate', 'Keep private')}
            </Text>
          </Pressable>
          {onAiDiscard ? (
            <Pressable
              onPress={onAiDiscard}
              disabled={aiFinalizeBusy}
              style={[songRowStyles.aiDecisionBtnSecondary, aiFinalizeBusy && songRowStyles.aiDecisionBtnDisabled]}
            >
              <Text style={songRowStyles.aiDecisionBtnSecondaryText}>
                {t('screens.library.aiDiscardDraft', 'Discard draft')}
              </Text>
            </Pressable>
          ) : null}
          {aiFinalizeBusy ? <ActivityIndicator color={themeColors.accent} size="small" /> : null}
        </View>
      ) : null}
    </View>
  );
};

const getSongRowStyles = (c: ColorScheme) => StyleSheet.create({
  rowOuter: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 0,
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowActive: { backgroundColor: c.accentFill20 },
  aiDecisionBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingLeft: 60,
  },
  aiDecisionBtnPrimary: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: c.accentDim,
  },
  aiDecisionBtnSecondary: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.glass20,
    backgroundColor: c.glass06,
  },
  aiDecisionBtnDisabled: { opacity: 0.5 },
  aiDecisionBtnPrimaryText: { color: c.white, fontWeight: '700', fontSize: 12 },
  aiDecisionBtnSecondaryText: { color: c.accent, fontWeight: '700', fontSize: 12 },
  thumbWrap: { position: 'relative' },
  thumb: { width: 48, height: 48, borderRadius: 10 },
  thumbPlaceholder: {
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: c.scrim,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  title: { color: c.white, fontSize: 14, fontWeight: '600', marginBottom: 3 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  status: { fontSize: 12 },
  artist: { color: c.glass45, fontSize: 12 },
  actions: { flexDirection: 'row', gap: 4 },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: c.glass08,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: { color: c.glass60, fontSize: 14, fontWeight: '700' },
});

// ─── Album card ───────────────────────────────────────────────────────────────

// Deterministic gradient from string – each playlist gets a unique, stable color pair
const PLAYLIST_GRADIENTS: Array<[string, string]> = [
  ['#1a1a4a', '#4a2070'],
  ['#1a3a1a', '#2d6a4a'],
  ['#3a1a1a', '#6a2d2d'],
  ['#1a2a3a', '#2d4a6a'],
  ['#3a2a1a', '#6a4a2d'],
  ['#1a3a3a', '#2d6a6a'],
  ['#2a1a3a', '#4a2d6a'],
  ['#3a3a1a', '#6a6a2d'],
];
const getPlaylistGradient = (id: string): [string, string] => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return PLAYLIST_GRADIENTS[Math.abs(hash) % PLAYLIST_GRADIENTS.length];
};

const PlaylistCard = ({
  playlist,
  onPress,
  onEdit,
  onShare,
  onDelete,
}: {
  playlist: Playlist;
  onPress: () => void;
  onEdit: () => void;
  onShare: () => void;
  onDelete: () => void;
}) => {
  const themeColors = useThemeColors();
  const cardStyles = useMemo(() => getGridCardStyles(themeColors), [themeColors]);
  const [menuOpen, setMenuOpen] = useState(false);
  const gradientColors = getPlaylistGradient(playlist.id);
  const visibilityIcon = playlist.visibility === 'PRIVATE' ? '🔒' : playlist.visibility === 'COLLABORATIVE' ? '👥' : null;

  return (
    <View style={cardStyles.gridItem}>
      <Pressable onPress={onPress}>
        <View style={cardStyles.gridThumb}>
          {playlist.coverUrl ? (
            <Image source={{ uri: playlist.coverUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill}>
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons name="playlist-music" color="rgba(255,255,255,0.35)" size={36} />
              </View>
            </LinearGradient>
          )}
          {visibilityIcon && (
            <View style={cardStyles.visibilityBadge}>
              <Text style={{ fontSize: 11 }}>{visibilityIcon}</Text>
            </View>
          )}
          <Pressable onPress={() => setMenuOpen(v => !v)} hitSlop={10} style={cardStyles.menuBtn}>
            <Text style={cardStyles.menuIcon}>•••</Text>
          </Pressable>
        </View>
        <Text style={cardStyles.gridTitle} numberOfLines={1}>{playlist.name}</Text>
        <View style={cardStyles.metaRow}>
          <Text style={cardStyles.count}>{playlist.totalSongs ?? 0} {tr('screens.library.songsSuffix', 'songs')}</Text>
        </View>
      </Pressable>

      {menuOpen && (
        <View style={cardStyles.menuAbsolute}>
          <Pressable style={cardStyles.menuItem} onPress={() => { setMenuOpen(false); onEdit(); }}>
            <Text style={cardStyles.menuItemText}><FontAwesome name="edit" color={themeColors.glass60} size={14} />  {tr('common.edit', 'Edit')}</Text>
          </Pressable>
          <Pressable style={cardStyles.menuItem} onPress={() => { setMenuOpen(false); onShare(); }}>
            <Text style={cardStyles.menuItemText}>↗  {tr('common.share', 'Share')}</Text>
          </Pressable>
          <View style={cardStyles.menuDivider} />
          <Pressable style={cardStyles.menuItem} onPress={() => { setMenuOpen(false); onDelete(); }}>
            <Text style={[cardStyles.menuItemText, { color: themeColors.error }]}><AntDesign name="delete" color={themeColors.error} size={15} />  {tr('common.delete', 'Delete')}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

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
  const themeColors = useThemeColors();
  const cardStyles = useMemo(() => getGridCardStyles(themeColors), [themeColors]);
  const [menuOpen, setMenuOpen] = useState(false);
  const statusColor =
    album.status === 'PUBLIC' ? themeColors.success :
      album.status === 'PRIVATE' ? themeColors.warningMid :
        themeColors.glass40;
  const statusLabel =
    album.status === 'PUBLIC' ? tr('screens.library.public', 'Public') :
      album.status === 'PRIVATE' ? tr('screens.library.private', 'Private') :
        tr('screens.library.draft', 'Draft');

  return (
    <View style={cardStyles.gridItem}>
      <Pressable onPress={onPress}>
        <View style={cardStyles.gridThumb}>
          {album.coverUrl ? (
            <Image source={{ uri: album.coverUrl }} style={StyleSheet.absoluteFill} />
          ) : (
            <LinearGradient
              colors={[themeColors.gradPurple, themeColors.gradIndigo]}
              style={StyleSheet.absoluteFill}
            >
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 40 }}>💿</Text>
              </View>
            </LinearGradient>
          )}
          <Pressable onPress={() => setMenuOpen(v => !v)} hitSlop={10} style={cardStyles.menuBtn}>
            <Text style={cardStyles.menuIcon}>•••</Text>
          </Pressable>
        </View>
        <Text style={cardStyles.gridTitle} numberOfLines={1}>{album.title}</Text>
        <View style={cardStyles.metaRow}>
          <View style={[cardStyles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[cardStyles.status, { color: statusColor }]}>{statusLabel}</Text>
          <Text style={cardStyles.dot}>·</Text>
          <Text style={cardStyles.count}>{album.totalSongs ?? album.songs?.length ?? 0}</Text>
        </View>
      </Pressable>

      {menuOpen && (
        <View style={cardStyles.menuAbsolute}>
          <Pressable style={cardStyles.menuItem} onPress={() => { setMenuOpen(false); onPress(); }}>
            <Text style={cardStyles.menuItemText}>👁  {tr('screens.library.viewDetails', 'View details')}</Text>
          </Pressable>
          {album.status !== 'PUBLIC' && (
            <Pressable style={cardStyles.menuItem} onPress={() => { setMenuOpen(false); onPublish(); }}>
              <Text style={cardStyles.menuItemText}>🚀  {tr('screens.library.publish', 'Publish')}</Text>
            </Pressable>
          )}
          {album.status === 'PUBLIC' && (
            <Pressable style={cardStyles.menuItem} onPress={() => { setMenuOpen(false); onUnpublish(); }}>
              <Text style={cardStyles.menuItemText}>🔒  {tr('screens.library.setPrivate', 'Set private')}</Text>
            </Pressable>
          )}
          <Pressable style={cardStyles.menuItem} onPress={() => { setMenuOpen(false); onShare(); }}>
            <Text style={cardStyles.menuItemText}>↗  {tr('common.share', 'Share')}</Text>
          </Pressable>
          <View style={cardStyles.menuDivider} />
          <Pressable style={cardStyles.menuItem} onPress={() => { setMenuOpen(false); onDelete(); }}>
            <Text style={[cardStyles.menuItemText, { color: themeColors.error }]}><AntDesign name="delete" color={themeColors.error} size={15} />  {tr('screens.library.deleteAlbum', 'Delete album')}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

const getGridCardStyles = (c: ColorScheme) => StyleSheet.create({
  gridItem: {
    width: '47%',
    marginBottom: 20,
    zIndex: 1, // needed for absolute menu dropping down
  },
  gridThumb: {
    aspectRatio: 1,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: c.surfaceLow,
  },
  gridTitle: { color: c.white, fontSize: 13, fontWeight: '700', marginTop: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  status: { fontSize: 11, fontWeight: '600' },
  dot: { color: c.glass25 },
  count: { color: c.glass45, fontSize: 11 },
  menuBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: c.scrim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: { color: c.white, fontSize: 14, letterSpacing: 1, marginTop: -4 },
  visibilityBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  menuAbsolute: {
    position: 'absolute',
    top: 44,
    right: 8,
    width: 150,
    backgroundColor: c.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.glass12,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 100, // Make sure menu overlap other grids
    overflow: 'hidden',
  },
  menuItem: { paddingHorizontal: 14, paddingVertical: 12 },
  menuItemText: { color: c.white, fontSize: 13 },
  menuDivider: { height: 1, backgroundColor: c.glass08 },
});

// ─── Create Album Modal ───────────────────────────────────────────────────────

const CreateAlbumModal = ({
  visible,
  onClose,
  onCreate,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (title: string, cover?: { uri: string; fileName?: string; mimeType?: string } | null) => Promise<void>;
}) => {
  const themeColors = useThemeColors();
  const modalStyles = useMemo(() => getModalStyles(themeColors), [themeColors]);
  const [title, setTitle] = useState('');
  const [cover, setCover] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [loading, setLoading] = useState(false);

  const pickCover = async () => {
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.9,
    });
    if (picked.canceled || !picked.assets?.length) return;
    setCover(picked.assets[0]);
  };

  const handleCreate = async () => {
    if (!title.trim()) return;
    setLoading(true);
    try { await onCreate(title.trim(), cover); setTitle(''); setCover(null); }
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
            placeholderTextColor={themeColors.glass30}
            autoFocus
          />
          <Pressable style={modalStyles.coverPicker} onPress={pickCover}>
            <Text style={modalStyles.coverPickerText}>
              {cover
                ? `${tr('screens.library.albumCoverSelected', 'Cover selected')}: ${cover.fileName ?? cover.uri.split('/').pop()}`
                : tr('screens.library.albumCoverPick', 'Pick album cover (optional)')}
            </Text>
          </Pressable>
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
                ? <ActivityIndicator size="small" color={themeColors.white} />
                : <Text style={modalStyles.createText}>{tr('common.create', 'Create')}</Text>
              }
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const getModalStyles = (c: ColorScheme) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: c.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: c.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: c.glass10,
    padding: 20,
  },
  title: { color: c.white, fontSize: 18, fontWeight: '700', marginBottom: 14 },
  input: {
    backgroundColor: c.surfaceLow,
    borderWidth: 1,
    borderColor: c.glass15,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: c.white,
    fontSize: 15,
    marginBottom: 16,
  },
  actions: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: c.glass08,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: c.glass12,
  },
  cancelText: { color: c.glass60, fontWeight: '600' },
  createBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: c.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createText: { color: c.white, fontWeight: '700' },
  coverPicker: {
    backgroundColor: c.surfaceLow,
    borderWidth: 1,
    borderColor: c.glass15,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 12,
  },
  coverPickerText: { color: c.glass60, fontSize: 13 },
});

const getSheetStyles = (c: ColorScheme) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: c.scrim },
  sheet: {
    backgroundColor: c.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    paddingBottom: 32,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.glass20,
    alignSelf: 'center',
    marginBottom: 14,
  },
  title: { color: c.white, fontSize: 17, fontWeight: '700', marginBottom: 2 },
  subtitle: { color: c.glass45, fontSize: 13, marginBottom: 12 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, gap: 10 },
  itemIcon: { fontSize: 18 },
  itemText: { flex: 1, color: c.white, fontSize: 14, fontWeight: '500' },
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
}) => {
  const themeColors = useThemeColors();
  const qrStyles = useMemo(() => getQrStyles(themeColors), [themeColors]);
  return (
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
};

const getQrStyles = (c: ColorScheme) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: c.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  card: {
    width: '100%',
    backgroundColor: c.surface,
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  title: { color: c.white, fontSize: 17, fontWeight: '700' },
  image: { width: 220, height: 220, borderRadius: 12 },
  placeholder: {
    width: 220, height: 220, borderRadius: 12,
    backgroundColor: c.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: { color: c.glass40, fontSize: 24 },
  link: { color: c.glass50, fontSize: 11, textAlign: 'center' },
  closeBtn: {
    backgroundColor: c.accentDim,
    borderRadius: 999,
    paddingHorizontal: 28,
    paddingVertical: 10,
    marginTop: 4,
  },
  closeBtnText: { color: c.white, fontWeight: '700' },
});

// ─── Share Options Bottom Sheet ───────────────────────────────────────────────

type ShareItemType = 'playlist' | 'song' | 'album';

interface ShareOptionsSheetProps {
  visible: boolean;
  item: { type: ShareItemType; id: string; title: string } | null;
  onClose: () => void;
  onExternal: () => void;
  onDiscovery: () => void;
  onQr: (item: { type: ShareItemType; id: string; title: string }) => void;
}

const ShareOptionsSheet = ({ visible, item, onClose, onExternal, onDiscovery, onQr }: ShareOptionsSheetProps) => {
  const themeColors = useThemeColors();
  const sheetStyles = useMemo(() => getSheetStyles(themeColors), [themeColors]);
  const shareOptionStyles = useMemo(() => getShareOptionStyles(themeColors), [themeColors]);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={sheetStyles.overlay} onPress={onClose} />
      <View style={sheetStyles.sheet}>
        <View style={sheetStyles.handle} />
        <Text style={sheetStyles.title}>{tr('common.share', 'Share')}</Text>
        <Text style={sheetStyles.subtitle} numberOfLines={1}>{item?.title}</Text>

        <Pressable style={shareOptionStyles.option} onPress={() => { onClose(); onDiscovery(); }}>
          <View style={[shareOptionStyles.iconWrap, { backgroundColor: themeColors.gradIndigo }]}>
            <Text style={{ fontSize: 20 }}>🌟</Text>
          </View>
          <View style={shareOptionStyles.info}>
            <Text style={shareOptionStyles.label}>{tr('screens.library.shareToDiscovery', 'Share to Discovery')}</Text>
            <Text style={shareOptionStyles.desc}>{tr('screens.library.shareToDiscoveryDesc', 'Post to the community feed')}</Text>
          </View>
        </Pressable>

        <Pressable style={shareOptionStyles.option} onPress={() => { onClose(); onExternal(); }}>
          <View style={[shareOptionStyles.iconWrap, { backgroundColor: themeColors.accentAlt }]}>
            <Text style={{ fontSize: 20 }}>↗</Text>
          </View>
          <View style={shareOptionStyles.info}>
            <Text style={shareOptionStyles.label}>{tr('screens.library.shareOutsideApp', 'Share outside app')}</Text>
            <Text style={shareOptionStyles.desc}>{tr('screens.library.shareOutsideAppDesc', 'Send link via message or social networks...')}</Text>
          </View>
        </Pressable>

        <Pressable
          style={shareOptionStyles.option}
          onPress={() => {
            if (!item) return;
            const it = item;
            onClose();
            onQr(it);
          }}
        >
          <View style={[shareOptionStyles.iconWrap, { backgroundColor: themeColors.surfaceMid }]}>
            <Text style={{ fontSize: 20 }}>📱</Text>
          </View>
          <View style={shareOptionStyles.info}>
            <Text style={shareOptionStyles.label}>{tr('screens.library.shareViaQr', 'Share via QR code')}</Text>
            <Text style={shareOptionStyles.desc}>{tr('screens.library.shareViaQrDesc', 'Show a QR others can scan to open the link')}</Text>
          </View>
        </Pressable>

        <Pressable style={shareOptionStyles.cancelBtn} onPress={onClose}>
          <Text style={shareOptionStyles.cancelText}>{tr('common.cancel', 'Cancel')}</Text>
        </Pressable>
      </View>
    </Modal>
  );
};

const getShareOptionStyles = (c: ColorScheme) => StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    gap: 14,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  label: { color: c.white, fontSize: 15, fontWeight: '600' },
  desc: { color: c.glass45, fontSize: 12, marginTop: 2 },
  cancelBtn: {
    marginTop: 8,
    paddingVertical: 13,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: c.glass08,
  },
  cancelText: { color: c.glass60, fontSize: 15 },
});

// ─── Share to Discovery Modal ─────────────────────────────────────────────────

interface ShareToDiscoveryModalProps {
  visible: boolean;
  item: { type: ShareItemType; id: string; title: string } | null;
  onClose: () => void;
  onPost: (title: string, caption: string, visibility: 'PUBLIC' | 'FOLLOWERS_ONLY' | 'PRIVATE') => Promise<void>;
}

const DISCOVERY_VISIBILITY_OPTIONS: { value: 'PUBLIC' | 'FOLLOWERS_ONLY' | 'PRIVATE'; label: string }[] = [
  { value: 'PUBLIC', label: '🌐 Công khai' },
  { value: 'FOLLOWERS_ONLY', label: '👥 Người theo dõi' },
  { value: 'PRIVATE', label: '🔒 Riêng tư' },
];

const ShareToDiscoveryModal = ({ visible, item, onClose, onPost }: ShareToDiscoveryModalProps) => {
  const insets = useSafeAreaInsets();
  const themeColors = useThemeColors();
  const discoveryShareStyles = useMemo(() => getDiscoveryShareStyles(themeColors), [themeColors]);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'FOLLOWERS_ONLY' | 'PRIVATE'>('PUBLIC');
  const [posting, setPosting] = useState(false);

  React.useEffect(() => {
    if (item && visible) {
      const typeLabel = item.type === 'playlist' ? 'danh sách phát' : item.type === 'album' ? 'album' : 'bài hát';
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
                ? <ActivityIndicator size="small" color={themeColors.white} />
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
              placeholderTextColor={themeColors.glass25}
              multiline
              autoFocus
            />
            <TextInput
              style={discoveryShareStyles.captionInput}
              value={caption}
              onChangeText={setCaption}
              placeholder="Mô tả thêm cho mọi người..."
              placeholderTextColor={themeColors.glass20}
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

const getDiscoveryShareStyles = (c: ColorScheme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cancelBtn: { minWidth: 48 },
  cancelText: { color: c.glass60, fontSize: 15 },
  headerTitle: { color: c.white, fontSize: 16, fontWeight: '700' },
  postBtn: {
    backgroundColor: c.accentDim,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 8,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postBtnDisabled: { opacity: 0.35 },
  postBtnText: { color: c.white, fontWeight: '700', fontSize: 14 },
  divider: { height: 1, backgroundColor: c.glass08 },
  body: { flex: 1, paddingHorizontal: 16 },
  contentBadge: {
    marginTop: 16,
    marginBottom: 12,
    alignSelf: 'flex-start',
    backgroundColor: c.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: c.glass12,
  },
  contentBadgeText: { color: c.glass60, fontSize: 13 },
  contentBadgeName: { color: c.white, fontWeight: '600' },
  titleInput: {
    color: c.white,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 26,
    minHeight: 56,
    textAlignVertical: 'top',
  },
  captionInput: {
    color: c.glass70,
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
    borderTopColor: c.glass08,
    marginTop: 12,
  },
  visibilityLabel: { color: c.glass50, fontSize: 13, fontWeight: '600', marginRight: 4 },
  visChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: c.glass08,
    borderWidth: 1,
    borderColor: c.glass12,
  },
  visChipActive: { borderColor: c.accent, backgroundColor: c.accentFill20 },
  visChipText: { color: c.glass60, fontSize: 12, fontWeight: '600' },
  visChipTextActive: { color: c.accent },
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
  const themeColors = useThemeColors();
  const albumDetailStyles = useMemo(() => getAlbumDetailStyles(themeColors), [themeColors]);
  const sheetStyles = useMemo(() => getSheetStyles(themeColors), [themeColors]);
  const [album, setAlbum] = useState<Album | null>(null);
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const { playSong } = usePlayerControls();

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
    (s.status === 'PUBLIC' || s.status === 'PRIVATE') &&
    !album?.songs?.some(as => as.id === s.id)
  );

  const queue = (album?.songs ?? []) as Song[];

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
          <Pressable onPress={() => setAddOpen(true)} style={albumDetailStyles.addBtn}>
            <Text style={albumDetailStyles.addBtnText}>+ Thêm bài</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={albumDetailStyles.center}>
            <ActivityIndicator color={themeColors.accent} />
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Album meta */}
            <View style={albumDetailStyles.meta}>
              <LinearGradient
                colors={[themeColors.gradPurple, themeColors.gradIndigo]}
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
                        if ((song as Song).id) {
                          playSong(song as Song, queue);
                        }
                      }}
                    >
                      {thumbUrl ? (
                        <Image source={{ uri: thumbUrl }} style={albumDetailStyles.songThumb} />
                      ) : (
                        <View style={[albumDetailStyles.songThumb, { backgroundColor: themeColors.surface, alignItems: 'center', justifyContent: 'center' }]}>
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
            <Text style={sheetStyles.subtitle}>Bài hát của bạn (PUBLIC hoặc PRIVATE, đã transcode xong)</Text>
            {availableSongs.length === 0 ? (
              <Text style={{ color: themeColors.glass40, padding: 16, textAlign: 'center' }}>
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
                      <Text style={{ color: themeColors.glass40, fontSize: 11 }}>
                        {s.status === 'PUBLIC' ? '🌐 Công khai' : '🔒 Riêng tư'}
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

const getAlbumDetailStyles = (c: ColorScheme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.glass08,
    gap: 12,
  },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: c.glass08, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { color: c.glass60, fontSize: 14 },
  title: { flex: 1, color: c.white, fontSize: 17, fontWeight: '700' },
  addBtn: { backgroundColor: c.accentDim, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  addBtnText: { color: c.white, fontSize: 13, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  meta: { flexDirection: 'row', gap: 16, padding: 20, alignItems: 'center' },
  coverArt: { width: 84, height: 84, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  metaInfo: { flex: 1, gap: 4 },
  metaTitle: { color: c.white, fontSize: 18, fontWeight: '800' },
  metaBadge: { alignSelf: 'flex-start' },
  metaStatus: { color: c.glass60, fontSize: 13 },
  metaCount: { color: c.glass40, fontSize: 12 },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { color: c.glass40, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: c.glass06,
  },
  songMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  songThumb: { width: 44, height: 44, borderRadius: 8 },
  songTitle: { color: c.white, fontSize: 14, fontWeight: '600' },
  songArtist: { color: c.glass45, fontSize: 12, marginTop: 2 },
  removeBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: c.glass08, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  removeBtnText: { color: c.glass45, fontSize: 12 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const LibraryScreen = () => {
  const insets = useSafeAreaInsets();
  const layout = useLayoutConstants();
  const navigation = useNavigation<any>();
  const { authSession } = useAuth();
  const { t } = useTranslation();
  const themeColors = useThemeColors();
  const styles = useMemo(() => getMainLibraryStyles(themeColors), [themeColors]);
  const modalStyles = useMemo(() => getModalStyles(themeColors), [themeColors]);
  tr = t;
  const { playSong } = usePlayerControls();
  const { currentSong } = usePlayerState();
  const { isPlaying } = usePlayerStatus();
  const { toast, show: showToast, hide: hideToast } = useToast();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const dataSignatureRef = useRef<string>('');

  const [activeTab, setActiveTab] = useState<Tab>('playlists');
  const [displayedTab, setDisplayedTab] = useState<Tab>('playlists');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artistProfile, setArtistProfile] = useState<ArtistProfile | null>(null);
  const [hasActiveSub, setHasActiveSub] = useState(false);
  const [canCreateAlbumByPlan, setCanCreateAlbumByPlan] = useState(false);

  // Modals
  const [addSongTo, setAddSongTo] = useState<Song | null>(null);
  const [createPlaylistOpen, setCreatePlaylistOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [createAlbumOpen, setCreateAlbumOpen] = useState(false);
  const [detailAlbumId, setDetailAlbumId] = useState<string | null>(null);
  const [editPlaylist, setEditPlaylist] = useState<Playlist | null>(null);
  const [editPlaylistName, setEditPlaylistName] = useState('');
  const [aiFinSongId, setAiFinSongId] = useState<string | null>(null);

  // Share flow
  const [shareOptionsItem, setShareOptionsItem] = useState<{ type: ShareItemType; id: string; title: string } | null>(null);
  const [discoveryShareItem, setDiscoveryShareItem] = useState<{ type: ShareItemType; id: string; title: string } | null>(null);
  const [shareQrData, setShareQrData] = useState<{ link: string; image?: string } | null>(null);

  const userScope = authSession?.profile?.id ?? authSession?.tokens?.accessToken?.slice(-24) ?? 'anonymous';

  // ── Smart Playlists ────────────────────────────────────────────────────────
  const userId = authSession?.profile?.id ?? null;
  const { playlists: smartPlaylists, loading: smartLoading, refresh: refreshSmart, dismiss: dismissSmart } = useSmartPlaylists(userId);

  const load = async (
    mode: 'initial' | 'refresh' | 'silent' = 'initial',
    opts?: { skipIfFresh?: boolean },
  ) => {
    const cacheKey = getLibraryCacheStorageKey(userScope);
    const shouldHydrate = mode === 'initial';
    const shouldCheckStaleness = Boolean(opts?.skipIfFresh) && mode !== 'refresh';

    let cacheUpdatedAt: number | null = null;
    if (shouldHydrate || shouldCheckStaleness) {
      const cached = await loadCache<LibraryCachePayload>(cacheKey);
      if (cached) {
        cacheUpdatedAt = cached.updatedAt;
        if (shouldHydrate) {
          setPlaylists(cached.data.playlists ?? []);
          setSongs(cached.data.songs ?? []);
          setAlbums(cached.data.albums ?? []);
          setArtistProfile(cached.data.artistProfile ?? null);
          setHasActiveSub(!!cached.data.hasActiveSub);
          setCanCreateAlbumByPlan(!!cached.data.canCreateAlbumByPlan);
          dataSignatureRef.current = JSON.stringify({
            pl: (cached.data.playlists ?? []).map(p => `${p.id}:${p.totalSongs ?? 0}:${p.slug ?? ''}:${p.name ?? ''}`),
            so: (cached.data.songs ?? []).map(s => `${s.id}:${s.status}:${s.transcodeStatus}:${s.sourceType ?? ''}:${s.title ?? ''}`),
            al: (cached.data.albums ?? []).map(a => `${a.id}:${a.status}:${a.title ?? ''}:${(a.totalSongs ?? a.songs?.length ?? 0)}`),
            artist: cached.data.artistProfile?.id ?? 'none',
            hasSub: Boolean(cached.data.hasActiveSub),
            canAlbum: Boolean(cached.data.canCreateAlbumByPlan),
          });
        }
      }
    }

    if (shouldCheckStaleness && cacheUpdatedAt != null) {
      const age = Date.now() - cacheUpdatedAt;
      if (age < LIBRARY_STALE_MS) {
        setLoading(false);
        return;
      }
    }
    try {
      if (mode === 'initial') {
        // Only block if we have nothing to render yet.
        const hasUI = playlists.length > 0 || songs.length > 0 || albums.length > 0;
        if (!hasUI) setLoading(true);
      }
      if (mode === 'refresh') setRefreshing(true);
      const [plRes, soRes, alRes, artistRes, subRes] = await Promise.allSettled([
        fetchWithRetry(() => getMyPlaylists({ page: 1, size: 50 }), 2),
        fetchWithRetry(() => getMySongs({ page: 1, size: 50 }), 2),
        fetchWithRetry(() => getMyAlbums({ page: 1, size: 50 }), 2),
        fetchWithRetry(() => apiClient.get<ArtistProfile>('/artists/me'), 1),
        fetchWithRetry(() => getMySubscription(), 1),
      ]);

      const nextPlaylists = plRes.status === 'fulfilled' ? (plRes.value.content ?? []) : playlists;
      const nextSongs = soRes.status === 'fulfilled' ? (soRes.value.content ?? []) : songs;
      const nextAlbums = alRes.status === 'fulfilled' ? (alRes.value.content ?? []) : albums;
      const nextArtist = artistRes.status === 'fulfilled' ? (artistRes.value.data ?? null) : (artistProfile ?? null);

      let nextHasActiveSub = false;
      let nextCanCreateAlbumByPlan = false;
      if (subRes.status === 'fulfilled') {
        const sub = subRes.value;
        const active =
            sub?.status === 'ACTIVE' &&
            Boolean(sub.expiresAt) &&
            new Date(sub.expiresAt as string).getTime() > Date.now();
        const features = sub?.plan?.features ?? {};
        const hasAlbumFeature = Boolean(features.create_album ?? features.can_become_artist);
        nextHasActiveSub = active;
        nextCanCreateAlbumByPlan = active && hasAlbumFeature;
      }

      const nextSignature = JSON.stringify({
        pl: nextPlaylists.map(p => `${p.id}:${p.totalSongs ?? 0}:${p.slug ?? ''}:${p.name ?? ''}`),
        so: nextSongs.map(s => `${s.id}:${s.status}:${s.transcodeStatus}:${s.sourceType ?? ''}:${s.title ?? ''}`),
        al: nextAlbums.map(a => `${a.id}:${a.status}:${a.title ?? ''}:${(a.totalSongs ?? a.songs?.length ?? 0)}`),
        artist: nextArtist?.id ?? 'none',
        hasSub: nextHasActiveSub,
        canAlbum: nextCanCreateAlbumByPlan,
      });

      if (dataSignatureRef.current !== nextSignature) {
        dataSignatureRef.current = nextSignature;
        if (plRes.status === 'fulfilled') setPlaylists(nextPlaylists);
        if (soRes.status === 'fulfilled') setSongs(nextSongs);
        if (alRes.status === 'fulfilled') setAlbums(nextAlbums);
        if (artistRes.status === 'fulfilled') setArtistProfile(nextArtist);
        setHasActiveSub(nextHasActiveSub);
        setCanCreateAlbumByPlan(nextCanCreateAlbumByPlan);
      }

      if (soRes.status === 'rejected') {
        const err: any = soRes.reason;
        const status = err?.response?.status;
        const backendMessage = err?.response?.data?.message;
        console.warn('Tải bài hát thất bại', { status, data: err?.response?.data, message: err?.message });
        if (mode !== 'silent') {
          showToast(
            `${t('screens.library.loadSongsFailedTitle', 'Failed to load songs')}: ${backendMessage || err?.message || t('errors.tryAgain', 'Please try again.')}`,
            'error',
          );
        }
      }

      if (plRes.status === 'fulfilled' || soRes.status === 'fulfilled' || alRes.status === 'fulfilled') {
        void saveCache(cacheKey, {
          playlists: nextPlaylists,
          songs: nextSongs,
          albums: nextAlbums,
          artistProfile: nextArtist,
          hasActiveSub: nextHasActiveSub,
          canCreateAlbumByPlan: nextCanCreateAlbumByPlan,
          updatedAt: Date.now(),
        } satisfies LibraryCachePayload);
      }
    } finally {
      setLoading(false);
      if (mode === 'refresh') setRefreshing(false);
    }
  };

  useEffect(() => {
    void load('initial');
  }, [authSession?.tokens.accessToken]);

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
        type === 'song' ? await getSongShareLink(id) :
          await getAlbumShareLink(id);
      const deep = res.mobileDeepLink?.trim();
      const msg = deep
        ? `${title}\n${res.shareUrl}\n${t('screens.library.shareOpenInApp', 'Open in app')}: ${deep}`
        : `${title}\n${res.shareUrl}`;
      await Share.share({ message: msg });
    } catch (e: any) {
      showToast(e?.message ?? t('screens.library.cannotShare', 'Cannot share.'), 'error');
    }
  };

  const handleShareQrForItem = async (item: { type: ShareItemType; id: string; title: string }) => {
    try {
      const res = item.type === 'playlist'
        ? await getPlaylistShareQr(item.id)
        : item.type === 'song'
          ? await getSongShareQr(item.id)
          : await getAlbumShareQr(item.id);
      setShareQrData({
        link: res.shareUrl,
        image: res.qrCodeBase64 ?? undefined,
      });
    } catch (e: any) {
      showToast(e?.message ?? t('screens.library.cannotShare', 'Cannot share.'), 'error');
    }
  };

  const handleDiscoveryPost = async (title: string, caption: string, visibility: 'PUBLIC' | 'FOLLOWERS_ONLY' | 'PRIVATE') => {
    if (!discoveryShareItem) return;
    try {
      const contentType = discoveryShareItem.type === 'playlist' ? 'PLAYLIST' :
        discoveryShareItem.type === 'album' ? 'ALBUM' : 'SONG';
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
      {
        text: t('common.delete'), style: 'destructive', onPress: async () => {
          await deletePlaylist(p.id);
          await load('silent');
        }
      },
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
      await load('silent');
    } catch (e: any) {
      showToast(e?.message ?? t('screens.library.cannotUpdate', 'Cannot update.'), 'error');
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim() || creatingPlaylist) return;
    const playlistName = newPlaylistName.trim();
    setCreatingPlaylist(true);
    try {
      const created = await createPlaylist({
        name: playlistName,
        visibility: 'PUBLIC',
      });

      setPlaylists((prev) => [created, ...prev.filter((p) => p.id !== created.id)]);
      setNewPlaylistName('');
      setCreatePlaylistOpen(false);
      showToast(t('screens.library.createdPlaylist', 'Playlist created successfully.'), 'success');
      await load('silent');
    } catch (e: any) {
      showToast(e?.message ?? t('screens.library.cannotCreatePlaylist', 'Cannot create playlist.'), 'error');
    } finally {
      setCreatingPlaylist(false);
    }
  };

  // ── Album actions ─────────────────────────────────────────────────────────
  const uploadFileNative = (params: {
    url: string;
    uri: string;
    mimeType: string;
    fileName: string;
  }): Promise<void> => new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', params.url);
    xhr.setRequestHeader('Content-Type', params.mimeType);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed HTTP ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error('Network error while uploading.'));
    xhr.ontimeout = () => reject(new Error('Upload timeout.'));
    xhr.send({ uri: params.uri, type: params.mimeType, name: params.fileName } as any);
  });

  const handleCreateAlbum = async (
    title: string,
    cover?: { uri: string; fileName?: string; mimeType?: string } | null,
  ) => {
    try {
      const coverExt = cover?.fileName?.split('.').pop()?.toLowerCase()
        ?? cover?.uri?.split('.').pop()?.toLowerCase();
      const created = await createAlbum({
        title,
        coverFileExtension: coverExt,
      });

      if (cover && created.coverUploadUrl) {
        await uploadFileNative({
          url: created.coverUploadUrl,
          uri: cover.uri,
          mimeType: cover.mimeType ?? 'image/jpeg',
          fileName: cover.fileName ?? `album-cover.${coverExt ?? 'jpg'}`,
        });
      }

      setCreateAlbumOpen(false);
      await load('silent');
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? t('screens.library.cannotCreateAlbum', 'Cannot create album.'));
    }
  };

  const handlePublishAlbum = async (albumId: string) => {
    try {
      await apiClient.post(`/albums/${albumId}/publish`);
      await load('silent');
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
      await load('silent');
    } catch (e: any) {
      showToast(e?.message ?? t('screens.library.cannotSetPrivate', 'Cannot set private.'), 'error');
    }
  };

  const handleDeleteAlbum = (a: Album) => {
    Alert.alert(t('screens.library.deleteAlbumConfirmTitle', 'Delete album?'), `"${a.title}" ${t('screens.library.deletePermanentlySuffix', 'will be deleted permanently.')}`, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'), style: 'destructive', onPress: async () => {
          try {
            await apiClient.delete(`/albums/${a.id}`);
            await load('silent');
          } catch (e: any) {
            showToast(e?.message ?? t('common.error', 'Error'), 'error');
          }
        }
      },
    ]);
  };

  // ── Add song to playlist ──────────────────────────────────────────────────
  const handleAddToPlaylist = async (playlistId: string) => {
    if (!addSongTo) return;
    if (isSoundCloudExternalSong(addSongTo)) {
      showToast(t('screens.library.soundcloudPlaylistNotSupported', 'SoundCloud track cannot be added to internal playlists.'), 'error');
      setAddSongTo(null);
      return;
    }
    const previousPlaylists = playlists;
    setPlaylists((prev) => prev.map((playlist) => (
      playlist.id === playlistId
        ? { ...playlist, totalSongs: (playlist.totalSongs ?? playlist.songs?.length ?? 0) + 1 }
        : playlist
    )));
    try {
      await addSongToPlaylist(playlistId, addSongTo.id);
      setAddSongTo(null);
      showToast(`${t('screens.library.songAddedToPlaylist', 'Song has been added to playlist.')} ✓`);
    } catch (e: any) {
      setPlaylists(previousPlaylists);
      showToast(e?.message ?? t('common.error', 'Error'), 'error');
    }
  };

  const handleCreateAndAddToPlaylist = async (name: string) => {
    if (!addSongTo) return;
    if (isSoundCloudExternalSong(addSongTo)) {
      showToast(t('screens.library.soundcloudPlaylistNotSupported', 'SoundCloud track cannot be added to internal playlists.'), 'error');
      setAddSongTo(null);
      return;
    }
    try {
      const pl = await createPlaylist({ name, visibility: 'PUBLIC' });
      await addSongToPlaylist(pl.id, addSongTo.id);
      setAddSongTo(null);
      await load('silent');
      showToast(`${t('screens.library.songAddedToPlaylist', 'Song has been added to playlist.')} ✓`);
    } catch (e: any) {
      showToast(e?.message ?? t('common.error', 'Error'), 'error');
    }
  };

  const handleAiFinalizeSong = async (songId: string, publish: boolean) => {
    setAiFinSongId(songId);
    try {
      await finalizeAiDraftSong(songId, publish);
      showToast(t('screens.library.aiFinalizeOk', 'Updated.'), 'success');
      await load('refresh');
    } catch (e: any) {
      showToast(
        e?.response?.data?.message ?? e?.message ?? t('common.error', 'Error'),
        'error',
      );
    } finally {
      setAiFinSongId(null);
    }
  };

  const handleDeleteDraftSong = async (songId: string) => {
    setAiFinSongId(songId);
    try {
      await deleteOwnedSong(songId);
      showToast(t('screens.library.aiDiscardDraftOk', 'Draft removed.'), 'success');
      await load('refresh');
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? e?.message ?? t('common.error', 'Error'), 'error');
    } finally {
      setAiFinSongId(null);
    }
  };

  const switchTab = useCallback((newTab: Tab) => {
    if (newTab === activeTab) return;

    setActiveTab(newTab);
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start(() => {
      setDisplayedTab(newTab);
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    });
  }, [activeTab, fadeAnim]);

  // ── Render content by tab ─────────────────────────────────────────────────
  const renderPlaylists = () => (
    <View style={styles.gridContainer}>
      {playlists.map(p => (
        <PlaylistCard
          key={p.id}
          playlist={p}
          onPress={() => navigation.navigate('PlaylistDetail', { slug: p.slug })}
          onEdit={() => { setEditPlaylist(p); setEditPlaylistName(p.name); }}
          onShare={() => openShareOptions('playlist', p.id, p.name)}
          onDelete={() => handleDeletePlaylist(p)}
        />
      ))}

      <Pressable
        style={styles.gridItemWrap}
        onPress={() => {
          setCreateAlbumOpen(false);
          setCreatePlaylistOpen(true);
        }}
      >
        <View style={styles.gridCreateThumb}>
          <MaterialCommunityIcons name="plus" color={themeColors.accent} size={36} />
        </View>
        <Text style={styles.gridCreateTitle}>{tr('screens.library.createNewPlaylist', 'Create')}</Text>
      </Pressable>
    </View>
  );

  const renderSongs = () => (
    songs.length === 0 ? (
      <View style={styles.empty}>
        <Text style={styles.emptyEmoji}><Entypo name="music" color={themeColors.accent} size={40} /></Text>
        <Text style={styles.emptyTitle}>{t('screens.library.noSongs', 'No songs yet')}</Text>
        <Text style={styles.emptySub}>{t('screens.library.noSongsHint', 'Upload songs in the Create tab')}</Text>
      </View>
    ) : (
      <FlashList
        data={songs}
        keyExtractor={(s) => s.id}
        drawDistance={500}
        renderItem={({ item: s }) => {
          const aiDraftPending =
            s.sourceType === 'AI' && s.status === 'DRAFT' && s.transcodeStatus === 'PENDING';
          return (
            <SongRow
              song={s}
              isActive={currentSong?.id === s.id}
              isPlaying={currentSong?.id === s.id && isPlaying}
              onPlay={() => playSong(s, songs)}
              onAddToPlaylist={() => setAddSongTo(s)}
              onShare={() => openShareOptions('song', s.id, s.title)}
              onEdit={isArtist ? () => navigation.navigate('EditSong', { songId: s.id }) : undefined}
              showAiReview={aiDraftPending}
              onAiPublish={aiDraftPending ? () => void handleAiFinalizeSong(s.id, true) : undefined}
              onAiKeepPrivate={aiDraftPending ? () => void handleAiFinalizeSong(s.id, false) : undefined}
              onAiDiscard={aiDraftPending ? () => void handleDeleteDraftSong(s.id) : undefined}
              aiFinalizeBusy={aiFinSongId === s.id}
            />
          );
        }}
      />
    )
  );

  const renderAlbums = () => (
    <>
      <View style={styles.gridContainer}>
        {albums.map(a => (
          <AlbumCard
            key={a.id}
            album={a}
            onPress={() => setDetailAlbumId(a.id)}
            onPublish={() => void handlePublishAlbum(a.id)}
            onUnpublish={() => void handleUnpublishAlbum(a.id)}
            onDelete={() => handleDeleteAlbum(a)}
            onShare={() => openShareOptions('album', a.id, a.title)}
          />
        ))}

        {canCreateAlbum && (
           <Pressable style={styles.gridItemWrap} onPress={() => setCreateAlbumOpen(true)}>
             <View style={styles.gridCreateThumb}>
               <MaterialCommunityIcons name="plus" color={themeColors.accent} size={36} />
             </View>
             <Text style={styles.gridCreateTitle}>{tr('screens.library.createNewAlbum', 'Create')}</Text>
           </Pressable>
        )}
      </View>

      {!canCreateAlbum && (
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

      {(!canCreateAlbum && albums.length === 0) && (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}><MaterialCommunityIcons name="album" color={themeColors.accent} size={40} /></Text>
          <Text style={styles.emptyTitle}>{t('screens.library.noAlbums', 'No albums yet')}</Text>
        </View>
      )}
    </>
  );

  const renderSmart = () => {
    if (smartLoading) {
      return (
        <View style={styles.empty}>
          <ActivityIndicator color={themeColors.accent} size="large" />
          <Text style={[styles.emptySub, { marginTop: 12 }]}>Đang phân tích lịch sử nghe...</Text>
        </View>
      );
    }
    if (smartPlaylists.length === 0) {
      return (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🎵</Text>
          <Text style={styles.emptyTitle}>Chưa có đủ dữ liệu</Text>
          <Text style={styles.emptySub}>Nghe thêm nhạc để TramCamXuc tạo playlist phù hợp với bạn</Text>
        </View>
      );
    }
    return (
      <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <View>
            <Text style={{ color: themeColors.white, fontSize: 13, fontWeight: '700' }}>
              ✨ Tự động tạo từ thói quen nghe nhạc
            </Text>
            <Text style={{ color: themeColors.muted, fontSize: 11, marginTop: 2 }}>
              Chỉ lưu trên thiết bị này · Cập nhật mỗi 6h
            </Text>
          </View>
          <Pressable
            onPress={() => void refreshSmart()}
            hitSlop={8}
            style={{ backgroundColor: themeColors.glass08, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: themeColors.glass12 }}
          >
            <Text style={{ color: themeColors.accent, fontSize: 12, fontWeight: '700' }}>Làm mới</Text>
          </Pressable>
        </View>
        {smartPlaylists.map((pl) => (
          <SmartPlaylistCard
            key={pl.id}
            playlist={pl}
            onPlay={(p) => {
              if (p.songs.length > 0) {
                playSong(p.songs[0], p.songs);
              }
            }}
            onDismiss={(id) => void dismissSmart(id)}
          />
        ))}
      </View>
    );
  };

  const renderContent = () => (
    displayedTab === 'playlists' ? renderPlaylists() :
      displayedTab === 'songs' ? renderSongs() :
        displayedTab === 'smart' ? renderSmart() :
          renderAlbums()
  );

  const showSkeleton = loading && songs.length === 0;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar style={getStatusBarStyle(themeColors.bg)} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { void load('refresh'); }}
            tintColor={themeColors.accent}
          />
        }
        contentContainerStyle={{ paddingBottom: layout.tabBarHeight + layout.miniPlayerHeight + 16 }}
      >
        {/* Header */}
        <LinearGradient
          colors={[themeColors.gradSlate, themeColors.bg]}
          style={[styles.header, { paddingTop: insets.top + 18 }]}
        >
          <MonuBrandHeaderTitle layout="hero" accentColor={themeColors.accent}>
            {t('navigation.headerLibrary', 'TramCamXuc · Thư viện')}
          </MonuBrandHeaderTitle>
          <Text style={styles.headerSub}>
            {playlists.length} {t('screens.library.tabPlaylists', 'playlists')} · {songs.length} {t('screens.library.tabSongs', 'songs')} · {albums.length} {t('screens.library.tabAlbums', 'albums')}
          </Text>
        </LinearGradient>

        {/* Tab bar */}
        <TabBar
          active={activeTab}
          onChange={switchTab}
          counts={{ playlists: playlists.length, songs: songs.length, albums: albums.length, smart: smartPlaylists.length }}
        />

        {/* Content */}
        <Animated.View style={[styles.tabContent, { opacity: fadeAnim }]}>
          {showSkeleton ? (
            <View style={styles.loadingWrap}>
              <SectionSkeleton rows={3} />
            </View>
          ) : (
            <>
              {loading ? (
                <ActivityIndicator size="small" color={themeColors.accent} style={styles.refreshIndicator} />
              ) : null}
              {renderContent()}
            </>
          )}
        </Animated.View>
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
            <Text style={modalStyles.title}>Sửa tên danh sách phát</Text>
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
              placeholderTextColor={themeColors.glass30}
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
                disabled={!newPlaylistName.trim() || creatingPlaylist}
              >
                {creatingPlaylist
                  ? <ActivityIndicator size="small" color={themeColors.white} />
                  : <Text style={modalStyles.createText}>{t('common.create', 'Create')}</Text>
                }
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
        onRefreshParent={() => void load('silent')}
        mySongs={songs}
      />

      {/* Add to playlist */}
      <AddToPlaylistSheet
        visible={!!addSongTo}
        songTitle={addSongTo?.title ?? ''}
        songSubtitle={addSongTo?.primaryArtist?.stageName}
        thumbnailUrl={addSongTo?.thumbnailUrl}
        playlists={playlists.map(p => ({ id: p.id, name: p.name, totalSongs: p.totalSongs }))}
        onClose={() => setAddSongTo(null)}
        onSelectPlaylist={handleAddToPlaylist}
        onCreateAndAdd={handleCreateAndAddToPlaylist}
        addDisabled={addSongTo ? isSoundCloudExternalSong(addSongTo) : false}
      />

      {/* Share options sheet */}
      <ShareOptionsSheet
        visible={!!shareOptionsItem}
        item={shareOptionsItem}
        onClose={() => setShareOptionsItem(null)}
        onExternal={() => void handleShareExternal()}
        onDiscovery={() => setDiscoveryShareItem(shareOptionsItem)}
        onQr={(it) => { void handleShareQrForItem(it); }}
      />

      <QrModal
        visible={!!shareQrData}
        link={shareQrData?.link ?? ''}
        image={shareQrData?.image}
        onClose={() => setShareQrData(null)}
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

const getMainLibraryStyles = (c: ColorScheme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 18,
    paddingTop: 2,
    alignItems: 'center',
  },
  headerSub: { color: c.glass40, fontSize: 13, marginTop: 4, textAlign: 'center' },

  loadingWrap: { paddingVertical: 48, alignItems: 'center' },
  refreshIndicator: { marginBottom: 12 },
  tabContent: { flex: 1 },

  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { color: c.white, fontSize: 18, fontWeight: '800', marginBottom: 6 },
  emptySub: { color: c.glass40, fontSize: 13, textAlign: 'center' },

  createBtn: {
    marginHorizontal: 20,
    marginBottom: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: c.accentBorder25,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  createBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    gap: 8,
    backgroundColor: c.accentFill20,
  },
  createBtnIcon: { color: c.accent, fontSize: 20, fontWeight: '300' },
  createBtnText: { color: c.accent, fontSize: 14, fontWeight: '700' },

  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  gridItemWrap: {
    width: '47%',
    marginBottom: 20,
  },
  gridCreateThumb: {
    aspectRatio: 1,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCreateTitle: {
    color: c.glass60,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
  },

  albumGateCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.glass10,
    backgroundColor: c.surface,
    gap: 8,
  },
  albumGateTitle: { color: c.white, fontSize: 16, fontWeight: '700' },
  albumGateSub: { color: c.glass50, fontSize: 13, lineHeight: 20 },
  albumGateBtn: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: c.accentDim,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  albumGateBtnText: { color: c.white, fontSize: 13, fontWeight: '700' },

  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.glass06,
    backgroundColor: c.surface,
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 16,
  },
  listItemThumb: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItemInfo: { flex: 1 },
  listItemTitle: { color: c.white, fontSize: 15, fontWeight: '600' },
  listItemSub: { color: c.glass45, fontSize: 12, marginTop: 2 },
  listItemActions: { flexDirection: 'row', gap: 4 },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: c.glass08,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnText: { color: c.glass60, fontSize: 13 },
});
