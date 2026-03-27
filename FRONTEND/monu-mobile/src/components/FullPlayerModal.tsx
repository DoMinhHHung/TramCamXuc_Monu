import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator, Animated, Dimensions, FlatList, Image,
    Modal, NativeScrollEvent, NativeSyntheticEvent, PanResponder,
    Pressable, ScrollView, StyleSheet, Text, View, TextInput, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '../config/colors';
import { AudioQuality, RepeatMode, usePlayer } from '../context/PlayerContext';
import {
    addSongToPlaylist, createPlaylist, getLyric, getMyPlaylists,
    LyricLine, LyricResponse, Playlist, reportSong,
} from '../services/music';
import { getSongShareQr } from '../services/social';
import { SongActionSheet } from './SongActionSheet';

const { width: SCREEN_W } = Dimensions.get('window');

const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
};
import { Foundation, MaterialCommunityIcons, MaterialIcons, Entypo, Feather } from '@expo/vector-icons';

const THUMB_RADIUS = 9;

const QUALITY_OPTIONS: Array<{ value: AudioQuality; label: string }> = [
    { value: 64,  label: '64k'  },
    { value: 128, label: '128k' },
    { value: 256, label: '256k' },
    { value: 320, label: '320k' },
];

const repeatLabel = (mode: RepeatMode): string => {
    if (mode === 'one') return <MaterialIcons name="repeat-one" color="#fff" size={24} /> as any;
    if (mode === 'all') return <MaterialCommunityIcons name="repeat" color="#fff" size={24} /> as any;
    return <Entypo name="flickr" color="#fff" size={24} /> as any;
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
    const [menuOpen, setMenuOpen] = useState(false);
    const [playlistPickerOpen, setPlaylistPickerOpen] = useState(false);
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [shareQr, setShareQr] = useState<string | null>(null);

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
            onMoveShouldSetPanResponder:  () => true,
            onPanResponderGrant: evt => {
                const ratio = Math.max(0, Math.min(1, evt.nativeEvent.locationX / barWidthRef.current));
                seekTo(ratio * durationRef.current);
            },
            onPanResponderMove: evt => {
                const ratio = Math.max(0, Math.min(1, evt.nativeEvent.locationX / barWidthRef.current));
                seekTo(ratio * durationRef.current);
            },
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

    useEffect(() => {
        if (!isFullScreen) return;
        void (async () => {
            try {
                const data = await getMyPlaylists({ page: 1, size: 50 });
                setPlaylists(data.content ?? []);
            } catch { setPlaylists([]); }
        })();
    }, [isFullScreen, currentSong?.id]);

    const openPlaylistPicker = () => setPlaylistPickerOpen(true);

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
                <LinearGradient
                    colors={[COLORS.gradPurple, COLORS.gradIndigo, COLORS.bg]}
                    locations={[0, 0.4, 1]}
                    style={[styles.root, { paddingTop: insets.top }]}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <Pressable onPress={() => setFullScreen(false)} hitSlop={10}>
                            <Text style={styles.chevron}>⌄</Text>
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
                                        <Text style={styles.artworkIcon}>🎵</Text>
                                    </View>
                                }
                            </View>

                            {/* Song info */}
                            <View style={styles.songInfo}>
                                <Text style={styles.songTitle} numberOfLines={2}>{currentSong.title}</Text>
                                <Text style={styles.artistName} numberOfLines={1}>{currentSong.primaryArtist?.stageName}</Text>
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
                                    <View style={styles.seekTrack}>
                                        <View style={[styles.seekFill, { width: `${progress * 100}%` as any }]} />
                                    </View>
                                    <View style={[styles.seekThumb, { left: thumbLeft }]} pointerEvents="none" />
                                </View>
                                <View style={styles.timeRow}>
                                    <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                                    <Text style={styles.timeText}>{formatTime(duration)}</Text>
                                </View>
                            </View>

                            {/* Controls */}
                            <View style={styles.controls}>
                                <Pressable style={styles.sideBtn} onPress={toggleShuffle} hitSlop={8}>
                                    <Text style={[styles.modeIcon, isShuffled && styles.modeIconActive]}>
                                        <Foundation name="shuffle" color="#34D399" size={24} />
                                    </Text>
                                    {isShuffled && <View style={styles.modeDot} />}
                                </Pressable>

                                <Pressable style={styles.sideBtn} onPress={playPrev}>
                                    <MaterialCommunityIcons name="skip-previous" color="#fff" size={30} />
                                </Pressable>

                                <Pressable style={styles.playBtn} onPress={togglePlay}>
                                    <LinearGradient colors={[COLORS.accent, COLORS.accentAlt]} style={styles.playBtnGradient}>
                                        <Text style={styles.playBtnIcon}>{!isLoaded ? '⏳' : isPlaying ? '⏸' : '▶'}</Text>
                                    </LinearGradient>
                                </Pressable>

                                <Pressable style={styles.sideBtn} onPress={playNext}>
                                    <Text style={styles.sideBtnIcon}>
                                        <MaterialCommunityIcons name="skip-next" color="#fff" size={30} />
                                    </Text>
                                </Pressable>

                                <Pressable style={styles.sideBtn} onPress={cycleRepeatMode} hitSlop={8}>
                                    <Text style={[styles.modeIcon, repeatMode !== 'none' && styles.modeIconActive]}>
                                        {repeatLabel(repeatMode)}
                                    </Text>
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

                            {/* Lyric hint */}
                            {showLyricsTab && activePage === 0 && (
                                <Pressable style={styles.lyricHint} onPress={() => goToPage(1)}>
                                    <Text style={styles.lyricHintText}>📝 Vuốt sang phải để xem lời nhạc</Text>
                                </Pressable>
                            )}

                            {/* Stats */}
                            <View style={styles.stats}>
                                <Text style={styles.statsText}>
                                    🎧 {currentSong.playCount?.toLocaleString('vi-VN') ?? 0} lượt nghe
                                </Text>
                            </View>

                            <View style={{ height: insets.bottom + 16 }} />
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
                                        <Text style={styles.lyricMiniPlay}>{isPlaying ? '⏸' : '▶'}</Text>
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
                            {
                                icon: '➕',
                                label: 'Thêm vào playlist',
                                onPress: () => openPlaylistPicker(),
                            },
                            {
                                icon: '🚩',
                                label: 'Báo cáo bài hát',
                                destructive: true,
                                separator: true,
                                onPress: async () => {
                                    await reportSong(currentSong.id, { reason: 'SPAM', description: 'Reported from full player' });
                                },
                            },
                        ]}
                    />

                    {/* Playlist picker */}
                    <Modal visible={playlistPickerOpen} transparent animationType="slide" onRequestClose={() => setPlaylistPickerOpen(false)}>
                        <Pressable style={styles.menuBackdrop} onPress={() => setPlaylistPickerOpen(false)}>
                            <View style={styles.menuSheet}>
                                <Text style={styles.menuTitle}>Thêm vào playlist</Text>
                                {playlists.map((p) => (
                                    <Pressable key={p.id} onPress={async () => {
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
                </LinearGradient>
            </Animated.View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    root:               { flex: 1 },
    header:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 24 },
    chevron:            { color: COLORS.white, fontSize: 32, lineHeight: 32, fontWeight: '700' },
    headerTitle:        { color: COLORS.glass60, fontSize: 13, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
    moreBtn:            { color: COLORS.white, fontSize: 30, lineHeight: 30 },

    pageIndicator:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
    pageIndicatorText:  { color: COLORS.glass35, fontSize: 13, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
    pageIndicatorActive: { color: COLORS.white },
    pageDot:            { width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.glass30 },

    artworkSection:     { alignItems: 'center', marginTop: 8, marginBottom: 20 },
    artwork:            { width: 240, height: 240, borderRadius: 20, backgroundColor: COLORS.surface },
    artworkPlaceholder: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.accentBorder25, backgroundColor: COLORS.accentFill20 },
    artworkIcon:        { fontSize: 70 },
    songInfo:           { marginBottom: 18 },
    songTitle:          { color: COLORS.white, fontSize: 22, fontWeight: '800', marginBottom: 6 },
    artistName:         { color: COLORS.glass60, fontSize: 15, fontWeight: '500', marginBottom: 8 },
    genreRow:           { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    genreChip:          { backgroundColor: COLORS.accentFill20, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: COLORS.accentBorder25 },
    genreText:          { color: COLORS.accent, fontSize: 11, fontWeight: '600' },
    progressSection:    { marginBottom: 18 },
    seekTouchArea:      { height: 40, justifyContent: 'center' },
    seekTrack:          { height: 4, backgroundColor: COLORS.glass15, borderRadius: 2 },
    seekFill:           { height: 4, backgroundColor: COLORS.accent, borderRadius: 2 },
    seekThumb:          { position: 'absolute', top: '50%', marginTop: -THUMB_RADIUS, width: THUMB_RADIUS * 2, height: THUMB_RADIUS * 2, borderRadius: THUMB_RADIUS, backgroundColor: COLORS.white, shadowColor: COLORS.accentDeep, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 4, elevation: 4 },
    timeRow:            { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
    timeText:           { color: COLORS.glass40, fontSize: 12, fontWeight: '500' },

    controls:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 4 },
    sideBtn:            { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
    sideBtnIcon:        { fontSize: 28, color: COLORS.glass70 },
    playBtn:            { borderRadius: 36, overflow: 'hidden', shadowColor: COLORS.accentDeep, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 12, elevation: 8 },
    playBtnGradient:    { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
    playBtnIcon:        { fontSize: 28, color: COLORS.white },

    modeIcon:           { fontSize: 22, color: COLORS.glass35 },
    modeIconActive:     { color: COLORS.accent },
    modeDot:            { width: 5, height: 5, borderRadius: 3, backgroundColor: COLORS.accent, marginTop: 2 },
    modeLabels:         { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 14, minHeight: 18 },
    modeLabelText:      { color: COLORS.glass45, fontSize: 11, fontWeight: '600' },

    qualitySection:         { marginBottom: 14 },
    qualityHeader:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    qualityLabel:           { color: COLORS.glass40, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
    autoBtn:                { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
    autoBtnActive:          { borderColor: COLORS.accent, backgroundColor: COLORS.accentFill20 },
    autoBtnText:            { color: COLORS.muted, fontSize: 11, fontWeight: '600' },
    autoBtnTextActive:      { color: COLORS.accent },
    qualityRow:             { flexDirection: 'row', gap: 8, marginBottom: 8 },
    qualityBtn:             { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
    qualityBtnActive:       { borderColor: COLORS.accent, backgroundColor: COLORS.accentFill20 },
    qualityBtnLocked:       { opacity: 0.35 },
    qualityBtnText:         { color: COLORS.muted, fontSize: 12, fontWeight: '600' },
    qualityBtnTextActive:   { color: COLORS.accent },
    qualityBtnTextLocked:   { color: COLORS.glass25 },
    qualityHint:            { color: COLORS.glass30, fontSize: 11, lineHeight: 16 },

    lyricHint:          { alignItems: 'center', marginBottom: 8 },
    lyricHintText:      { color: COLORS.glass30, fontSize: 12, fontWeight: '500' },

    lyricMiniBar:       { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 10 },
    lyricMiniArt:       { width: 40, height: 40, borderRadius: 8, backgroundColor: COLORS.surface },
    lyricMiniTitle:     { color: COLORS.white, fontSize: 14, fontWeight: '700' },
    lyricMiniArtist:    { color: COLORS.glass50, fontSize: 12 },
    lyricMiniPlay:      { color: COLORS.white, fontSize: 22 },
    lyricProgress:      { height: 2, backgroundColor: COLORS.glass10, marginHorizontal: 20 },
    lyricProgressFill:  { height: 2, backgroundColor: COLORS.accent, borderRadius: 1 },

    menuBackdrop:       { flex: 1, justifyContent: 'flex-end', backgroundColor: COLORS.scrim },
    menuSheet:          { backgroundColor: COLORS.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, gap: 10 },
    menuTitle:          { color: COLORS.white, fontSize: 16, fontWeight: '800', marginBottom: 6 },
    menuItem:           { color: COLORS.glass90, fontSize: 14, marginBottom: 8 },
    menuItemAccent:     { color: COLORS.accent, fontSize: 14, fontWeight: '700' },
    playlistInput:      { color: COLORS.white, borderWidth: 1, borderColor: COLORS.glass20, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 10 },
    stats:              { alignItems: 'center' },
    statsText:          { color: COLORS.glass30, fontSize: 13 },
});
