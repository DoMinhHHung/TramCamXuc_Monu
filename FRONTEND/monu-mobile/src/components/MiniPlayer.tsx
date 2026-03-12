/**
 * MiniPlayer.tsx
 * - Hiện khi có bài đang phát, float phía trên tab bar
 * - Tap vào → mở FullPlayerModal
 * - Vuốt xuống (dy > 60) → stopPlayer (dừng nhạc + ẩn MiniPlayer)
 */

import React, { useRef } from 'react';
import {
    Animated,
    PanResponder,
    Pressable,
    StyleSheet,
    Text,
    View,
    Image,
} from 'react-native';
import { COLORS } from '../config/colors';
import { usePlayer } from '../context/PlayerContext';

const TAB_BAR_HEIGHT   = 78;
const MINI_HEIGHT      = 64;
const SWIPE_THRESHOLD  = 60; // px vuốt xuống để đóng

export const MiniPlayer = () => {
    const {
        currentSong,
        isPlaying,
        isLoaded,
        currentTime,
        duration,
        togglePlay,
        playNext,
        setFullScreen,
        stopPlayer,
    } = usePlayer();

    // ── Animated value cho swipe gesture ─────────────────────────────────────
    const translateY = useRef(new Animated.Value(0)).current;

    // ── PanResponder: detect vuốt xuống ──────────────────────────────────────
    const panResponder = useRef(
        PanResponder.create({
            // Chỉ nhận gesture nếu user vuốt XUỐNG (dy > 0) và đủ dứt khoát
            onMoveShouldSetPanResponder: (_, gs) =>
                gs.dy > 8 && Math.abs(gs.dy) > Math.abs(gs.dx),

            onPanResponderMove: (_, gs) => {
                // Chỉ cho kéo xuống (dy dương), không kéo lên
                if (gs.dy > 0) {
                    translateY.setValue(gs.dy);
                }
            },

            onPanResponderRelease: (_, gs) => {
                if (gs.dy > SWIPE_THRESHOLD) {
                    // Đủ ngưỡng → animate rơi xuống rồi stop
                    Animated.timing(translateY, {
                        toValue: MINI_HEIGHT + TAB_BAR_HEIGHT,
                        duration: 200,
                        useNativeDriver: true,
                    }).start(() => {
                        translateY.setValue(0);
                        stopPlayer();
                    });
                } else {
                    // Chưa đủ → snap về vị trí cũ
                    Animated.spring(translateY, {
                        toValue: 0,
                        useNativeDriver: true,
                        bounciness: 8,
                    }).start();
                }
            },
        }),
    ).current;

    // ── Progress ──────────────────────────────────────────────────────────────
    const progress = duration > 0 ? currentTime / duration : 0;

    if (!currentSong) return null;

    return (
        <Animated.View
            style={[
                styles.container,
                { transform: [{ translateY }] },
            ]}
            {...panResponder.panHandlers}
        >
            {/* Progress bar mỏng ở trên cùng */}
            <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
            </View>

            {/* Nội dung */}
            <Pressable
                style={styles.content}
                onPress={() => setFullScreen(true)}
                // Quan trọng: không tiêu thụ gesture của PanResponder
                accessible={false}
            >
                {/* Thumbnail */}
                {currentSong.thumbnailUrl ? (
                    <Image
                        source={{ uri: currentSong.thumbnailUrl }}
                        style={styles.thumbnail}
                    />
                ) : (
                    <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
                        <Text style={styles.thumbnailIcon}>🎵</Text>
                    </View>
                )}

                {/* Title + Artist */}
                <View style={styles.info}>
                    <Text style={styles.title} numberOfLines={1}>
                        {currentSong.title}
                    </Text>
                    <Text style={styles.artist} numberOfLines={1}>
                        {currentSong.primaryArtist?.stageName ?? ''}
                    </Text>
                </View>

                {/* Controls */}
                <View style={styles.controls}>
                    {/* Play / Pause */}
                    <Pressable
                        style={styles.iconBtn}
                        hitSlop={12}
                        onPress={e => {
                            e.stopPropagation();
                            togglePlay();
                        }}
                    >
                        <Text style={styles.iconText}>
                            {!isLoaded ? '⏳' : isPlaying ? '⏸' : '▶'}
                        </Text>
                    </Pressable>

                    {/* Next */}
                    <Pressable
                        style={styles.iconBtn}
                        hitSlop={12}
                        onPress={e => {
                            e.stopPropagation();
                            playNext();
                        }}
                    >
                        <Text style={styles.iconText}>⏭</Text>
                    </Pressable>
                </View>
            </Pressable>

            {/* Swipe indicator */}
            <View style={styles.swipeHandle} />
        </Animated.View>
    );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: TAB_BAR_HEIGHT,
        left: 8,
        right: 8,
        height: MINI_HEIGHT,
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.accentBorder25,
        // Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
    },

    // ── Progress bar ──
    progressTrack: {
        height: 2,
        backgroundColor: COLORS.glass15,
    },
    progressFill: {
        height: 2,
        backgroundColor: COLORS.accent,
    },

    // ── Content row ──
    content: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        gap: 10,
    },

    // ── Thumbnail ──
    thumbnail: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: COLORS.accentFill20,
    },
    thumbnailPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    thumbnailIcon: {
        fontSize: 20,
    },

    // ── Info ──
    info: {
        flex: 1,
    },
    title: {
        color: COLORS.white,
        fontSize: 14,
        fontWeight: '700',
        lineHeight: 18,
    },
    artist: {
        color: COLORS.glass60,
        fontSize: 12,
        fontWeight: '400',
        lineHeight: 16,
    },

    // ── Controls ──
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    iconBtn: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconText: {
        fontSize: 20,
        color: COLORS.white,
    },

    // ── Swipe hint ──
    swipeHandle: {
        position: 'absolute',
        top: 5,
        alignSelf: 'center',
        width: 32,
        height: 3,
        borderRadius: 2,
        backgroundColor: COLORS.glass30,
    },
});