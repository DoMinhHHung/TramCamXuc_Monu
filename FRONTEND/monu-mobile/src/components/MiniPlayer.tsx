import React, { useRef } from 'react';
import {
    Animated, PanResponder, Pressable,
    StyleSheet, Text, View, Image,
} from 'react-native';
import { COLORS } from '../config/colors';
import { usePlayer } from '../context/PlayerContext';

const TAB_BAR_HEIGHT  = 78;
const MINI_HEIGHT     = 64;
const SWIPE_THRESHOLD = 60;

export const MiniPlayer = () => {
    const {
        currentSong, isPlaying, isLoaded,
        currentTime, duration,
        togglePlay, playNext, setFullScreen, stopPlayer,
    } = usePlayer();

    const translateY = useRef(new Animated.Value(0)).current;
    const translateX = useRef(new Animated.Value(0)).current;

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gs) => {
                const swipeDown = gs.dy >  8 && Math.abs(gs.dy) > Math.abs(gs.dx);
                const swipeLeft = gs.dx < -8 && Math.abs(gs.dx) > Math.abs(gs.dy);
                return swipeDown || swipeLeft;
            },

            onPanResponderMove: (_, gs) => {
                if (gs.dy > 0 && Math.abs(gs.dy) >= Math.abs(gs.dx)) {
                    translateY.setValue(gs.dy);
                } else if (gs.dx < 0 && Math.abs(gs.dx) > Math.abs(gs.dy)) {
                    translateX.setValue(gs.dx);
                }
            },

            onPanResponderRelease: (_, gs) => {
                const swipedDown = gs.dy >  SWIPE_THRESHOLD;
                const swipedLeft = gs.dx < -SWIPE_THRESHOLD;

                if (swipedDown || swipedLeft) {
                    const anim = swipedLeft
                        ? Animated.timing(translateX, { toValue: -500, duration: 220, useNativeDriver: true })
                        : Animated.timing(translateY, { toValue: MINI_HEIGHT + TAB_BAR_HEIGHT + 40, duration: 200, useNativeDriver: true });

                    anim.start(() => {
                        translateY.setValue(0);
                        translateX.setValue(0);
                        stopPlayer();
                    });
                } else {
                    Animated.parallel([
                        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 8 }),
                        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 8 }),
                    ]).start();
                }
            },
        }),
    ).current;

    const progress = duration > 0 ? currentTime / duration : 0;

    if (!currentSong) return null;

    return (
        <Animated.View
            style={[styles.container, { transform: [{ translateY }, { translateX }] }]}
            {...panResponder.panHandlers}
        >
            <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
            </View>

            <Pressable style={styles.content} onPress={() => setFullScreen(true)} accessible={false}>
                {currentSong.thumbnailUrl
                    ? <Image source={{ uri: currentSong.thumbnailUrl }} style={styles.thumbnail} />
                    : <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}><Text style={styles.thumbnailIcon}>🎵</Text></View>
                }

                <View style={styles.info}>
                    <Text style={styles.title}   numberOfLines={1}>{currentSong.title}</Text>
                    <Text style={styles.artist}  numberOfLines={1}>{currentSong.primaryArtist?.stageName ?? ''}</Text>
                </View>

                <View style={styles.controls}>
                    <Pressable style={styles.iconBtn} hitSlop={12} onPress={e => { e.stopPropagation(); togglePlay(); }}>
                        <Text style={styles.iconText}>{!isLoaded ? '⏳' : isPlaying ? '⏸' : '▶'}</Text>
                    </Pressable>
                    <Pressable style={styles.iconBtn} hitSlop={12} onPress={e => { e.stopPropagation(); playNext(); }}>
                        <Text style={styles.iconText}>⏭</Text>
                    </Pressable>
                </View>
            </Pressable>

            <View style={styles.swipeHandle} />
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute', bottom: TAB_BAR_HEIGHT, left: 8, right: 8,
        height: MINI_HEIGHT, backgroundColor: COLORS.surface, borderRadius: 16,
        overflow: 'hidden', borderWidth: 1, borderColor: COLORS.accentBorder25,
        shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 10,
    },
    progressTrack: { height: 2, backgroundColor: COLORS.glass15 },
    progressFill:  { height: 2, backgroundColor: COLORS.accent },
    content:       { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 10 },
    thumbnail:           { width: 40, height: 40, borderRadius: 8, backgroundColor: COLORS.accentFill20 },
    thumbnailPlaceholder: { alignItems: 'center', justifyContent: 'center' },
    thumbnailIcon:        { fontSize: 20 },
    info:    { flex: 1 },
    title:   { color: COLORS.white,   fontSize: 14, fontWeight: '700', lineHeight: 18 },
    artist:  { color: COLORS.glass60, fontSize: 12, fontWeight: '400', lineHeight: 16 },
    controls: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    iconBtn:  { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    iconText: { fontSize: 20, color: COLORS.white },
    swipeHandle: { position: 'absolute', top: 5, alignSelf: 'center', width: 32, height: 3, borderRadius: 2, backgroundColor: COLORS.glass30 },
});