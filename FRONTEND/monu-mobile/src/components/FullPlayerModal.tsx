import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator, Animated, Dimensions, FlatList, Image,
    Modal, NativeScrollEvent, NativeSyntheticEvent, PanResponder,
    Pressable, ScrollView, StyleSheet, Text, View, TextInput, Alert, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '../context/LocalizationContext';

import { COLORS } from '../config/colors';
import { AudioQuality, RepeatMode, usePlayer } from '../context/PlayerContext';
import {
    addSongToPlaylist, createPlaylist, getLyric, getMyPlaylists,
    LyricLine, LyricResponse, Playlist,
} from '../services/music';
import { getSongShareQr } from '../services/social';
import { SongActionSheet } from './SongActionSheet';
import { AppIcon } from './AppIcon';
import { HeartButton } from './HeartButton';
import { ReportReasonSheet } from './ReportReasonSheet';

const { width: SCREEN_W } = Dimensions.get('window');

const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
};
import { FontAwesome, Foundation, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';

const THUMB_RADIUS = 10;

const QUALITY_OPTIONS: Array<{ value: AudioQuality; label: string }> = [
    { value: 64,  label: '64k'  },
    { value: 128, label: '128k' },
    { value: 256, label: '256k' },
    { value: 320, label: '320k' },
];

const RepeatIcon = ({ mode }: { mode: RepeatMode }) => {
    if (mode === 'one') return <MaterialIcons name="repeat-one" color="#fff" size={22} />;
    if (mode === 'all') return <MaterialCommunityIcons name="repeat" color="#fff" size={22} />;
    return <MaterialIcons name="repeat" color={COLORS.glass35} size={22} />;
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
                <Text style={lyricStyles.noLyricIcon}>📝</Text>
                <Text style={lyricStyles.noLyricText}>{error}</Text>
            </View>
        );
    }

    if (!lyricData || lines.length === 0) {
        return (
            <View style={lyricStyles.center}>
                <Text style={lyricStyles.noLyricIcon}>🎵</Text>
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
    noLyricIcon: { fontSize: 48, marginBottom: 12 },
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
    const { t } = useTranslation();
    const [menuOpen, setMenuOpen] = useState(false);
    const [playlistPickerOpen, setPlaylistPickerOpen] = useState(false);
    const [reportSheetOpen, setReportSheetOpen] = useState(false);
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [shareQr, setShareQr] = useState<string | null>(null);
    const [isSeeking, setIsSeeking] = useState(false);

    // Lyrics state
    const [activePage, setActivePage] = useState(0);
    const [lyricData, setLyricData] = useState<LyricResponse | null>(null);
    const [lyricLoading, setLyricLoading] = useState(false);
    const [lyricError, setLyricError] = useState<string | null>(null);
    const lyricFetchedForRef = useRef<string | null>(null);
    const pagerRef = useRef<ScrollView>(null);

    const {
        currentSong, isFullScreen, setFullScreen,
        isPlaying, isLoaded, currentTime, duration,
        togglePlay, seekTo, playNext, playPrev, stopPlayer,
        selectedQuality, maxQuality, setQuality,
        autoQuality, setAutoQuality, networkTier,
        repeatMode, isShuffled, cycleRepeatMode, toggleShuffle,
    } = usePlayer();

    const hasLyrics = !!currentSong?.lyricUrl;
    const currentTimeMs = currentTime * 1000;

    const NETWORK_LABEL: Record<string, string> = {
        high: '📶 Mạng tốt', medium: '📶 Mạng trung bình', low: '📶 Mạng yếu', offline: '📴 Ngoại tuyến',
    };

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

    // ── Seek bar ──────────────────────────────────────────────────────────────
    const barWidthRef = useRef(1);
    const durationRef = useRef(0);
    useEffect(() => { durationRef.current = duration; }, [duration]);

    const seekPan = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: evt => {
                setIsSeeking(true);
                const ratio = Math.max(0, Math.min(1, evt.nativeEvent.locationX / barWidthRef.current));
                seekTo(ratio * durationRef.current);
            },
            onPanResponderMove: evt => {
                const ratio = Math.max(0, Math.min(1, evt.nativeEvent.locationX / barWidthRef.current));
                seekTo(ratio * durationRef.current);
            },
            onPanResponderRelease: () => setIsSeeking(false),
            onPanResponderTerminate: () => setIsSeeking(false),
        }),
    ).current;

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

    const progress  = duration > 0 ? currentTime / duration : 0;
    const thumbLeft = Math.max(0, progress * barWidthRef.current - THUMB_RADIUS);

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
            Alert.alert('Không hỗ trợ', 'Bài hát SoundCloud hiện không hỗ trợ thêm vào playlist nội bộ.');
            return;
        }
        setPlaylistPickerOpen(true);
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
                            <AppIcon set="MaterialIcons" name="keyboard-arrow-down" size={28} color={COLORS.glass60} />
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
                            <Text style={styles.moreBtn}>⋯</Text>
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
                            <View style={styles.artworkSection}>
                                {currentSong.thumbnailUrl
                                    ? <Image source={{ uri: currentSong.thumbnailUrl }} style={styles.artwork} />
                                    : <View style={[styles.artwork, styles.artworkPlaceholder]}>
                                        <AppIcon set="MaterialIcons" name="music-note" size={64} color={COLORS.glass35} />
                                    </View>
                                }
                            </View>

                            {/* Song info */}
                            <View style={styles.songInfo}>
                                <Text style={styles.songTitle} numberOfLines={2}>{currentSong.title}</Text>
                                <View style={styles.songMetaRow}>
                                    <Text style={styles.artistName} numberOfLines={1}>{currentSong.primaryArtist?.stageName}</Text>
                                    <View style={styles.heartWrap}>
                                        <HeartButton songId={currentSong.id} size={20} />
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
                            <View style={styles.progressSection}>
                                <View
                                    style={styles.seekTouchArea}
                                    onLayout={e => { barWidthRef.current = e.nativeEvent.layout.width; }}
                                    {...seekPan.panHandlers}
                                >
                                    <View style={[styles.seekTrack, isSeeking && styles.seekTrackActive]}>
                                        <View style={[styles.seekFill, { width: `${progress * 100}%` as any }]} />
                                    </View>
                                    <View
                                        style={[
                                            styles.seekThumb,
                                            { left: thumbLeft },
                                            isSeeking && styles.seekThumbActive,
                                        ]}
                                        pointerEvents="none"
                                    />
                                </View>
                                <View style={styles.timeRow}>
                                    <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                                    <Text style={styles.timeText}>{formatTime(duration)}</Text>
                                </View>
                            </View>

                            {/* Controls */}
                            <View style={styles.controls}>
                                <Pressable style={styles.sideBtn} onPress={toggleShuffle} hitSlop={8}>
                                    <Foundation
                                        name="shuffle"
                                        color={isShuffled ? COLORS.accent : COLORS.glass40}
                                        size={22}
                                    />
                                    {isShuffled && <View style={styles.modeDot} />}
                                </Pressable>

                                <Pressable style={styles.sideBtn} onPress={playPrev}>
                                    <MaterialCommunityIcons name="skip-previous" color={COLORS.glass80} size={32} />
                                </Pressable>

                                <Pressable style={styles.playBtn} onPress={togglePlay}>
                                    {!isLoaded
                                        ? <ActivityIndicator color={COLORS.bg} size="small" />
                                        : isPlaying
                                            ? <AppIcon set="MaterialIcons" name="pause" size={32} color={COLORS.bg} />
                                            : <AppIcon set="MaterialIcons" name="play-arrow" size={34} color={COLORS.bg} />
                                    }
                                </Pressable>

                                <Pressable style={styles.sideBtn} onPress={playNext}>
                                    <MaterialCommunityIcons name="skip-next" color={COLORS.glass80} size={32} />
                                </Pressable>

                                <Pressable style={styles.sideBtn} onPress={cycleRepeatMode} hitSlop={8}>
                                    <RepeatIcon mode={repeatMode} />
                                    {repeatMode !== 'none' && <View style={styles.modeDot} />}
                                </Pressable>
                            </View>

                            {/* Mode label */}
                            <View style={styles.modeLabels}>
                                {isShuffled && (
                                    <Text style={styles.modeLabelText}><Foundation name="shuffle" color="#34D399" size={13} /> Phát ngẫu nhiên</Text>
                                )}
                                {repeatMode === 'one' && (
                                    <Text style={styles.modeLabelText}><MaterialIcons name="repeat-one" color="#fff" size={13} /> Lặp bài này</Text>
                                )}
                                {repeatMode === 'all' && (
                                    <Text style={styles.modeLabelText}><MaterialCommunityIcons name="repeat" color="#fff" size={13} /> Lặp danh sách</Text>
                                )}
                            </View>

                            {/* Quality selector */}
                            {!isExternalTrack && (
                                <View style={styles.qualitySection}>
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
                                                        {opt.label}{!isAvailable ? '🔒' : ''}
                                                    </Text>
                                                </Pressable>
                                            );
                                        })}
                                    </View>
                                    <Text style={styles.qualityHint}>
                                        {'Đang phát: '}
                                        <Text style={{ color: COLORS.accent }}>{selectedQuality}kbps</Text>
                                        {autoQuality
                                            ? `  •  ${NETWORK_LABEL[networkTier] ?? networkTier}`
                                            : maxQuality < 320
                                                ? '  •  Nâng cấp Premium để mở chất lượng cao hơn'
                                                : '  •  Chất lượng tối đa'}
                                    </Text>
                                </View>
                            )}

                            {/* Lyric hint */}
                            {showLyricsTab && activePage === 0 && (
                                <Pressable style={styles.lyricHint} onPress={() => goToPage(1)}>
                                    <Text style={styles.lyricHintText}>📝 Vuốt sang phải để xem lời nhạc</Text>
                                </Pressable>
                            )}

                            {/* Stats */}
                            <View style={styles.stats}>
                                <AppIcon set="MaterialIcons" name="headset" size={14} color={COLORS.glass30} />
                                <Text style={styles.statsText}>
                                    {'  '}{currentSong.playCount?.toLocaleString('vi-VN') ?? 0} lượt nghe
                                </Text>
                            </View>

                            <View style={{ height: insets.bottom + 16 }} />

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
                                            <Text style={{ fontSize: 14 }}>🎵</Text>
                                        </View>
                                    }
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.lyricMiniTitle} numberOfLines={1}>{currentSong.title}</Text>
                                        <Text style={styles.lyricMiniArtist} numberOfLines={1}>{currentSong.primaryArtist?.stageName}</Text>
                                    </View>
                                    <Pressable onPress={togglePlay} hitSlop={8}>
                                        {isPlaying
                                            ? <AppIcon set="MaterialIcons" name="pause" size={24} color={COLORS.white} />
                                            : <AppIcon set="MaterialIcons" name="play-arrow" size={24} color={COLORS.white} />
                                        }
                                    </Pressable>
                                </View>

                                {/* Progress bar thin */}
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
                                icon: '↗',
                                label: 'Chia sẻ qua QR',
                                onPress: async () => {
                                    const qr = await getSongShareQr(currentSong.id);
                                    setShareQr(qr.qrCodeBase64 || null);
                                },
                            },
                            ...(!isSoundCloudTrack ? [{
                                icon: '➕',
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
                                icon: '🚩',
                                label: 'Báo cáo bài hát',
                                destructive: true,
                                separator: true,
                                onPress: openReportReasonPicker,
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

                    {/* Playlist picker */}
                    <Modal visible={playlistPickerOpen} transparent animationType="slide" onRequestClose={() => setPlaylistPickerOpen(false)}>
                        <Pressable style={styles.menuBackdrop} onPress={() => setPlaylistPickerOpen(false)}>
                            <View style={styles.menuSheet}>
                                <Text style={styles.menuTitle}>Thêm vào playlist</Text>
                                {playlists.map((p) => (
                                    <Pressable key={p.id} onPress={async () => {
                                        if (isSoundCloudTrack) {
                                            Alert.alert('Không hỗ trợ', 'Bài hát SoundCloud hiện không hỗ trợ thêm vào playlist nội bộ.');
                                            setPlaylistPickerOpen(false);
                                            return;
                                        }
                                        try {
                                            await addSongToPlaylist(p.id, currentSong.id);
                                            Alert.alert('Thành công', `Đã thêm vào ${p.name}`);
                                            setPlaylistPickerOpen(false);
                                        } catch (error: any) {
                                            Alert.alert('Lỗi', error?.message || 'Không thể thêm vào playlist');
                                        }
                                    }}><Text style={styles.menuItem}>{p.name}</Text></Pressable>
                                ))}
                                <TextInput
                                    style={styles.playlistInput}
                                    value={newPlaylistName}
                                    onChangeText={setNewPlaylistName}
                                    placeholder="Tạo playlist mới"
                                    placeholderTextColor={COLORS.glass45}
                                />
                                <Pressable onPress={async () => {
                                    if (!newPlaylistName.trim()) return;
                                    if (isSoundCloudTrack) {
                                        Alert.alert('Không hỗ trợ', 'Bài hát SoundCloud hiện không hỗ trợ thêm vào playlist nội bộ.');
                                        setPlaylistPickerOpen(false);
                                        return;
                                    }
                                    try {
                                        const pl = await createPlaylist({ name: newPlaylistName.trim(), visibility: 'PUBLIC' });
                                        await addSongToPlaylist(pl.id, currentSong.id);
                                        setNewPlaylistName('');
                                        setPlaylistPickerOpen(false);
                                    } catch (error: any) {
                                        Alert.alert('Lỗi', error?.message || 'Không thể tạo playlist mới');
                                    }
                                }}><Text style={styles.menuItemAccent}>+ Tạo mới và thêm</Text></Pressable>
                            </View>
                        </Pressable>
                    </Modal>

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

const styles = StyleSheet.create({
    root:               { flex: 1, backgroundColor: '#0E0E16' },
    header:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 20 },
    chevronBtn:         { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    headerTitle:        { color: COLORS.glass50, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
    moreBtn:            { color: COLORS.white, fontSize: 30, lineHeight: 30 },

    pageIndicator:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
    pageIndicatorText:  { color: COLORS.glass35, fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
    pageIndicatorActive: { color: COLORS.white },
    pageDot:            { width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.glass20 },

    artworkSection:     { alignItems: 'center', marginTop: 4, marginBottom: 24 },
    artwork:            { width: 260, height: 260, borderRadius: 16, backgroundColor: COLORS.surface },
    artworkPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface },
    songInfo:           { marginBottom: 20 },
    songTitle:          { color: COLORS.white, fontSize: 20, fontWeight: '700', marginBottom: 4 },
    songMetaRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
    artistName:         { color: COLORS.glass50, fontSize: 14, fontWeight: '500', flex: 1 },
    heartWrap:          {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.accentBorder25,
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
        backgroundColor: COLORS.accentFill20,
        borderWidth: 1,
        borderColor: COLORS.accentBorder25,
    },
    externalBadgeText:  { color: COLORS.accent, fontSize: 11, fontWeight: '700' },
    genreRow:           { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    genreChip:          { backgroundColor: COLORS.surface, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
    genreText:          { color: COLORS.glass50, fontSize: 11, fontWeight: '600' },

    progressSection:    { marginBottom: 20 },
    seekTouchArea:      { height: 56, justifyContent: 'center' },
    seekTrack:          { height: 3, backgroundColor: COLORS.glass15, borderRadius: 2 },
    seekTrackActive:    { height: 5 },
    seekFill:           { height: 3, backgroundColor: COLORS.white, borderRadius: 2 },
    seekThumb:          { position: 'absolute', top: '50%', marginTop: -THUMB_RADIUS, width: THUMB_RADIUS * 2, height: THUMB_RADIUS * 2, borderRadius: THUMB_RADIUS, backgroundColor: COLORS.white, shadowColor: COLORS.white, shadowOpacity: 0, shadowRadius: 6 },
    seekThumbActive:    { width: THUMB_RADIUS * 2.8, height: THUMB_RADIUS * 2.8, marginTop: -(THUMB_RADIUS * 1.4), borderRadius: THUMB_RADIUS * 1.4, shadowOpacity: 0.4 },
    timeRow:            { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    timeText:           { color: COLORS.glass40, fontSize: 11, fontWeight: '500' },

    controls:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 8 },
    sideBtn:            { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    /** Play button — solid white circle, icon màu tối */
    playBtn:            {
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: COLORS.white,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 10, elevation: 8,
    },

    modeDot:            { width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.accent, marginTop: 2, alignSelf: 'center' },
    modeLabels:         { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 14, minHeight: 16 },
    modeLabelText:      { color: COLORS.glass40, fontSize: 11, fontWeight: '600' },

    qualitySection:         { marginBottom: 14 },
    qualityHeader:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    qualityLabel:           { color: COLORS.glass35, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
    autoBtn:                { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: COLORS.glass15, backgroundColor: COLORS.surface },
    autoBtnActive:          { borderColor: COLORS.accent, backgroundColor: COLORS.accentFill20 },
    autoBtnText:            { color: COLORS.muted, fontSize: 11, fontWeight: '600' },
    autoBtnTextActive:      { color: COLORS.accent },
    qualityRow:             { flexDirection: 'row', gap: 8, marginBottom: 8 },
    qualityBtn:             { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: COLORS.glass12, backgroundColor: COLORS.surface },
    qualityBtnActive:       { borderColor: COLORS.glass40, backgroundColor: COLORS.glass08 },
    qualityBtnLocked:       { opacity: 0.3 },
    qualityBtnText:         { color: COLORS.muted, fontSize: 12, fontWeight: '600' },
    qualityBtnTextActive:   { color: COLORS.white, fontWeight: '700' },
    qualityBtnTextLocked:   { color: COLORS.glass20 },
    qualityHint:            { color: COLORS.glass25, fontSize: 11, lineHeight: 16 },

    lyricHint:          { alignItems: 'center', marginBottom: 8 },
    lyricHintText:      { color: COLORS.glass25, fontSize: 11, fontWeight: '500' },

    lyricMiniBar:       { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 12 },
    lyricMiniArt:       { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    lyricMiniTitle:     { color: COLORS.white, fontSize: 13, fontWeight: '700' },
    lyricMiniArtist:    { color: COLORS.glass45, fontSize: 11 },
    lyricProgress:      { height: 2, backgroundColor: COLORS.glass08, marginHorizontal: 20 },
    lyricProgressFill:  { height: 2, backgroundColor: COLORS.glass50, borderRadius: 1 },

    menuBackdrop:       { flex: 1, justifyContent: 'flex-end', backgroundColor: COLORS.scrim },
    menuSheet:          { backgroundColor: '#18181f', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, gap: 10 },
    menuTitle:          { color: COLORS.white, fontSize: 16, fontWeight: '700', marginBottom: 6 },
    menuItem:           { color: COLORS.glass80, fontSize: 14, marginBottom: 8 },
    menuItemAccent:     { color: COLORS.accent, fontSize: 14, fontWeight: '700' },
    playlistInput:      { color: COLORS.white, borderWidth: 1, borderColor: COLORS.glass15, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10 },
    stats:              { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
    statsText:          { color: COLORS.glass25, fontSize: 12 },
    scAttribution: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        marginTop: 8, paddingVertical: 8, paddingHorizontal: 16,
        backgroundColor: '#FF550010', borderRadius: 8,
        borderWidth: 1, borderColor: '#FF550030',
    },
    scAttributionText: { color: '#FF5500', fontSize: 12 },
});
