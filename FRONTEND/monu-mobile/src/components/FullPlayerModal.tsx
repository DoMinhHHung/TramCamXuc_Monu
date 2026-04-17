import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator, Animated, Dimensions, FlatList, Image,
    Modal, NativeScrollEvent, NativeSyntheticEvent, PanResponder,
    Pressable, ScrollView, StyleSheet, Text, View, Alert, Linking, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '../context/LocalizationContext';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';

import { COLORS, type ColorScheme, useThemeColors } from '../config/colors';
import { AudioQuality, RepeatMode, usePlayerControls, usePlayerState, usePlayerStatus } from '../context/PlayerContext';
import {
    addSongToPlaylist, createPlaylist, getLyric, getMyPlaylists,
    LyricLine, LyricResponse, Playlist,
} from '../services/music';
import { getSongShareQr } from '../services/social';
import { AddToPlaylistSheet } from './AddToPlaylistSheet';
import { SongActionSheet } from './SongActionSheet';
import { AppIcon } from '../config/appIcons';
import { HeartButton } from './HeartButton';
import { ReportReasonSheet } from './ReportReasonSheet';

const { width: SCREEN_W } = Dimensions.get('window');
const THUMB_RADIUS = 8;

const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
};

const QUALITY_OPTIONS: Array<{ value: AudioQuality; label: string }> = [
    { value: 64,  label: '64k'  },
    { value: 128, label: '128k' },
    { value: 256, label: '256k' },
    { value: 320, label: '320k' },
];

const RepeatIcon = ({ mode }: { mode: RepeatMode }) => {
    if (mode === 'one') return <AppIcon name="repeatOne" color="#fff" size={22} />;
    if (mode === 'all') return <AppIcon name="repeat" color="#fff" size={22} />;
    return <AppIcon name="repeat" color={COLORS.glass35} size={22} />;
};

// ─── Lyric Viewer ──────────────────────────────────────────────────────────────

interface LyricViewerProps {
    lyricData: LyricResponse | null;
    loading: boolean;
    error: string | null;
    currentTimeMs: number;
    onSeek?: (timeMs: number) => void;
}

const LyricViewer = React.memo(({ lyricData, loading, error, currentTimeMs, onSeek }: LyricViewerProps) => {
    const scrollRef = useRef<ScrollView>(null);
    const lineHeights = useRef<number[]>([]);
    const lastActiveIdx = useRef(-1);

    const isSynced = lyricData?.format === 'LRC' || lyricData?.format === 'SRT';
    const lines = lyricData?.lines ?? [];

    const activeIndex = isSynced
        ? findActiveLineIndex(lines, currentTimeMs)
        : -1;

    useEffect(() => {
        if (!isSynced || activeIndex < 0 || activeIndex === lastActiveIdx.current) return;
        lastActiveIdx.current = activeIndex;

        let yOffset = 0;
        for (let i = 0; i < activeIndex; i++) {
            yOffset += lineHeights.current[i] ?? 44;
        }
        const centeredOffset = Math.max(0, yOffset - 200);
        scrollRef.current?.scrollTo({ y: centeredOffset, animated: true });
    }, [activeIndex, isSynced]);

    if (loading) {
        return (
            <View style={lyricStyles.center}>
                <ActivityIndicator color={COLORS.accent} size="large" />
                <Text style={lyricStyles.loadingText}>Đang tải lời bài hát...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={lyricStyles.center}>
                <AppIcon name="emojiNotePad" size={48} color={COLORS.glass60} style={lyricStyles.noLyricIcon} />
                <Text style={lyricStyles.noLyricText}>{error}</Text>
            </View>
        );
    }

    if (!lyricData || lines.length === 0) {
        return (
            <View style={lyricStyles.center}>
                <AppIcon name="emojiMusic" size={48} color={COLORS.glass60} style={lyricStyles.noLyricIcon} />
                <Text style={lyricStyles.noLyricText}>Chưa có lời bài hát</Text>
            </View>
        );
    }

    return (
        <ScrollView
            ref={scrollRef}
            style={lyricStyles.scrollView}
            contentContainerStyle={lyricStyles.scrollContent}
            showsVerticalScrollIndicator={false}
        >
            <View style={lyricStyles.spacerTop} />
            {lines.map((line, idx) => {
                const isActive = idx === activeIndex;
                const isPast = isSynced && activeIndex >= 0 && idx < activeIndex;
                return (
                    <Pressable
                        key={idx}
                        onPress={() => {
                            if (isSynced && line.timeMs != null && onSeek) {
                                onSeek(line.timeMs / 1000);
                            }
                        }}
                        onLayout={e => {
                            lineHeights.current[idx] = e.nativeEvent.layout.height;
                        }}
                    >
                        <Text
                            style={[
                                lyricStyles.line,
                                isActive && lyricStyles.lineActive,
                                isPast && lyricStyles.linePast,
                                !isSynced && lyricStyles.lineUnsyced,
                            ]}
                        >
                            {line.text}
                        </Text>
                    </Pressable>
                );
            })}
            <View style={lyricStyles.spacerBottom} />
        </ScrollView>
    );
});

function findActiveLineIndex(lines: LyricLine[], currentTimeMs: number): number {
    if (lines.length === 0) return -1;
    let active = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].timeMs != null && lines[i].timeMs! <= currentTimeMs) {
            active = i;
        }
    }
    return active;
}

const lyricStyles = StyleSheet.create({
    center: {
        flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32,
    },
    loadingText: {
        color: COLORS.glass50, fontSize: 14, marginTop: 12,
    },
    noLyricIcon: { marginBottom: 12 },
    noLyricText: { color: COLORS.glass40, fontSize: 15, textAlign: 'center' },
    scrollView: { flex: 1 },
    scrollContent: { paddingHorizontal: 24 },
    spacerTop: { height: 40 },
    spacerBottom: { height: 200 },
    line: {
        color: COLORS.glass35,
        fontSize: 18,
        lineHeight: 32,
        fontWeight: '600',
        paddingVertical: 6,
        textAlign: 'center',
    },
    lineActive: {
        color: COLORS.white,
        fontSize: 22,
        fontWeight: '800',
        transform: [{ scale: 1.02 }],
    },
    linePast: {
        color: COLORS.glass25,
    },
    lineUnsyced: {
        color: COLORS.glass70,
        fontSize: 16,
        lineHeight: 28,
    },
});

// ─── Main Modal ────────────────────────────────────────────────────────────────

export const FullPlayerModal = () => {
    const insets = useSafeAreaInsets();
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const { t } = useTranslation();
    const themeColors = useThemeColors();
    const styles = useMemo(() => createStyles(themeColors), [themeColors]);
    const [menuOpen, setMenuOpen] = useState(false);
    const [playlistPickerOpen, setPlaylistPickerOpen] = useState(false);
    const [reportSheetOpen, setReportSheetOpen] = useState(false);
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [shareQr, setShareQr] = useState<string | null>(null);
    const [seekTrackWidth, setSeekTrackWidth] = useState(0);
    const [isSeeking, setIsSeeking] = useState(false);
    const [localSeekRatio, setLocalSeekRatio] = useState<number | null>(null);

    // Lyrics state
    const [activePage, setActivePage] = useState(0);
    const [lyricData, setLyricData] = useState<LyricResponse | null>(null);
    const [lyricLoading, setLyricLoading] = useState(false);
    const [lyricError, setLyricError] = useState<string | null>(null);
    const lyricFetchedForRef = useRef<string | null>(null);
    const pagerRef = useRef<ScrollView>(null);

    const { currentSong, isFullScreen, setFullScreen } = usePlayerState();
    const { isPlaying, isLoaded, currentTime, duration } = usePlayerStatus();
    const {
        togglePlay, seekTo, playNext, playPrev, stopPlayer,
        selectedQuality, maxQuality, setQuality,
        autoQuality, setAutoQuality, networkTier,
        repeatMode, isShuffled, cycleRepeatMode, toggleShuffle,
    } = usePlayerControls();

    const hasLyrics = !!currentSong?.lyricUrl;
    const currentTimeMs = currentTime * 1000;
    const isCompact = windowHeight < 780;
    const isVeryCompact = windowHeight < 700;
    const artworkSize = useMemo(() => {
        if (isVeryCompact) return Math.min(190, windowWidth - 72);
        if (isCompact) return Math.min(224, windowWidth - 72);
        return Math.min(260, windowWidth - 72);
    }, [isCompact, isVeryCompact, windowWidth]);

    const NETWORK_LABEL: Record<string, string> = {
        high: 'Mạng tốt', medium: 'Mạng trung bình', low: 'Mạng yếu', offline: 'Ngoại tuyến',
    };

    const networkQuality = useMemo(() => {
        if (networkTier === 'high') return 'good';
        if (networkTier === 'medium') return 'medium';
        if (networkTier === 'low') return 'bad';
        return 'offline';
    }, [networkTier]);

    const getColor = (quality: string) => {
        switch (quality) {
            case 'good':
                return '#22C55E'; // xanh
            case 'medium':
                return '#F59E0B'; // vang
            case 'bad':
                return '#EF4444'; // do
            default:
                return '#9CA3AF'; // xam
        }
    };

    const networkColor = getColor(networkQuality);

    // Fetch lyrics when song changes
    useEffect(() => {
        if (!isFullScreen || !currentSong) return;

        if (!hasLyrics) {
            setLyricData(null);
            setLyricError(null);
            lyricFetchedForRef.current = null;
            return;
        }

        if (lyricFetchedForRef.current === currentSong.id) return;
        lyricFetchedForRef.current = currentSong.id;

        setLyricLoading(true);
        setLyricError(null);
        getLyric(currentSong.id)
            .then(setLyricData)
            .catch(() => setLyricError('Không thể tải lời bài hát'))
            .finally(() => setLyricLoading(false));
    }, [isFullScreen, currentSong?.id, hasLyrics]);

    // Reset page when modal closes or song changes
    useEffect(() => {
        if (!isFullScreen) {
            setActivePage(0);
            pagerRef.current?.scrollTo({ x: 0, animated: false });
        }
    }, [isFullScreen, currentSong?.id]);

    // ── Swipe down → dismiss (vertical only) ─────────────────────────────────
    const translateY = useRef(new Animated.Value(0)).current;

    const dismissPan = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gs) =>
                gs.dy > 12 && Math.abs(gs.dy) > Math.abs(gs.dx) * 1.5,
            onPanResponderMove: (_, gs) => {
                if (gs.dy > 0) translateY.setValue(gs.dy);
            },
            onPanResponderRelease: (_, gs) => {
                if (gs.dy > 120) {
                    Animated.timing(translateY, { toValue: 900, duration: 250, useNativeDriver: true })
                        .start(() => {
                            translateY.setValue(0);
                            stopPlayer();
                            setFullScreen(false);
                        });
                } else {
                    Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
                }
            },
        }),
    ).current;

    const progress = duration > 0 ? currentTime / duration : 0;
    const displayedProgress = localSeekRatio ?? progress;

    const ratioFromLocationX = useCallback((locationX: number) => {
        if (seekTrackWidth <= 0 || duration <= 0) return;
        const clampedX = Math.max(0, Math.min(locationX, seekTrackWidth));
        return clampedX / seekTrackWidth;
    }, [duration, seekTrackWidth]);

    const updateLocalSeekFromLocationX = useCallback((locationX: number) => {
        const ratio = ratioFromLocationX(locationX);
        if (ratio == null) return;
        setLocalSeekRatio(ratio);
    }, [ratioFromLocationX]);

    const commitSeek = useCallback(() => {
        if (localSeekRatio == null || duration <= 0) return;
        seekTo(localSeekRatio * duration);
    }, [duration, localSeekRatio, seekTo]);

    const looksLikeSoundCloud = !!currentSong?.soundcloudId || !!currentSong?.soundcloudPermalink;
    const isSoundCloudTrack = currentSong?.sourceType === 'SOUNDCLOUD' || looksLikeSoundCloud;

    useEffect(() => {
        if (!isFullScreen) return;
        if (isSoundCloudTrack) {
            setPlaylists([]);
            return;
        }
        void (async () => {
            try {
                const data = await getMyPlaylists({ page: 1, size: 50 });
                setPlaylists(data.content ?? []);
            } catch { setPlaylists([]); }
        })();
    }, [isFullScreen, currentSong?.id, isSoundCloudTrack]);

    const openPlaylistPicker = () => {
        if (isSoundCloudTrack) {
            Alert.alert('Không hỗ trợ', 'Bài hát SoundCloud hiện không hỗ trợ thêm vào playlist.');
            return;
        }
        setPlaylistPickerOpen(true);
        void (async () => {
            try {
                const data = await getMyPlaylists({ page: 1, size: 50 });
                setPlaylists(data.content ?? []);
            } catch {}
        })();
    };

    const handlePageScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
        setActivePage(page);
    }, []);

    const goToPage = useCallback((page: number) => {
        pagerRef.current?.scrollTo({ x: page * SCREEN_W, animated: true });
        setActivePage(page);
    }, []);

    if (!currentSong) return null;

    const showLyricsTab = hasLyrics || lyricData;
    const isExternalTrack =
        isSoundCloudTrack
        || currentSong.sourceType === 'JAMENDO'
        || looksLikeSoundCloud;

    const openReportReasonPicker = () => {
        setReportSheetOpen(true);
    };

    return (
        <Modal
            visible={isFullScreen}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={() => setFullScreen(false)}
        >
            <Animated.View
                style={[{ flex: 1 }, { transform: [{ translateY }] }]}
                {...dismissPan.panHandlers}
            >
                {/* Clean dark background — không gradient nặng */}
                <View style={[styles.root, { paddingTop: insets.top }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Pressable onPress={() => setFullScreen(false)} hitSlop={12} style={styles.chevronBtn}>
                            <AppIcon name="chevronDown" size={28} color={COLORS.glass60} />
                        </Pressable>

                        {/* Page indicators */}
                        {showLyricsTab ? (
                            <View style={styles.pageIndicator}>
                                <Pressable onPress={() => goToPage(0)} hitSlop={4}>
                                    <Text style={[
                                        styles.pageIndicatorText,
                                        activePage === 0 && styles.pageIndicatorActive,
                                    ]}>Đang phát</Text>
                                </Pressable>
                                <View style={styles.pageDot} />
                                <Pressable onPress={() => goToPage(1)} hitSlop={4}>
                                    <Text style={[
                                        styles.pageIndicatorText,
                                        activePage === 1 && styles.pageIndicatorActive,
                                    ]}>Lời nhạc</Text>
                                </Pressable>
                            </View>
                        ) : (
                            <Text style={styles.headerTitle}>Đang phát</Text>
                        )}

                        <Pressable onPress={() => setMenuOpen(true)} hitSlop={10}>
                            <AppIcon name="more" size={22} color={COLORS.white} />
                        </Pressable>
                    </View>

                    {/* Horizontal pager */}
                    <ScrollView
                        ref={pagerRef}
                        horizontal
                        pagingEnabled
                        scrollEnabled={!!showLyricsTab}
                        showsHorizontalScrollIndicator={false}
                        onMomentumScrollEnd={handlePageScroll}
                        style={{ flex: 1 }}
                        bounces={false}
                    >
                        {/* ── Page 1: Player ─────────────────────────── */}
                        <View style={{ width: SCREEN_W, paddingHorizontal: 24 }}>
                            {/* Artwork */}
                            <View style={[styles.artworkSection, isCompact && { marginBottom: 14 }]}>
                                {currentSong.thumbnailUrl
                                    ? <Image source={{ uri: currentSong.thumbnailUrl }} style={[styles.artwork, { width: artworkSize, height: artworkSize }]} />
                                    : <View style={[styles.artwork, styles.artworkPlaceholder, { width: artworkSize, height: artworkSize }]}>
                                        <AppIcon name="musicNote" size={64} color={COLORS.glass35} />
                                    </View>
                                }
                            </View>

                            {/* Song info */}
                            <View style={[styles.songInfo, isCompact && { marginBottom: 14 }]}>
                                <Text
                                    style={[
                                        styles.songTitle,
                                        isCompact && { fontSize: isVeryCompact ? 18 : 20, marginBottom: 2 },
                                    ]}
                                    numberOfLines={2}
                                >
                                    {currentSong.title}
                                </Text>
                                <View style={styles.songMetaRow}>
                                    <Text style={styles.artistName} numberOfLines={1}>{currentSong.primaryArtist?.stageName}</Text>
                                    <View style={styles.heartWrap}>
                                        <HeartButton songId={currentSong.id} size={24} variant="card" />
                                    </View>
                                </View>
                                {currentSong.genres?.length > 0 && (
                                    <View style={styles.genreRow}>
                                        {currentSong.genres.slice(0, 3).map(g => (
                                            <View key={g.id} style={styles.genreChip}>
                                                <Text style={styles.genreText}>{g.name}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>

                            {/* Seek bar */}
                            <View style={[styles.progressSection, isCompact && { marginBottom: 14 }]}>
                                <View style={styles.seekTouchArea}>
                                    <View
                                        style={styles.seekTrack}
                                        onLayout={(e) => setSeekTrackWidth(e.nativeEvent.layout.width)}
                                        onStartShouldSetResponder={() => true}
                                        onMoveShouldSetResponder={() => true}
                                        onResponderGrant={(e) => {
                                            setIsSeeking(true);
                                            updateLocalSeekFromLocationX(e.nativeEvent.locationX);
                                        }}
                                        onResponderMove={(e) => {
                                            updateLocalSeekFromLocationX(e.nativeEvent.locationX);
                                        }}
                                        onResponderRelease={() => {
                                            commitSeek();
                                            setIsSeeking(false);
                                            setLocalSeekRatio(null);
                                        }}
                                        onResponderTerminate={() => {
                                            commitSeek();
                                            setIsSeeking(false);
                                            setLocalSeekRatio(null);
                                        }}
                                    >
                                        <View style={[styles.seekFill, { width: `${displayedProgress * 100}%` as any }]} />
                                        <View
                                            style={[
                                                styles.seekThumb,
                                                isSeeking && styles.seekThumbActive,
                                                { left: `${displayedProgress * 100}%` as any },
                                            ]}
                                        />
                                    </View>
                                </View>
                                <View style={styles.timeRow}>
                                    <Text style={styles.timeText}>{formatTime(displayedProgress * duration)}</Text>
                                    <Text style={styles.timeText}>{formatTime(duration)}</Text>
                                </View>
                            </View>

                            {/* Controls */}
                            <View style={[styles.controls, isCompact && { marginBottom: 6 }]}>
                                <Pressable style={styles.sideBtn} onPress={toggleShuffle} hitSlop={8}>
                                    <AppIcon
                                      name="shuffle"
                                      color={isShuffled ? COLORS.accent : COLORS.glass40}
                                      size={22}
                                    />
                                    {isShuffled && <View style={styles.modeDot} />}
                                </Pressable>

                                <Pressable style={styles.sideBtn} onPress={playPrev}>
                                    <AppIcon name="skipPrev" color={COLORS.glass80} size={32} />
                                </Pressable>

                                <Pressable style={styles.playBtn} onPress={togglePlay}>
                                    {!isLoaded
                                        ? <ActivityIndicator color={COLORS.bg} size="small" />
                                        : isPlaying
                                            ? <AppIcon name="pause" size={32} color={COLORS.bg} />
                                            : <AppIcon name="play" size={34} color={COLORS.bg} />
                                    }
                                </Pressable>

                                <Pressable style={styles.sideBtn} onPress={playNext}>
                                    <AppIcon name="skipNext" color={COLORS.glass80} size={32} />
                                </Pressable>

                                <Pressable style={styles.sideBtn} onPress={cycleRepeatMode} hitSlop={8}>
                                    <RepeatIcon mode={repeatMode} />
                                    {repeatMode !== 'none' && <View style={styles.modeDot} />}
                                </Pressable>
                            </View>

                            {/* Mode label */}
                            <View style={[styles.modeLabels, isCompact && { marginBottom: 10 }]}>
                                {isShuffled && (
                                    <Text style={styles.modeLabelText}><AppIcon name="shuffle" color="#34D399" size={13} /> Phát ngẫu nhiên</Text>
                                )}
                                {repeatMode === 'one' && (
                                    <Text style={styles.modeLabelText}><AppIcon name="repeatOne" color="#fff" size={13} /> Lặp bài này</Text>
                                )}
                                {repeatMode === 'all' && (
                                    <Text style={styles.modeLabelText}><AppIcon name="repeat" color="#fff" size={13} /> Lặp danh sách</Text>
                                )}
                            </View>

                            {/* Quality selector */}
                            {!isExternalTrack && (
                                <View style={[styles.qualitySection, isCompact && { marginBottom: 8 }]}>
                                    <View style={styles.qualityHeader}>
                                        <Text style={styles.qualityLabel}>Chất lượng âm thanh</Text>
                                        <Pressable
                                            style={[styles.autoBtn, autoQuality && styles.autoBtnActive]}
                                            onPress={() => setAutoQuality(!autoQuality)}
                                            hitSlop={8}
                                        >
                                            <Text style={[styles.autoBtnText, autoQuality && styles.autoBtnTextActive]}>
                                                Tự động
                                            </Text>
                                        </Pressable>
                                    </View>
                                    <View style={styles.qualityRow}>
                                        {QUALITY_OPTIONS.map(opt => {
                                            const isSelected  = selectedQuality === opt.value;
                                            const isAvailable = opt.value <= maxQuality;
                                            const dimmed      = autoQuality && !isSelected;
                                            return (
                                                <Pressable
                                                    key={opt.value}
                                                    style={[
                                                        styles.qualityBtn,
                                                        isSelected   && styles.qualityBtnActive,
                                                        !isAvailable && styles.qualityBtnLocked,
                                                        dimmed       && { opacity: 0.45 },
                                                    ]}
                                                    onPress={() => isAvailable && setQuality(opt.value)}
                                                    disabled={!isAvailable}
                                                >
                                                    <Text style={[
                                                        styles.qualityBtnText,
                                                        isSelected   && styles.qualityBtnTextActive,
                                                        !isAvailable && styles.qualityBtnTextLocked,
                                                    ]}>
                                                        {opt.label}
                                                    </Text>
                                                </Pressable>
                                            );
                                        })}
                                    </View>
                                    <Text style={styles.qualityHint}>
                                        {'Đang phát: '}
                                        <Text style={{ color: COLORS.accent }}>{selectedQuality}kbps</Text>
                                    </Text>
                                    {autoQuality ? (
                                        <View style={styles.networkHintRow}>
                                            <MaterialIcons
                                                name={networkTier === 'offline' ? 'signal-cellular-off' : 'network-check'}
                                                size={13}
                                                color={networkColor}
                                            />
                                            <Text style={[styles.networkHintText, { color: networkColor }]}>
                                                {NETWORK_LABEL[networkTier] ?? networkTier}
                                            </Text>
                                        </View>
                                    ) : (
                                        <Text style={styles.qualityHint}>
                                            {maxQuality < 320
                                                ? 'Nâng cấp Premium để mở chất lượng cao hơn'
                                                : 'Chất lượng tối đa'}
                                        </Text>
                                    )}
                                </View>
                            )}

                            {/* Lyric hint */}
                            {showLyricsTab && activePage === 0 && (
                                <Pressable style={styles.lyricHint} onPress={() => goToPage(1)}>
                                    <Text style={styles.lyricHintText}>
                                      <AppIcon name="emojiNotePad" size={13} color={COLORS.glass25} />{' '}
                                      Vuốt sang phải để xem lời nhạc
                                    </Text>
                                </Pressable>
                            )}

                            {/* Stats */}
                            <View style={styles.stats}>
                                <AppIcon name="headset" size={14} color={COLORS.glass30} />
                                <Text style={styles.statsText}>
                                    {'  '}{currentSong.playCount?.toLocaleString('vi-VN') ?? 0} lượt nghe
                                </Text>
                            </View>

                            <View style={{ height: insets.bottom + (isCompact ? 8 : 16) }} />

                            {currentSong.sourceType === 'SOUNDCLOUD' && currentSong.soundcloudPermalink && (
                                <Pressable
                                    style={styles.scAttribution}
                                    onPress={() => Linking.openURL(currentSong.soundcloudPermalink!)}
                                >
                                    <FontAwesome name="soundcloud" size={14} color="#FF5500" />
                                    <Text style={styles.scAttributionText}>
                                        {' '}Provided by SoundCloud{' '}
                                        <Text style={{ fontWeight: '700' }}>
                                            {currentSong.soundcloudUsername ?? 'SoundCloud'}
                                        </Text>
                                    </Text>
                                    <MaterialIcons name="open-in-new" size={14} color="#FF5500" style={{ marginLeft: 4 }} />
                                </Pressable>
                            )}
                        </View>

                        {/* ── Page 2: Lyrics ─────────────────────────── */}
                        {showLyricsTab && (
                            <View style={{ width: SCREEN_W }}>
                                {/* Mini player bar on lyrics page */}
                                <View style={styles.lyricMiniBar}>
                                    {currentSong.thumbnailUrl
                                        ? <Image source={{ uri: currentSong.thumbnailUrl }} style={styles.lyricMiniArt} />
                                        : <View style={[styles.lyricMiniArt, { backgroundColor: COLORS.accentFill20 }]}>
                                            <AppIcon name="emojiMusic" size={14} color={COLORS.white} />
                                        </View>
                                    }
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.lyricMiniTitle} numberOfLines={1}>{currentSong.title}</Text>
                                        <Text style={styles.lyricMiniArtist} numberOfLines={1}>{currentSong.primaryArtist?.stageName}</Text>
                                    </View>
                                    <Pressable onPress={togglePlay} hitSlop={8}>
                                        {isPlaying
                                            ? <AppIcon name="pause" size={24} color={COLORS.white} />
                                            : <AppIcon name="play" size={24} color={COLORS.white} />
                                        }
                                    </Pressable>
                                </View>

                                {/* Progress bar */}
                                <View style={styles.lyricProgress}>
                                    <View style={[styles.lyricProgressFill, { width: `${progress * 100}%` as any }]} />
                                </View>

                                {/* Lyrics content */}
                                <LyricViewer
                                    lyricData={lyricData}
                                    loading={lyricLoading}
                                    error={lyricError}
                                    currentTimeMs={currentTimeMs}
                                    onSeek={seekTo}
                                />

                                <View style={{ height: insets.bottom + 16 }} />
                            </View>
                        )}
                    </ScrollView>

                    {/* Action sheet */}
                    <SongActionSheet
                        visible={menuOpen}
                        title={currentSong.title}
                        subtitle={currentSong.primaryArtist?.stageName}
                        thumbnailUrl={currentSong.thumbnailUrl}
                        onClose={() => setMenuOpen(false)}
                        actions={[
                            {
                                icon: <AppIcon name="share" size={20} color={COLORS.white} />,
                                label: 'Chia sẻ qua QR',
                                onPress: async () => {
                                    const qr = await getSongShareQr(currentSong.id);
                                    setShareQr(qr.qrCodeBase64 || null);
                                },
                            },
                            ...(!isSoundCloudTrack ? [{
                                icon: <AppIcon name="addToPlaylist" size={20} color={COLORS.white} />,
                                label: 'Thêm vào playlist',
                                onPress: () => openPlaylistPicker(),
                            }] : []),
                            ...(isSoundCloudTrack && currentSong.soundcloudPermalink ? [{
                                icon: <FontAwesome name="soundcloud" size={20} color="#FF5500" />,
                                label: 'Mở trên SoundCloud',
                                onPress: async () => {
                                    if (currentSong.soundcloudPermalink) {
                                        await Linking.openURL(currentSong.soundcloudPermalink);
                                    }
                                },
                            }] : []),
                            {
                                icon: <AppIcon name="report" size={20} color={COLORS.error} />,
                                label: 'Báo cáo bài hát',
                                destructive: true,
                                separator: true,
                                onPress: openReportReasonPicker,
                            },
                            {
                                icon: <AppIcon name="stop" size={20} color={COLORS.white} />,
                                label: 'Dừng phát',
                                destructive: true,
                                onPress: () => stopPlayer(),
                            },
                        ]}
                    />

                    <ReportReasonSheet
                        visible={reportSheetOpen}
                        songId={currentSong.id}
                        source="full player"
                        onClose={() => setReportSheetOpen(false)}
                        t={t}
                    />

                    <AddToPlaylistSheet
                        visible={playlistPickerOpen}
                        songTitle={currentSong.title}
                        songSubtitle={currentSong.primaryArtist?.stageName}
                        thumbnailUrl={currentSong.thumbnailUrl}
                        playlists={playlists.map((p) => ({
                            id: p.id,
                            name: p.name,
                            totalSongs: p.totalSongs,
                        }))}
                        onClose={() => setPlaylistPickerOpen(false)}
                        onSelectPlaylist={async (playlistId) => {
                            if (isSoundCloudTrack) {
                                Alert.alert(
                                    t('common.error', 'Error'),
                                    t('screens.library.soundcloudPlaylistNotSupported', 'SoundCloud track cannot be added to internal playlists.'),
                                );
                                setPlaylistPickerOpen(false);
                                return;
                            }
                            try {
                                await addSongToPlaylist(playlistId, currentSong.id);
                                const plName = playlists.find((x) => x.id === playlistId)?.name ?? '';
                                Alert.alert(
                                    t('screens.library.addedTitle', 'Added'),
                                    plName
                                        ? `${t('screens.library.songAddedToPlaylist', 'Song added to playlist.')} (${plName})`
                                        : t('screens.library.songAddedToPlaylist', 'Song added to playlist.'),
                                );
                                setPlaylistPickerOpen(false);
                            } catch (error: any) {
                                Alert.alert(t('common.error', 'Error'), error?.message || t('common.error', 'Error'));
                            }
                        }}
                        onCreateAndAdd={async (name) => {
                            if (isSoundCloudTrack) {
                                Alert.alert(
                                    t('common.error', 'Error'),
                                    t('screens.library.soundcloudPlaylistNotSupported', 'SoundCloud track cannot be added to internal playlists.'),
                                );
                                setPlaylistPickerOpen(false);
                                return;
                            }
                            try {
                                const pl = await createPlaylist({ name: name.trim(), visibility: 'PUBLIC' });
                                await addSongToPlaylist(pl.id, currentSong.id);
                                setPlaylistPickerOpen(false);
                                Alert.alert(t('screens.library.addedTitle', 'Added'), t('screens.library.createdPlaylist', 'Playlist created.'));
                            } catch (error: any) {
                                Alert.alert(t('common.error', 'Error'), error?.message || t('common.error', 'Error'));
                            }
                        }}
                        addDisabled={isSoundCloudTrack}
                    />

                    {/* QR share */}
                    <Modal visible={!!shareQr} transparent animationType="fade" onRequestClose={() => setShareQr(null)}>
                        <Pressable style={styles.menuBackdrop} onPress={() => setShareQr(null)}>
                            <View style={styles.menuSheet}>
                                <Text style={styles.menuTitle}>QR Share</Text>
                                {shareQr
                                    ? <Image source={{ uri: shareQr }} style={{ width: 220, height: 220, borderRadius: 10, alignSelf: 'center' }} />
                                    : <Text style={styles.menuItem}>Không tạo được QR</Text>
                                }
                            </View>
                        </Pressable>
                    </Modal>
                </View>
            </Animated.View>
        </Modal>
    );
};

const createStyles = (c: ColorScheme) => StyleSheet.create({
    root:               { flex: 1, backgroundColor: c.bg },
    header:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 20 },
    chevronBtn:         { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
    headerTitle:        { color: c.glass50, fontSize: 12, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
    moreBtn:            { color: c.white, fontSize: 30, lineHeight: 30 },

    pageIndicator:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
    pageIndicatorText:  { color: c.glass35, fontSize: 12, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
    pageIndicatorActive: { color: c.white },
    pageDot:            { width: 4, height: 4, borderRadius: 2, backgroundColor: c.glass20 },

    artworkSection:     { alignItems: 'center', marginTop: 4, marginBottom: 24 },
    artwork:            { width: 260, height: 260, borderRadius: 18, backgroundColor: c.surface },
    artworkPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface },
    songInfo:           { marginBottom: 20 },
    songTitle:          { color: c.white, fontSize: 22, fontWeight: '800', marginBottom: 4 },
    songMetaRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
    artistName:         { color: c.glass60, fontSize: 14, fontWeight: '600', flex: 1 },
    heartWrap:          {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: c.glass07,
        borderWidth: 1,
        borderColor: c.glass12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.24,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 3,
    },
    externalBadge:      {
        alignSelf: 'flex-start',
        marginBottom: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: c.accentFill20,
        borderWidth: 1,
        borderColor: c.accentBorder25,
    },
    externalBadgeText:  { color: c.accent, fontSize: 11, fontWeight: '800' },
    genreRow:           { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    genreChip:          { backgroundColor: c.glass06, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: c.glass10 },
    genreText:          { color: c.glass60, fontSize: 11, fontWeight: '700' },

    progressSection:    { marginBottom: 18 },
    seekTouchArea:      { height: 48, justifyContent: 'center' },
    seekTrack:          { height: 3, backgroundColor: c.glass12, borderRadius: 2 },
    seekTrackActive:    { height: 3 },
    seekFill:           { height: 3, backgroundColor: c.white, borderRadius: 2 },
    seekThumb:          { position: 'absolute', top: '50%', marginTop: -THUMB_RADIUS, width: THUMB_RADIUS * 2, height: THUMB_RADIUS * 2, borderRadius: THUMB_RADIUS, backgroundColor: c.white, shadowColor: c.white, shadowOpacity: 0, shadowRadius: 6 },
    seekThumbActive:    { width: THUMB_RADIUS * 2.8, height: THUMB_RADIUS * 2.8, marginTop: -(THUMB_RADIUS * 1.4), borderRadius: THUMB_RADIUS * 1.4, shadowOpacity: 0.4 },
    timeRow:            { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    timeText:           { color: c.glass45, fontSize: 11, fontWeight: '600' },

    controls:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 8 },
    sideBtn:            { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    playBtn:            {
        width: 54, height: 54, borderRadius: 32,
        backgroundColor: c.white,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3, shadowRadius: 10, elevation: 8,
    },

    modeDot:            { width: 4, height: 4, borderRadius: 2, backgroundColor: c.accent, marginTop: 2, alignSelf: 'center' },
    modeLabels:         { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 14, minHeight: 14 },
    modeLabelText:      { color: c.glass45, fontSize: 11, fontWeight: '700' },

    qualitySection:         { marginBottom: 12 },
    qualityHeader:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    qualityLabel:           { color: c.glass35, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
    autoBtn:                { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: c.glass12, backgroundColor: c.glass06 },
    autoBtnActive:          { borderColor: c.accent, backgroundColor: c.accentFill20 },
    autoBtnText:            { color: c.glass60, fontSize: 11, fontWeight: '700' },
    autoBtnTextActive:      { color: c.accent },
    qualityRow:             { flexDirection: 'row', gap: 8, marginBottom: 8 },
    qualityBtn:             { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: c.glass12, backgroundColor: c.glass06 },
    qualityBtnActive:       { borderColor: c.glass35, backgroundColor: c.glass10 },
    qualityBtnLocked:       { opacity: 0.3 },
    qualityBtnText:         { color: c.glass60, fontSize: 12, fontWeight: '700' },
    qualityBtnTextActive:   { color: c.white, fontWeight: '800' },
    qualityBtnTextLocked:   { color: c.glass20 },
    qualityHint:            { color: c.glass35, fontSize: 11, lineHeight: 16 },
    networkHintRow:         { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
    networkHintText:        { fontSize: 11, fontWeight: '600' },

    lyricHint:          { alignItems: 'center', marginBottom: 8 },
    lyricHintText:      { color: c.glass35, fontSize: 11, fontWeight: '600' },

    lyricMiniBar:       { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 12 },
    lyricMiniArt:       { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    lyricMiniTitle:     { color: c.white, fontSize: 13, fontWeight: '800' },
    lyricMiniArtist:    { color: c.glass45, fontSize: 11, fontWeight: '600' },
    lyricProgress:      { height: 2, backgroundColor: c.glass08, marginHorizontal: 20 },
    lyricProgressFill:  { height: 2, backgroundColor: c.glass50, borderRadius: 1 },

    menuBackdrop:       { flex: 1, justifyContent: 'flex-end', backgroundColor: c.scrim },
    menuSheet:          { backgroundColor: c.surfaceLow ?? c.surface, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 20, gap: 10, borderWidth: 1, borderColor: c.glass10 },
    menuTitle:          { color: c.white, fontSize: 16, fontWeight: '800', marginBottom: 6 },
    menuItem:           { color: c.glass80, fontSize: 14, marginBottom: 8 },
    stats:              { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
    statsText:          { color: c.glass35, fontSize: 12 },
    scAttribution: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        marginTop: 8, paddingVertical: 8, paddingHorizontal: 16,
        backgroundColor: '#FF550010', borderRadius: 8,
        borderWidth: 1, borderColor: '#FF550030',
    },
    scAttributionText: { color: '#FF5500', fontSize: 12 },
});
