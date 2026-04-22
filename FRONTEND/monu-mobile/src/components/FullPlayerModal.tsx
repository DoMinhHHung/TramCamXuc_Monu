import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator, Animated, Easing,
    Modal, NativeScrollEvent, NativeSyntheticEvent, PanResponder,
    Pressable, ScrollView, StyleSheet, Text, View, Alert, Linking, useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
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
import { moderateScale } from '../utils/responsive';
import { SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '../config/design';

const THUMB_RADIUS = 8;
const THUMB_VISUAL = THUMB_RADIUS + 1;

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

const NETWORK_LABEL: Record<string, string> = {
    high: 'Mạng tốt', medium: 'Mạng trung bình', low: 'Mạng yếu', offline: 'Ngoại tuyến',
};

const NETWORK_COLOR: Record<string, string> = {
    good: '#22C55E',
    medium: '#F59E0B',
    bad: '#EF4444',
    offline: '#9CA3AF',
};

// RepeatIcon nhận thêm themeColors để dùng đúng accent color theo theme
const RepeatIcon = ({ mode, accentColor, mutedColor }: { mode: RepeatMode; accentColor: string; mutedColor: string }) => {
    if (mode === 'one') return <AppIcon name="repeatOne" color={accentColor} size={22} />;
    if (mode === 'all') return <AppIcon name="repeat" color={accentColor} size={22} />;
    return <AppIcon name="repeat" color={mutedColor} size={22} />;
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
    const colors = useThemeColors();
    const lStyles = useMemo(() => getLyricStyles(colors), [colors]);

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
            <View style={lStyles.center}>
                <ActivityIndicator color={colors.accent} size="large" />
                <Text style={lStyles.loadingText}>Đang tải lời bài hát...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={lStyles.center}>
                <AppIcon name="emojiNotePad" size={48} color={colors.muted} style={lStyles.noLyricIcon} />
                <Text style={lStyles.noLyricText}>{error}</Text>
            </View>
        );
    }

    if (!lyricData || lines.length === 0) {
        return (
            <View style={lStyles.center}>
                <AppIcon name="emojiMusic" size={48} color={colors.muted} style={lStyles.noLyricIcon} />
                <Text style={lStyles.noLyricText}>Chưa có lời bài hát</Text>
            </View>
        );
    }

    return (
        <ScrollView
            ref={scrollRef}
            style={lStyles.scrollView}
            contentContainerStyle={lStyles.scrollContent}
            showsVerticalScrollIndicator={false}
        >
            <View style={lStyles.spacerTop} />
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
                        hitSlop={4}
                    >
                        <Text
                            style={[
                                lStyles.line,
                                isActive && lStyles.lineActive,
                                isPast && lStyles.linePast,
                                !isSynced && lStyles.lineUnsynced,
                            ]}
                        >
                            {line.text}
                        </Text>
                    </Pressable>
                );
            })}
            <View style={lStyles.spacerBottom} />
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

const getLyricStyles = (c: ReturnType<typeof useThemeColors>) => StyleSheet.create({
    center: {
        flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.section,
    },
    loadingText: {
        color: c.textSecondary, fontSize: FONT_SIZE.body_sm, marginTop: SPACING.md,
    },
    noLyricIcon: { marginBottom: SPACING.md },
    noLyricText: { color: c.muted, fontSize: FONT_SIZE.body, textAlign: 'center' },
    scrollView: { flex: 1 },
    scrollContent: { paddingHorizontal: SPACING.xxl },
    spacerTop: { height: SPACING.xxl },
    spacerBottom: { height: 200 },
    line: {
        color: c.muted,
        fontSize: moderateScale(17),
        lineHeight: moderateScale(30),
        fontWeight: FONT_WEIGHT.semibold,
        paddingVertical: SPACING.sm,
        textAlign: 'center',
    },
    lineActive: {
        color: c.text,
        fontSize: moderateScale(21),
        fontWeight: FONT_WEIGHT.extrabold,
        transform: [{ scale: 1.02 }],
    },
    linePast: {
        color: c.glass25,
    },
    lineUnsynced: {
        color: c.textSecondary,
        fontSize: moderateScale(15),
        lineHeight: moderateScale(26),
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

    const seekTrackRef = useRef<View>(null);
    /** Vị trí track theo màn hình — dùng với `pageX` để seek mượt, không phụ thuộc `locationX` trong view. */
    const seekGeom = useRef({ x: 0, w: 0 });
    const seekWidthAnim = useRef(new Animated.Value(1)).current;
    const visProgress = useRef(new Animated.Value(0)).current;
    const thumbCenterOffset = useRef(new Animated.Value(THUMB_VISUAL)).current;

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
    const isNarrow = windowWidth < 360;
    const playerPadH = useMemo(
        () => Math.max(14, Math.min(moderateScale(22), Math.round(windowWidth * 0.055))),
        [windowWidth],
    );
    const artworkSize = useMemo(() => {
        const cap = windowWidth - playerPadH * 2 - 24;
        if (isVeryCompact) return Math.min(190, cap);
        if (isCompact) return Math.min(224, cap);
        return Math.min(260, cap);
    }, [isCompact, isVeryCompact, windowWidth, playerPadH]);

    const networkQuality = useMemo(() => {
        if (networkTier === 'high') return 'good';
        if (networkTier === 'medium') return 'medium';
        if (networkTier === 'low') return 'bad';
        return 'offline';
    }, [networkTier]);

    const networkColor = NETWORK_COLOR[networkQuality] ?? NETWORK_COLOR.offline;

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

    useEffect(() => {
        seekWidthAnim.setValue(Math.max(1, seekTrackWidth));
    }, [seekTrackWidth, seekWidthAnim]);

    /** Sync thanh progress mượt với `currentTime` (expo-audio cập nhật theo chu kỳ). */
    useEffect(() => {
        if (isSeeking) return;
        const p = duration > 0 ? currentTime / duration : 0;
        const clamped = Math.max(0, Math.min(1, p));
        Animated.timing(visProgress, {
            toValue: clamped,
            duration: 200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
        }).start();
    }, [currentTime, duration, isSeeking, visProgress]);

    /** Khi mở full player / đổi bài: nhảy tức thì tới progress hiện tại (tránh lệch với animation theo `currentTime`). */
    useEffect(() => {
        if (!isFullScreen) return;
        const p = duration > 0 ? currentTime / duration : 0;
        visProgress.setValue(Math.max(0, Math.min(1, p)));
    }, [isFullScreen, currentSong?.id, duration, visProgress]);

    const syncSeekGeomFromLayout = useCallback(() => {
        seekTrackRef.current?.measureInWindow((sx, _sy, sw) => {
            const w = sw > 0 ? sw : seekTrackWidth;
            seekGeom.current = { x: sx, w };
        });
    }, [seekTrackWidth]);

    const applySeekFromPageX = useCallback(
        (pageX: number) => {
            const { x, w } = seekGeom.current;
            const effW = w > 0 ? w : seekTrackWidth;
            if (effW <= 0 || duration <= 0) return;
            const ratio = Math.max(0, Math.min(1, (pageX - x) / effW));
            visProgress.setValue(ratio);
            setLocalSeekRatio(ratio);
        },
        [duration, seekTrackWidth, visProgress],
    );

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

    const pageWidth = Math.max(1, windowWidth);

    const handlePageScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const page = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
        setActivePage(page);
    }, [pageWidth]);

    const goToPage = useCallback((page: number) => {
        pagerRef.current?.scrollTo({ x: page * pageWidth, animated: true });
        setActivePage(page);
    }, [pageWidth]);

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
                    <View style={[styles.header, isNarrow && { paddingHorizontal: SPACING.md }]}>
                        <Pressable
                            onPress={() => setFullScreen(false)}
                            hitSlop={12}
                            style={styles.chevronBtn}
                            accessibilityRole="button"
                            accessibilityLabel="Thu nhỏ player"
                        >
                            <AppIcon name="chevronDown" size={28} color={themeColors.muted} />
                        </Pressable>

                        <View style={styles.headerCenter}>
                            {showLyricsTab ? (
                                <View style={styles.pageIndicator}>
                                    <Pressable onPress={() => goToPage(0)} hitSlop={10}>
                                        <Text
                                            numberOfLines={1}
                                            adjustsFontSizeToFit
                                            minimumFontScale={0.85}
                                            style={[
                                                styles.pageIndicatorText,
                                                activePage === 0 && styles.pageIndicatorActive,
                                            ]}
                                        >
                                            Đang phát
                                        </Text>
                                    </Pressable>
                                    <View style={styles.pageDot} />
                                    <Pressable onPress={() => goToPage(1)} hitSlop={10}>
                                        <Text
                                            numberOfLines={1}
                                            adjustsFontSizeToFit
                                            minimumFontScale={0.85}
                                            style={[
                                                styles.pageIndicatorText,
                                                activePage === 1 && styles.pageIndicatorActive,
                                            ]}
                                        >
                                            Lời nhạc
                                        </Text>
                                    </Pressable>
                                </View>
                            ) : (
                                <Text
                                    style={styles.headerTitle}
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                    minimumFontScale={0.8}
                                >
                                    Đang phát
                                </Text>
                            )}
                        </View>

                        <Pressable
                            onPress={() => setMenuOpen(true)}
                            hitSlop={12}
                            style={styles.moreBtn}
                            accessibilityRole="button"
                            accessibilityLabel="Thêm tùy chọn"
                        >
                            <AppIcon name="more" size={22} color={themeColors.text} />
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
                        <ScrollView
                            style={{ width: pageWidth, flex: 1 }}
                            contentContainerStyle={{
                                paddingHorizontal: playerPadH,
                                paddingBottom: insets.bottom + (isCompact ? 20 : 32),
                            }}
                            showsVerticalScrollIndicator={false}
                            nestedScrollEnabled
                            keyboardShouldPersistTaps="handled"
                        >
                            {/* Artwork */}
                            <View style={[styles.artworkSection, isCompact && { marginBottom: 14 }]}>
                                {currentSong.thumbnailUrl && (
                                    <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', zIndex: -1  }]}>
                                        <Image source={{ uri: currentSong.thumbnailUrl }} style={{ width: artworkSize, height: artworkSize, opacity: 0.6 }} contentFit="cover" cachePolicy="memory-disk" blurRadius={80} />
                                    </View>
                                )}
                                {currentSong.thumbnailUrl
                                    ? <Image source={{ uri: currentSong.thumbnailUrl }} style={[styles.artwork, { width: artworkSize, height: artworkSize }]} contentFit="cover" cachePolicy="memory-disk" />
                                    : <View style={[styles.artwork, styles.artworkPlaceholder, { width: artworkSize, height: artworkSize }]}>
                                        <AppIcon name="musicNote" size={64} color={themeColors.muted} />
                                    </View>
                                }
                            </View>

                            {/* Song info */}
                            <View style={[styles.songInfo, isCompact && { marginBottom: 14 }]}>
                                <Text
                                    style={[
                                        styles.songTitle,
                                        isCompact && { fontSize: isVeryCompact ? 18 : 20, marginBottom: 2 },
                                        isNarrow && { fontSize: isVeryCompact ? 17 : 19 },
                                    ]}
                                    numberOfLines={2}
                                    adjustsFontSizeToFit
                                    minimumFontScale={0.82}
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
                                        ref={seekTrackRef}
                                        style={styles.seekTrack}
                                        onLayout={(e) => {
                                            const w = e.nativeEvent.layout.width;
                                            setSeekTrackWidth(w);
                                            requestAnimationFrame(() => syncSeekGeomFromLayout());
                                        }}
                                        onStartShouldSetResponder={() => true}
                                        onMoveShouldSetResponder={() => true}
                                        onResponderGrant={(e) => {
                                            setIsSeeking(true);
                                            const pageX = e.nativeEvent.pageX;
                                            seekTrackRef.current?.measureInWindow((sx, _sy, sw) => {
                                                const w = sw > 0 ? sw : seekTrackWidth;
                                                seekGeom.current = { x: sx, w };
                                                if (w > 0 && duration > 0) {
                                                    const ratio = Math.max(0, Math.min(1, (pageX - sx) / w));
                                                    visProgress.setValue(ratio);
                                                    setLocalSeekRatio(ratio);
                                                }
                                            });
                                        }}
                                        onResponderMove={(e) => {
                                            applySeekFromPageX(e.nativeEvent.pageX);
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
                                        <Animated.View
                                            style={[
                                                styles.seekFill,
                                                { width: Animated.multiply(visProgress, seekWidthAnim) },
                                            ]}
                                        />
                                        <Animated.View
                                            style={[
                                                styles.seekThumb,
                                                isSeeking && styles.seekThumbActive,
                                                {
                                                    left: 0,
                                                    transform: [
                                                        {
                                                            translateX: Animated.subtract(
                                                                Animated.multiply(visProgress, seekWidthAnim),
                                                                thumbCenterOffset,
                                                            ),
                                                        },
                                                    ],
                                                },
                                            ]}
                                        />
                                    </View>
                                </View>
                                <View style={styles.timeRow}>
                                    <Text style={styles.timeText}>
                                        {formatTime(
                                            isSeeking && localSeekRatio != null
                                                ? localSeekRatio * duration
                                                : currentTime,
                                        )}
                                    </Text>
                                    <Text style={styles.timeText}>{formatTime(duration)}</Text>
                                </View>
                            </View>

                            {/* Controls */}
                            <View style={[
                                styles.controls,
                                isCompact && { marginBottom: 6 },
                                isNarrow && { paddingHorizontal: 2 },
                            ]}
                            >
                                <Pressable style={styles.sideBtn} onPress={toggleShuffle} hitSlop={8}>
                                    <AppIcon
                                      name="shuffle"
                                      color={isShuffled ? themeColors.accent : themeColors.muted}
                                      size={isNarrow ? 20 : 22}
                                    />
                                    {isShuffled && <View style={styles.modeDot} />}
                                </Pressable>

                                <Pressable style={styles.sideBtn} onPress={playPrev} hitSlop={8} accessibilityRole="button" accessibilityLabel="Bài trước">
                                    <AppIcon name="skipPrev" color={themeColors.text} size={isNarrow ? 28 : 32} />
                                </Pressable>

                                <Pressable
                                    style={[styles.playBtn, isNarrow && { width: 52, height: 52 }]}
                                    onPress={togglePlay}
                                    accessibilityRole="button"
                                    accessibilityLabel={isPlaying ? 'Tạm dừng' : 'Phát'}
                                >
                                    {!isLoaded
                                        ? <ActivityIndicator color={themeColors.bg} size="small" />
                                        : isPlaying
                                            ? <AppIcon name="pause" size={isNarrow ? 28 : 32} color={themeColors.bg} />
                                            : <AppIcon name="play" size={isNarrow ? 30 : 34} color={themeColors.bg} />
                                    }
                                </Pressable>

                                <Pressable style={styles.sideBtn} onPress={playNext} hitSlop={8} accessibilityRole="button" accessibilityLabel="Bài tiếp theo">
                                    <AppIcon name="skipNext" color={themeColors.text} size={isNarrow ? 28 : 32} />
                                </Pressable>

                                <Pressable style={styles.sideBtn} onPress={cycleRepeatMode} hitSlop={8} accessibilityRole="button">
                                    <RepeatIcon mode={repeatMode} accentColor={themeColors.accent} mutedColor={themeColors.muted} />
                                    {repeatMode !== 'none' && <View style={styles.modeDot} />}
                                </Pressable>
                            </View>

                            {/* Mode label */}
                            <View style={[styles.modeLabels, isCompact && { marginBottom: 10 }]}>
                                {isShuffled && (
                                    <View style={styles.modeLabelRow}>
                                        <AppIcon name="shuffle" color="#34D399" size={13} />
                                        <Text style={styles.modeLabelText}> Phát ngẫu nhiên</Text>
                                    </View>
                                )}
                                {repeatMode === 'one' && (
                                    <View style={styles.modeLabelRow}>
                                        <AppIcon name="repeatOne" color={themeColors.text} size={13} />
                                        <Text style={styles.modeLabelText}> Lặp bài này</Text>
                                    </View>
                                )}
                                {repeatMode === 'all' && (
                                    <View style={styles.modeLabelRow}>
                                        <AppIcon name="repeat" color={themeColors.text} size={13} />
                                        <Text style={styles.modeLabelText}> Lặp danh sách</Text>
                                    </View>
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
                                    <View style={[styles.qualityRow, isNarrow && { flexWrap: 'wrap', justifyContent: 'center' }]}>
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
                                        <Text style={{ color: themeColors.accent }}>{selectedQuality}kbps</Text>
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
                                    <View style={styles.lyricHintRow}>
                                        <AppIcon name="emojiNotePad" size={13} color={themeColors.muted} />
                                        <Text style={styles.lyricHintText}> Vuốt sang phải để xem lời nhạc</Text>
                                    </View>
                                </Pressable>
                            )}

                            {/* Stats */}
                            <View style={styles.stats}>
                                <AppIcon name="headset" size={14} color={themeColors.muted} />
                                <Text style={styles.statsText}>
                                    {'  '}{currentSong.playCount?.toLocaleString('vi-VN') ?? 0} lượt nghe
                                </Text>
                            </View>

                            {currentSong.sourceType === 'SOUNDCLOUD' && currentSong.soundcloudPermalink && (
                                <Pressable
                                    style={styles.scAttribution}
                                    onPress={() => Linking.openURL(currentSong.soundcloudPermalink!)}
                                >
                                    <FontAwesome name="soundcloud" size={14} color="#FF5500" />
                                    <Text style={styles.scAttributionText} numberOfLines={2} ellipsizeMode="tail">
                                        {' '}Provided by SoundCloud{' '}
                                        <Text style={{ fontWeight: '700' }}>
                                            {currentSong.soundcloudUsername ?? 'SoundCloud'}
                                        </Text>
                                    </Text>
                                    <MaterialIcons name="open-in-new" size={14} color="#FF5500" style={{ marginLeft: 4 }} />
                                </Pressable>
                            )}
                        </ScrollView>

                        {/* ── Page 2: Lyrics ─────────────────────────── */}
                        {showLyricsTab && (
                            <View style={{ width: pageWidth }}>
                                {/* Mini player bar on lyrics page */}
                                <View style={styles.lyricMiniBar}>
                                    {currentSong.thumbnailUrl
                                        ? <Image source={{ uri: currentSong.thumbnailUrl }} style={styles.lyricMiniArt} contentFit="cover" cachePolicy="memory-disk" />
                                        : <View style={[styles.lyricMiniArt, { backgroundColor: themeColors.accentFill20 }]}>
                                            <AppIcon name="emojiMusic" size={14} color={themeColors.text} />
                                        </View>
                                    }
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.lyricMiniTitle} numberOfLines={1}>{currentSong.title}</Text>
                                        <Text style={styles.lyricMiniArtist} numberOfLines={1}>{currentSong.primaryArtist?.stageName}</Text>
                                    </View>
                                    <Pressable onPress={togglePlay} hitSlop={8} accessibilityRole="button" accessibilityLabel={isPlaying ? 'Tạm dừng' : 'Phát'}>
                                        {isPlaying
                                            ? <AppIcon name="pause" size={24} color={themeColors.text} />
                                            : <AppIcon name="play" size={24} color={themeColors.text} />
                                        }
                                    </Pressable>
                                </View>

                                {/* Progress bar */}
                                <View style={styles.lyricProgress}>
                                    <Animated.View
                                        style={[
                                            styles.lyricProgressFill,
                                            {
                                                width: visProgress.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: ['0%', '100%'],
                                                }),
                                            },
                                        ]}
                                    />
                                </View>

                                {/* Lyrics content */}
                                <LyricViewer
                                    lyricData={lyricData}
                                    loading={lyricLoading}
                                    error={lyricError}
                                    currentTimeMs={currentTimeMs}
                                    onSeek={seekTo}
                                />

                                <View style={{ height: insets.bottom + 24 }} />
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
                                icon: <AppIcon name="share" size={20} color={themeColors.text} />,
                                label: 'Chia sẻ qua QR',
                                onPress: async () => {
                                    const qr = await getSongShareQr(currentSong.id);
                                    setShareQr(qr.qrCodeBase64 || null);
                                },
                            },
                            ...(!isSoundCloudTrack ? [{
                                icon: <AppIcon name="addToPlaylist" size={20} color={themeColors.text} />,
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
                                icon: <AppIcon name="report" size={20} color={themeColors.error} />,
                                label: 'Báo cáo bài hát',
                                destructive: true,
                                separator: true,
                                onPress: openReportReasonPicker,
                            },
                            {
                                icon: <AppIcon name="stop" size={20} color={themeColors.text} />,
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
                                    ? <Image source={{ uri: shareQr }} style={{ width: 220, height: 220, borderRadius: 10, alignSelf: 'center' }} contentFit="cover" cachePolicy="memory-disk" />
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
    header:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: SPACING.md, paddingHorizontal: SPACING.xl },
    headerCenter:       { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.sm },
    // Touch target 44×44 — đủ chuẩn accessibility
    chevronBtn:         { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    moreBtn:            { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    headerTitle:        { color: c.muted, fontSize: FONT_SIZE.xxs, fontWeight: FONT_WEIGHT.extrabold, letterSpacing: 1.2, textTransform: 'uppercase', textAlign: 'center' },

    pageIndicator:      { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, maxWidth: '100%', justifyContent: 'center' },
    pageIndicatorText:  { color: c.muted, fontSize: FONT_SIZE.xxs, fontWeight: FONT_WEIGHT.extrabold, letterSpacing: 0.6, textTransform: 'uppercase' },
    pageIndicatorActive: { color: c.text },
    pageDot:            { width: 4, height: 4, borderRadius: 2, backgroundColor: c.glass20 },

    artworkSection:     { alignItems: 'center', marginTop: SPACING.sm, marginBottom: SPACING.xxl },
    // artwork width/height được set dynamically via artworkSize
    artwork:            { borderRadius: RADIUS.lg, backgroundColor: c.surface },
    artworkPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface },
    songInfo:           { marginBottom: SPACING.xl },
    songTitle:          { color: c.text, fontSize: moderateScale(22), fontWeight: FONT_WEIGHT.extrabold, marginBottom: SPACING.xs },
    songMetaRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm, marginBottom: SPACING.sm },
    artistName:         { color: c.textSecondary, fontSize: FONT_SIZE.body_sm, fontWeight: FONT_WEIGHT.semibold, flex: 1 },
    heartWrap:          {
        width: 40,
        height: 40,
        borderRadius: RADIUS.full,
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
        marginBottom: SPACING.sm,
        paddingHorizontal: SPACING.sm + 2,
        paddingVertical: SPACING.xs,
        borderRadius: RADIUS.full,
        backgroundColor: c.accentFill20,
        borderWidth: 1,
        borderColor: c.accentBorder25,
    },
    externalBadgeText:  { color: c.accent, fontSize: FONT_SIZE.xxs, fontWeight: FONT_WEIGHT.extrabold },
    genreRow:           { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' },
    genreChip:          { backgroundColor: c.glass06, borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm + 2, paddingVertical: SPACING.xs, borderWidth: 1, borderColor: c.glass10 },
    genreText:          { color: c.textSecondary, fontSize: FONT_SIZE.xxs, fontWeight: FONT_WEIGHT.bold },

    progressSection:    { marginBottom: SPACING.lg },
    seekTouchArea:      { height: 48, justifyContent: 'center' },
    seekTrack:          { height: 5, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 3 },
    seekTrackActive:    { height: 5 },
    seekFill:           { height: 5, backgroundColor: c.accent, borderRadius: 3, shadowColor: c.accent, shadowOpacity: 0.5, shadowRadius: 8 },
    seekThumb:          { position: 'absolute', top: '50%', marginTop: -(THUMB_RADIUS + 1), width: (THUMB_RADIUS + 1) * 2, height: (THUMB_RADIUS + 1) * 2, borderRadius: THUMB_RADIUS + 1, backgroundColor: c.accent, shadowColor: c.accent, shadowOpacity: 0.8, shadowRadius: 10 },
    seekThumbActive:    { width: THUMB_RADIUS * 3, height: THUMB_RADIUS * 3, marginTop: -(THUMB_RADIUS * 1.5), borderRadius: THUMB_RADIUS * 1.5, shadowOpacity: 1, shadowColor: c.white, backgroundColor: c.white },
    timeRow:            { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.md },
    timeText:           { color: c.muted, fontSize: FONT_SIZE.xxs, fontWeight: FONT_WEIGHT.semibold },

    controls:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm, paddingHorizontal: SPACING.sm },
    sideBtn:            { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
    playBtn:            {
        width: 60, height: 60, borderRadius: RADIUS.full,
        backgroundColor: c.white,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
    },

    modeDot:            { width: 4, height: 4, borderRadius: 2, backgroundColor: c.accent, marginTop: 2, alignSelf: 'center' },
    modeLabels:         { flexDirection: 'row', justifyContent: 'center', gap: SPACING.md, marginBottom: SPACING.md, minHeight: 16 },
    modeLabelRow:       { flexDirection: 'row', alignItems: 'center' },
    modeLabelText:      { color: c.textSecondary, fontSize: FONT_SIZE.xxs, fontWeight: FONT_WEIGHT.bold },

    qualitySection:         { marginBottom: SPACING.md },
    qualityHeader:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
    qualityLabel:           { color: c.muted, fontSize: FONT_SIZE.xxs, fontWeight: FONT_WEIGHT.extrabold, letterSpacing: 1.2, textTransform: 'uppercase' },
    autoBtn:                { paddingHorizontal: SPACING.sm + 2, paddingVertical: SPACING.xs, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: c.glass12, backgroundColor: c.glass06 },
    autoBtnActive:          { borderColor: c.accent, backgroundColor: c.accentFill20 },
    autoBtnText:            { color: c.textSecondary, fontSize: FONT_SIZE.xxs, fontWeight: FONT_WEIGHT.bold },
    autoBtnTextActive:      { color: c.accent },
    qualityRow:             { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
    qualityBtn:             { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: c.glass12, backgroundColor: c.glass06 },
    qualityBtnActive:       { borderColor: c.textSecondary, backgroundColor: c.glass10 },
    qualityBtnLocked:       { opacity: 0.3 },
    qualityBtnText:         { color: c.textSecondary, fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold },
    qualityBtnTextActive:   { color: c.text, fontWeight: FONT_WEIGHT.extrabold },
    qualityBtnTextLocked:   { color: c.glass20 },
    qualityHint:            { color: c.muted, fontSize: FONT_SIZE.xxs, lineHeight: 16 },
    networkHintRow:         { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: 2 },
    networkHintText:        { fontSize: FONT_SIZE.xxs, fontWeight: FONT_WEIGHT.semibold },

    lyricHint:          { alignItems: 'center', marginBottom: SPACING.sm },
    lyricHintRow:       { flexDirection: 'row', alignItems: 'center' },
    lyricHintText:      { color: c.muted, fontSize: FONT_SIZE.xxs, fontWeight: FONT_WEIGHT.semibold },

    lyricMiniBar:       { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md },
    lyricMiniArt:       { width: 44, height: 44, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
    lyricMiniTitle:     { color: c.text, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.extrabold },
    lyricMiniArtist:    { color: c.textSecondary, fontSize: FONT_SIZE.xxs, fontWeight: FONT_WEIGHT.semibold },
    lyricProgress:      { height: 2, backgroundColor: c.glass08, marginHorizontal: SPACING.xl },
    lyricProgressFill:  { height: 2, backgroundColor: c.accent, borderRadius: 1 },

    menuBackdrop:       { flex: 1, justifyContent: 'flex-end', backgroundColor: c.scrim },
    menuSheet:          { backgroundColor: c.surfaceLow ?? c.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.xl, gap: SPACING.sm, borderWidth: 1, borderColor: c.glass10 },
    menuTitle:          { color: c.text, fontSize: FONT_SIZE.body_md, fontWeight: FONT_WEIGHT.extrabold, marginBottom: SPACING.sm },
    menuItem:           { color: c.textSecondary, fontSize: FONT_SIZE.body_sm, marginBottom: SPACING.sm },
    stats:              { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: SPACING.xs },
    statsText:          { color: c.muted, fontSize: FONT_SIZE.xs },
    scAttribution: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        marginTop: SPACING.sm, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.lg,
        backgroundColor: '#FF550010', borderRadius: RADIUS.sm,
        borderWidth: 1, borderColor: '#FF550030',
    },
    scAttributionText: { color: '#FF5500', fontSize: FONT_SIZE.xs },
});
