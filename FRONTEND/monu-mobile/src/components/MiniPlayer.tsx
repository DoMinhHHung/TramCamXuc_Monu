import React, { useEffect, useMemo, useRef } from 'react';
import {
    Animated, PanResponder, Pressable,
    StyleSheet, Text, View, Image,
} from 'react-native';
import { haptic } from '../utils/haptics';
import { usePlayerControls, usePlayerState, usePlayerStatus } from '../context/PlayerContext';
import { useThemeColors, ColorScheme } from '../config/colors';
import { Fold } from 'react-native-animated-spinkit';
import { AppIcon } from '../config/appIcons';
import { MINI_PLAYER_HEIGHT, RADIUS, SHADOW } from '../config/design';
import { LinearGradient } from 'expo-linear-gradient';

const SWIPE_THRESHOLD = 60;

export type MiniPlayerProps = {
    bottomInset: number;
};

export const MiniPlayer = ({ bottomInset }: MiniPlayerProps) => {
    const { currentSong, setFullScreen } = usePlayerState();
    const { isPlaying, isLoaded, currentTime, duration } = usePlayerStatus();
    const { togglePlay, playNext, stopPlayer, repeatMode, isShuffled } = usePlayerControls();

    const bottomInsetRef = useRef(bottomInset);
    bottomInsetRef.current = bottomInset;

    const bottomAnim = useRef(new Animated.Value(bottomInset)).current;
    useEffect(() => {
        Animated.spring(bottomAnim, {
            toValue: bottomInset,
            useNativeDriver: false,
            friction: 9,
            tension: 68,
        }).start();
    }, [bottomInset, bottomAnim]);

    const themeColors = useThemeColors();
    const styles = useMemo(() => getStyles(themeColors), [themeColors]);

    const translateY = useRef(new Animated.Value(0)).current;
    const translateX = useRef(new Animated.Value(0)).current;
    const dragOpacity = useRef(new Animated.Value(1)).current;

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gs) => {
                const swipeDown = gs.dy >  8 && Math.abs(gs.dy) > Math.abs(gs.dx);
                const swipeLeft = gs.dx < -8 && Math.abs(gs.dx) > Math.abs(gs.dy);
                return swipeDown || swipeLeft;
            },

            onPanResponderMove: (_, gs) => {
                if (gs.dy > 0) {
                    translateY.setValue(gs.dy);
                    dragOpacity.setValue(Math.max(0.4, 1 - gs.dy / 120));
                }
            },

            onPanResponderRelease: (_, gs) => {
                const swipedDown = gs.dy >  SWIPE_THRESHOLD;
                const swipedLeft = gs.dx < -SWIPE_THRESHOLD;

                if (swipedDown || swipedLeft) {
                    if (swipedDown) haptic.medium();
                    Animated.parallel([
                        swipedLeft
                            ? Animated.timing(translateX, { toValue: -500, duration: 220, useNativeDriver: true })
                            : Animated.timing(translateY, { toValue: MINI_PLAYER_HEIGHT + bottomInsetRef.current + 40, duration: 200, useNativeDriver: true }),
                        Animated.timing(dragOpacity, { toValue: 0.2, duration: 180, useNativeDriver: true }),
                    ]).start(() => {
                        translateY.setValue(0);
                        translateX.setValue(0);
                        dragOpacity.setValue(1);
                        stopPlayer();
                    });
                } else {
                    Animated.parallel([
                        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 8 }),
                        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 8 }),
                        Animated.spring(dragOpacity, { toValue: 1, useNativeDriver: true, bounciness: 8 }),
                    ]).start();
                }
            },
        }),
    ).current;

    const progress = duration > 0 ? currentTime / duration : 0;

    if (!currentSong) return null;

    return (
        <Animated.View
            style={[
                styles.container,
                { bottom: bottomAnim },
                { opacity: dragOpacity, transform: [{ translateY }, { translateX }] },
            ]}
            {...panResponder.panHandlers}
        >
            <LinearGradient
                colors={['rgba(26, 26, 26, 0.95)', 'rgba(15, 15, 15, 0.97)']}
                style={StyleSheet.absoluteFillObject}
            />

            <View style={styles.progressTrack}>
                <LinearGradient
                    colors={[themeColors.accent, themeColors.success]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                        styles.progressFill,
                        { width: `${progress * 100}%` as any },
                    ]}
                />
            </View>

            <Pressable style={styles.content} onPress={() => setFullScreen(true)} accessible={false}>
                {currentSong.thumbnailUrl
                    ? <Image source={{ uri: currentSong.thumbnailUrl }} style={styles.thumbnail} />
                    : <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
                        <AppIcon name="musicNote" size={20} color={themeColors.muted} />
                    </View>
                }

                <View style={styles.info}>
                    <Text style={styles.title} numberOfLines={1}>{currentSong.title}</Text>
                    <View style={styles.metaRow}>
                        <Text style={styles.artist} numberOfLines={1}>{currentSong.primaryArtist?.stageName ?? ''}</Text>
                        {isShuffled && <AppIcon name="shuffle" size={11} color={themeColors.accent} />}
                        {repeatMode === 'one' && <AppIcon name="repeatOne" size={11} color={themeColors.accent} />}
                        {repeatMode === 'all' && <AppIcon name="repeat" size={11} color={themeColors.accent} />}
                    </View>
                </View>

                <View style={styles.controls}>
                    <Pressable
                        style={styles.iconBtn}
                        hitSlop={12}
                        onPress={e => {
                            e.stopPropagation();
                            togglePlay();
                        }}
                    >
                        {!isLoaded ? (
                            <Fold size={20} color={themeColors.muted} />
                        ) : isPlaying ? (
                            <AppIcon name="pause" size={26} color={themeColors.text} />
                        ) : (
                            <AppIcon name="play" size={28} color={themeColors.text} />
                        )}
                    </Pressable>
                    <Pressable style={styles.iconBtn} hitSlop={12} onPress={e => { e.stopPropagation(); playNext(); }}>
                        <AppIcon name="skipNext" size={24} color={themeColors.text} />
                    </Pressable>

                    <Pressable
                        style={styles.stopBtn}
                        hitSlop={12}
                        onPress={(e) => {
                            e.stopPropagation();
                            haptic.medium();
                            stopPlayer();
                        }}
                    >
                        <AppIcon name="close" size={18} color={themeColors.muted} />
                    </Pressable>
                </View>
            </Pressable>

            <View style={styles.swipeHandle} />
        </Animated.View>
    );
};

const getStyles = (colors: ColorScheme) => StyleSheet.create({
    container: {
        position: 'absolute', left: 12, right: 12,
        height: MINI_PLAYER_HEIGHT + 4,
        borderRadius: 12,
        overflow: 'hidden',
    },
    progressTrack:        { height: 2, backgroundColor: 'rgba(91,127,212,0.2)' },
    progressFill:         { height: 2 },
    content:              { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 10 },
    thumbnail:            { width: 44, height: 44, borderRadius: 8, backgroundColor: colors.surfaceMid },
    thumbnailPlaceholder: { alignItems: 'center', justifyContent: 'center' },
    info:                 { flex: 1, minWidth: 0 },
    metaRow:              { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    title:                { color: colors.text, fontSize: 13, fontWeight: '600', fontFamily: 'Inter', letterSpacing: -0.1 },
    artist:               { color: colors.textSecondary, fontSize: 11, fontWeight: '400', fontFamily: 'Inter' },
    controls:             { flexDirection: 'row', alignItems: 'center', gap: 2 },
    iconBtn:              { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    stopBtn: {
        width: 28,
        height: 28,
        borderRadius: 6,
        backgroundColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 4,
    },
    swipeHandle:          { position: 'absolute', top: 6, alignSelf: 'center', width: 28, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)' },
});
