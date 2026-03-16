import React, { useRef, useState } from 'react';
import {
    Animated, Image, Modal, PanResponder,
    Pressable, StyleSheet, Text, View, TextInput, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '../config/colors';
import { AudioQuality, usePlayer } from '../context/PlayerContext';
import { addSongToPlaylist, createPlaylist, getMyPlaylists, Playlist, reportSong } from '../services/music';
import { getSongShareQr } from '../services/social';
import { SongActionSheet } from './SongActionSheet';

const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
};

const THUMB_RADIUS = 9;

const QUALITY_OPTIONS: Array<{ value: AudioQuality; label: string }> = [
    { value: 64,  label: '64k'  },
    { value: 128, label: '128k' },
    { value: 256, label: '256k' },
    { value: 320, label: '320k' },
];

export const FullPlayerModal = () => {
    const insets = useSafeAreaInsets();
    const [menuOpen, setMenuOpen] = useState(false);
    const [playlistPickerOpen, setPlaylistPickerOpen] = useState(false);
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [shareQr, setShareQr] = useState<string | null>(null);

    const {
        currentSong, isFullScreen, setFullScreen,
        isPlaying, isLoaded, currentTime, duration,
        togglePlay, seekTo, playNext, playPrev, stopPlayer,
        selectedQuality, maxQuality, setQuality,
    } = usePlayer();

    // ── Seek bar: ref-based để tránh stale closure ────────────────────────────
    const barWidthRef = useRef(1);
    const durationRef = useRef(0);
    React.useEffect(() => { durationRef.current = duration; }, [duration]);

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

    // ── Swipe down / left → dismiss + stop ───────────────────────────────────
    const translateY = useRef(new Animated.Value(0)).current;
    const translateX = useRef(new Animated.Value(0)).current;

    const dismissPan = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gs) => {
                const down = gs.dy >  12 && Math.abs(gs.dy) > Math.abs(gs.dx) * 0.8;
                const left = gs.dx < -12 && Math.abs(gs.dx) > Math.abs(gs.dy) * 0.8;
                return down || left;
            },
            onPanResponderMove: (_, gs) => {
                if (gs.dy > 0 && Math.abs(gs.dy) >= Math.abs(gs.dx)) {
                    translateY.setValue(gs.dy);
                } else if (gs.dx < 0) {
                    translateX.setValue(gs.dx);
                }
            },
            onPanResponderRelease: (_, gs) => {
                const swipedDown = gs.dy >  100;
                const swipedLeft = gs.dx < -80;
                if (swipedDown || swipedLeft) {
                    const anim = swipedLeft
                        ? Animated.timing(translateX, { toValue: -800, duration: 250, useNativeDriver: true })
                        : Animated.timing(translateY, { toValue:  900, duration: 250, useNativeDriver: true });
                    anim.start(() => {
                        translateY.setValue(0);
                        translateX.setValue(0);
                        stopPlayer();
                        setFullScreen(false);
                    });
                } else {
                    Animated.parallel([
                        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 6 }),
                        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 6 }),
                    ]).start();
                }
            },
        }),
    ).current;

    const progress  = duration > 0 ? currentTime / duration : 0;
    const thumbLeft = Math.max(0, progress * barWidthRef.current - THUMB_RADIUS);

    React.useEffect(() => {
        if (!isFullScreen) return;
        void (async () => {
            try {
                const data = await getMyPlaylists({ page: 1, size: 50 });
                setPlaylists(data.content ?? []);
            } catch {
                setPlaylists([]);
            }
        })();
    }, [isFullScreen, currentSong?.id]);

    const openPlaylistPicker = () => {
        setPlaylistPickerOpen(true);
    };

    if (!currentSong) return null;

    return (
        <Modal
            visible={isFullScreen}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={() => setFullScreen(false)}
        >
            <Animated.View
                style={[{ flex: 1 }, { transform: [{ translateY }, { translateX }] }]}
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
                        <Text style={styles.headerTitle}>Đang phát</Text>
                        <Pressable onPress={() => setMenuOpen(true)} hitSlop={10}><Text style={styles.moreBtn}>⋯</Text></Pressable>
                    </View>

                    {/* Artwork */}
                    <View style={styles.artworkSection}>
                        {currentSong.thumbnailUrl
                            ? <Image source={{ uri: currentSong.thumbnailUrl }} style={styles.artwork} />
                            : <View style={[styles.artwork, styles.artworkPlaceholder]}><Text style={styles.artworkIcon}>🎵</Text></View>
                        }
                    </View>

                    {/* Song info */}
                    <View style={styles.songInfo}>
                        <Text style={styles.songTitle}   numberOfLines={2}>{currentSong.title}</Text>
                        <Text style={styles.artistName}  numberOfLines={1}>{currentSong.primaryArtist?.stageName}</Text>
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

                    {/* Seek bar — seekPan chỉ bọc phần seekTouchArea, không tranh với dismissPan */}
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
                        <Pressable style={styles.sideBtn} onPress={playPrev}>
                            <Text style={styles.sideBtnIcon}>⏮</Text>
                        </Pressable>
                        <Pressable style={styles.playBtn} onPress={togglePlay}>
                            <LinearGradient colors={[COLORS.accent, COLORS.accentAlt]} style={styles.playBtnGradient}>
                                <Text style={styles.playBtnIcon}>{!isLoaded ? '⏳' : isPlaying ? '⏸' : '▶'}</Text>
                            </LinearGradient>
                        </Pressable>
                        <Pressable style={styles.sideBtn} onPress={playNext}>
                            <Text style={styles.sideBtnIcon}>⏭</Text>
                        </Pressable>
                    </View>

                    {/* Quality selector */}
                    <View style={styles.qualitySection}>
                        <Text style={styles.qualityLabel}>Chất lượng âm thanh</Text>
                        <View style={styles.qualityRow}>
                            {QUALITY_OPTIONS.map(opt => {
                                const isSelected  = selectedQuality === opt.value;
                                const isAvailable = opt.value <= maxQuality;
                                return (
                                    <Pressable
                                        key={opt.value}
                                        style={[
                                            styles.qualityBtn,
                                            isSelected   && styles.qualityBtnActive,
                                            !isAvailable && styles.qualityBtnLocked,
                                        ]}
                                        onPress={() => isAvailable && setQuality(opt.value)}
                                        disabled={!isAvailable}
                                    >
                                        <Text style={[
                                            styles.qualityBtnText,
                                            isSelected   && styles.qualityBtnTextActive,
                                            !isAvailable && styles.qualityBtnTextLocked,
                                        ]}>
                                            {opt.label}{!isAvailable ? ' 🔒' : ''}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                        <Text style={styles.qualityHint}>
                            {'Đang phát: '}
                            <Text style={{ color: COLORS.accent }}>{selectedQuality}kbps</Text>
                            {maxQuality < 320
                                ? '  •  Nâng cấp Premium để mở chất lượng cao hơn'
                                : '  •  Chất lượng tối đa'}
                        </Text>
                    </View>


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
                                onPress: () => {
                                    openPlaylistPicker();
                                },
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


                    <Modal visible={!!shareQr} transparent animationType="fade" onRequestClose={() => setShareQr(null)}>
                        <Pressable style={styles.menuBackdrop} onPress={() => setShareQr(null)}>
                            <View style={styles.menuSheet}>
                                <Text style={styles.menuTitle}>QR Share</Text>
                                {shareQr ? <Image source={{ uri: shareQr }} style={{ width: 220, height: 220, borderRadius: 10, alignSelf: 'center' }} /> : <Text style={styles.menuItem}>Không tạo được QR</Text>}
                            </View>
                        </Pressable>
                    </Modal>

                    {/* Stats */}
                    <View style={styles.stats}>
                        <Text style={styles.statsText}>
                            🎧 {currentSong.playCount?.toLocaleString('vi-VN') ?? 0} lượt nghe
                        </Text>
                    </View>

                    <View style={{ height: insets.bottom + 16 }} />
                </LinearGradient>
            </Animated.View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    root:               { flex: 1, paddingHorizontal: 24 },
    header:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
    chevron:            { color: COLORS.white, fontSize: 32, lineHeight: 32, fontWeight: '700' },
    headerTitle:        { color: COLORS.glass60, fontSize: 13, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
    moreBtn:            { color: COLORS.white, fontSize: 30, lineHeight: 30 },
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
    controls:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 32, marginBottom: 18 },
    sideBtn:            { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
    sideBtnIcon:        { fontSize: 28, color: COLORS.glass70 },
    playBtn:            { borderRadius: 36, overflow: 'hidden', shadowColor: COLORS.accentDeep, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 12, elevation: 8 },
    playBtnGradient:    { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
    playBtnIcon:        { fontSize: 28, color: COLORS.white },
    qualitySection:         { marginBottom: 14 },
    qualityLabel:           { color: COLORS.glass40, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
    qualityRow:             { flexDirection: 'row', gap: 8, marginBottom: 8 },
    qualityBtn:             { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
    qualityBtnActive:       { borderColor: COLORS.accent, backgroundColor: COLORS.accentFill20 },
    qualityBtnLocked:       { opacity: 0.35 },
    qualityBtnText:         { color: COLORS.muted, fontSize: 12, fontWeight: '600' },
    qualityBtnTextActive:   { color: COLORS.accent },
    qualityBtnTextLocked:   { color: COLORS.glass25 },
    qualityHint:            { color: COLORS.glass30, fontSize: 11, lineHeight: 16 },
    menuBackdrop:       { flex: 1, justifyContent: 'flex-end', backgroundColor: COLORS.scrim },
    menuSheet:          { backgroundColor: COLORS.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, gap: 10 },
    menuTitle:          { color: COLORS.white, fontSize: 16, fontWeight: '800', marginBottom: 6 },
    menuItem:           { color: COLORS.glass90, fontSize: 14, marginBottom: 8 },
    menuItemAccent:     { color: COLORS.accent, fontSize: 14, fontWeight: '700' },
    playlistInput:      { color: COLORS.white, borderWidth: 1, borderColor: COLORS.glass20, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 10 },
    stats:              { alignItems: 'center' },
    statsText:          { color: COLORS.glass30, fontSize: 13 },
});
