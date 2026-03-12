/**
 * FullPlayerModal.tsx
 * Full-screen player modal với seek bar kéo được.
 * Fix: thumb dùng absolute left theo pixel thay vì %, tránh overflow
 */

import React, { useCallback } from 'react';
import {
    Image,
    Modal,
    PanResponder,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '../config/colors';
import { usePlayer } from '../context/PlayerContext';

const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
};

const THUMB_RADIUS = 9; // px — bán kính thumb

export const FullPlayerModal = () => {
    const insets = useSafeAreaInsets();
    const {
        currentSong,
        isFullScreen,
        setFullScreen,
        isPlaying,
        isLoaded,
        currentTime,
        duration,
        togglePlay,
        seekTo,
        playNext,
        playPrev,
    } = usePlayer();

    // ── Seek bar ──────────────────────────────────────────────────────────────
    // Dùng pixel width thay vì % để tính thumb position chính xác
    const [barWidth, setBarWidth] = React.useState(1);

    // Clamp helper
    const clampRatio = (x: number) => Math.max(0, Math.min(1, x / barWidth));

    const panResponder = React.useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => {
                seekTo(clampRatio(evt.nativeEvent.locationX) * duration);
            },
            onPanResponderMove: (evt) => {
                seekTo(clampRatio(evt.nativeEvent.locationX) * duration);
            },
        }),
    ).current;

    const progress   = duration > 0 ? currentTime / duration : 0;
    // Vị trí thumb tính bằng pixel, trừ bán kính để căn giữa
    const thumbLeft  = progress * barWidth - THUMB_RADIUS;

    if (!currentSong) return null;

    return (
        <Modal
            visible={isFullScreen}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={() => setFullScreen(false)}
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
                    <View style={{ width: 32 }} />
                </View>

                {/* Artwork */}
                <View style={styles.artworkSection}>
                    {currentSong.thumbnailUrl ? (
                        <Image
                            source={{ uri: currentSong.thumbnailUrl }}
                            style={styles.artwork}
                        />
                    ) : (
                        <View style={[styles.artwork, styles.artworkPlaceholder]}>
                            <Text style={styles.artworkIcon}>🎵</Text>
                        </View>
                    )}
                </View>

                {/* Song info */}
                <View style={styles.songInfo}>
                    <Text style={styles.songTitle} numberOfLines={2}>
                        {currentSong.title}
                    </Text>
                    <Text style={styles.artistName} numberOfLines={1}>
                        {currentSong.primaryArtist?.stageName}
                    </Text>
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

                {/* ── Progress / Seek bar ────────────────────────────────── */}
                <View style={styles.progressSection}>
                    {/*
                     * Touch target cao 40px, track 4px ở giữa.
                     * PanResponder đặt trên toàn bộ view → locationX luôn tính từ trái của bar.
                     */}
                    <View
                        style={styles.seekTouchArea}
                        onLayout={e => setBarWidth(e.nativeEvent.layout.width)}
                        {...panResponder.panHandlers}
                    >
                        {/* Track background */}
                        <View style={styles.seekTrack}>
                            {/* Fill */}
                            <View style={[styles.seekFill, { width: `${progress * 100}%` as any }]} />
                        </View>

                        {/* Thumb — vị trí tính bằng pixel để không bị overflow */}
                        <View
                            style={[
                                styles.seekThumb,
                                { left: Math.max(0, thumbLeft) },
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
                    <Pressable style={styles.sideBtn} onPress={playPrev}>
                        <Text style={styles.sideBtnIcon}>⏮</Text>
                    </Pressable>

                    <Pressable style={styles.playBtn} onPress={togglePlay}>
                        <LinearGradient
                            colors={[COLORS.accent, COLORS.accentAlt]}
                            style={styles.playBtnGradient}
                        >
                            <Text style={styles.playBtnIcon}>
                                {!isLoaded ? '⏳' : isPlaying ? '⏸' : '▶'}
                            </Text>
                        </LinearGradient>
                    </Pressable>

                    <Pressable style={styles.sideBtn} onPress={playNext}>
                        <Text style={styles.sideBtnIcon}>⏭</Text>
                    </Pressable>
                </View>

                {/* Stats */}
                <View style={styles.stats}>
                    <Text style={styles.statsText}>
                        🎧 {currentSong.playCount?.toLocaleString('vi-VN') ?? 0} lượt nghe
                    </Text>
                </View>

                <View style={{ height: insets.bottom + 24 }} />
            </LinearGradient>
        </Modal>
    );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: {
        flex: 1,
        paddingHorizontal: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
    },
    chevron: {
        color: COLORS.white,
        fontSize: 32,
        lineHeight: 32,
        fontWeight: '700',
    },
    headerTitle: {
        color: COLORS.glass60,
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    artworkSection: {
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 32,
    },
    artwork: {
        width: 260,
        height: 260,
        borderRadius: 20,
        backgroundColor: COLORS.surface,
    },
    artworkPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.accentBorder25,
        backgroundColor: COLORS.accentFill20,
    },
    artworkIcon: { fontSize: 80 },
    songInfo: {
        marginBottom: 28,
    },
    songTitle: {
        color: COLORS.white,
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 6,
    },
    artistName: {
        color: COLORS.glass60,
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 10,
    },
    genreRow: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    genreChip: {
        backgroundColor: COLORS.accentFill20,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: COLORS.accentBorder25,
    },
    genreText: {
        color: COLORS.accent,
        fontSize: 11,
        fontWeight: '600',
    },
    progressSection: {
        marginBottom: 24,
    },
    seekTouchArea: {
        height: 40,           // touch target lớn
        justifyContent: 'center',
    },
    seekTrack: {
        height: 4,
        backgroundColor: COLORS.glass15,
        borderRadius: 2,
    },
    seekFill: {
        height: 4,
        backgroundColor: COLORS.accent,
        borderRadius: 2,
    },
    seekThumb: {
        position: 'absolute',
        top: '50%',           // center trong seekTouchArea
        marginTop: -9,        // trừ bán kính (THUMB_RADIUS)
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: COLORS.white,
        shadowColor: COLORS.accentDeep,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
        elevation: 4,
    },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 6,
    },
    timeText: {
        color: COLORS.glass40,
        fontSize: 12,
        fontWeight: '500',
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 32,
        marginBottom: 24,
    },
    sideBtn: {
        width: 52,
        height: 52,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sideBtnIcon: {
        fontSize: 28,
        color: COLORS.glass70,
    },
    playBtn: {
        borderRadius: 36,
        overflow: 'hidden',
        shadowColor: COLORS.accentDeep,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.45,
        shadowRadius: 12,
        elevation: 8,
    },
    playBtnGradient: {
        width: 72,
        height: 72,
        alignItems: 'center',
        justifyContent: 'center',
    },
    playBtnIcon: {
        fontSize: 28,
        color: COLORS.white,
    },
    stats: {
        alignItems: 'center',
    },
    statsText: {
        color: COLORS.glass30,
        fontSize: 13,
    },
});