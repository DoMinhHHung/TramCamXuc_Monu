import React, { useMemo, useRef } from 'react';
import {
    Animated, PanResponder, Pressable,
    StyleSheet, Text, View, Image,
} from 'react-native';
import { haptic } from '../utils/haptics';
import { usePlayer } from '../context/PlayerContext';
import { useThemeColors, ColorScheme } from '../config/colors';
import { Fold } from 'react-native-animated-spinkit';
import { AppIcon } from './AppIcon';
import { RADIUS, SHADOW } from '../config/design';

const TAB_BAR_HEIGHT  = 78;
const MINI_HEIGHT     = 64;
const SWIPE_THRESHOLD = 60;

export const MiniPlayer = () => {
    const {
        currentSong, isPlaying, isLoaded,
        currentTime, duration,
        togglePlay, playNext, setFullScreen, stopPlayer,
        repeatMode, isShuffled,
    } = usePlayer();

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
                    if (swipedDown) {
                        haptic.medium();
                    }
                    Animated.parallel([
                        swipedLeft
                            ? Animated.timing(translateX, { toValue: -500, duration: 220, useNativeDriver: true })
                            : Animated.timing(translateY, { toValue: MINI_HEIGHT + TAB_BAR_HEIGHT + 40, duration: 200, useNativeDriver: true }),
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

    // Progress bar colour reflects repeat / shuffle mode
    const progressColor =
        repeatMode === 'one' ? themeColors.accent :
            repeatMode === 'all' ? themeColors.success :
                themeColors.accent;

    return (
        <Animated.View
            style={[styles.container, { opacity: dragOpacity, transform: [{ translateY }, { translateX }] }]}
            {...panResponder.panHandlers}
        >
            {/* Progress bar */}
            <View style={styles.progressTrack}>
                <View style={[styles.progressFill, {
                    width: `${progress * 100}%` as any,
                    backgroundColor: progressColor,
                }]} />
            </View>

            <Pressable style={styles.content} onPress={() => setFullScreen(true)} accessible={false}>
                {/* Thumbnail */}
                {currentSong.thumbnailUrl
                    ? <Image source={{ uri: currentSong.thumbnailUrl }} style={styles.thumbnail} />
                    : <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
                        <AppIcon set="MaterialIcons" name="music-note" size={20} color={themeColors.muted} />
                    </View>
                }

                {/* Song info */}
                <View style={styles.info}>
                    <Text style={styles.title} numberOfLines={1}>{currentSong.title}</Text>
                    <View style={styles.metaRow}>
                        <Text style={styles.artist} numberOfLines={1}>{currentSong.primaryArtist?.stageName ?? ''}</Text>
                        {isShuffled && (
                            <AppIcon set="MaterialIcons" name="shuffle" size={11} color={themeColors.accent} />
                        )}
                        {repeatMode === 'one' && (
                            <AppIcon set="MaterialIcons" name="repeat-one" size={11} color={themeColors.accent} />
                        )}
                        {repeatMode === 'all' && (
                            <AppIcon set="MaterialCommunityIcons" name="repeat" size={11} color={themeColors.accent} />
                        )}
                    </View>
                </View>

                {/* Controls */}
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
                            <AppIcon set="MaterialIcons" name="pause" size={26} color={themeColors.text} />
                        ) : (
                            <AppIcon set="MaterialIcons" name="play-arrow" size={28} color={themeColors.text} />
                        )}
                    </Pressable>
                    <Pressable style={styles.iconBtn} hitSlop={12} onPress={e => { e.stopPropagation(); playNext(); }}>
                        <AppIcon set="MaterialIcons" name="skip-next" size={24} color={themeColors.text} />
                    </Pressable>
                </View>
            </Pressable>

            {/* Drag handle */}
            <View style={styles.swipeHandle} />
        </Animated.View>
    );
};

const getStyles = (colors: ColorScheme) => StyleSheet.create({
    container: {
        position: 'absolute', bottom: TAB_BAR_HEIGHT, left: 8, right: 8,
        height: MINI_HEIGHT,
        backgroundColor: colors.surface,
        borderRadius: RADIUS.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        ...SHADOW.md,
    },
    progressTrack:        { height: 2, backgroundColor: colors.glass08 },
    progressFill:         { height: 2 },
    content:              { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 10 },
    thumbnail:            { width: 40, height: 40, borderRadius: RADIUS.sm, backgroundColor: colors.surfaceLow },
    thumbnailPlaceholder: { alignItems: 'center', justifyContent: 'center' },
    info:                 { flex: 1 },
    metaRow:              { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    title:                { color: colors.text,   fontSize: 13, fontWeight: '600', lineHeight: 17 },
    artist:               { color: colors.muted,  fontSize: 11, fontWeight: '400' },
    controls:             { flexDirection: 'row', alignItems: 'center', gap: 2 },
    iconBtn:              { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    swipeHandle:          {position: 'absolute', top: 6, alignSelf: 'center',width: 36, height: 4, borderRadius: 2,backgroundColor: colors.glass35,   },
});