import React, { useRef, useEffect, useState } from 'react';
import {
    View, StyleSheet, Animated, GestureResponderEvent,
    Dimensions, Image, ActivityIndicator, Pressable,
} from 'react-native';
import { COLORS, type ColorScheme, useThemeColors } from '../config/colors';

const { width: SCREEN_W } = Dimensions.get('window');

interface WaveformProps {
    /** Waveform image URL (PNG/SVG) */
    waveformImageUrl?: string;
    /** Raw amplitude data (JSON array) */
    amplitudes?: number[];
    /** Current playback position (0-1) */
    progress: number;
    /** Current time in seconds */
    currentTime: number;
    /** Total duration in seconds */
    duration: number;
    /** Callback when user seeks */
    onSeek?: (timeSeconds: number) => void;
    /** Loading state */
    loading?: boolean;
    /** Error message */
    error?: string | null;
    /** Style variant: 'compact' | 'full' */
    variant?: 'compact' | 'full';
}

export const Waveform = React.memo(({
    waveformImageUrl,
    amplitudes,
    progress,
    currentTime,
    duration,
    onSeek,
    loading = false,
    error = null,
    variant = 'compact',
}: WaveformProps) => {
    const themeColors = useThemeColors();
    const styles = React.useMemo(() => createStyles(themeColors, variant), [themeColors, variant]);
    const waveformRef = useRef<View>(null);
    const [waveformWidth, setWaveformWidth] = useState(0);

    // Handle tap to seek
    const handleWaveformTap = (e: GestureResponderEvent) => {
        if (!onSeek || duration <= 0) return;

        const { x } = e.nativeEvent.locationX || { x: 0 };
        if (x === 0 && !e.nativeEvent.locationX) return;

        const ratio = Math.max(0, Math.min(1, x / waveformWidth));
        const seekTime = ratio * duration;
        onSeek(seekTime);
    };

    // For compact mode: show progress indicator over waveform
    if (variant === 'compact' && waveformImageUrl) {
        return (
            <Pressable
                style={styles.compactContainer}
                onPress={handleWaveformTap}
                ref={waveformRef}
                onLayout={e => setWaveformWidth(e.nativeEvent.layout.width)}
            >
                {/* Waveform image background */}
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator color={COLORS.accent} size="small" />
                    </View>
                ) : error ? (
                    <View style={styles.errorContainer} />
                ) : (
                    <>
                        <Image
                            source={{ uri: waveformImageUrl }}
                            style={styles.waveformImage}
                            resizeMode="cover"
                        />
                        {/* Progress overlay */}
                        <View
                            style={[
                                styles.progressOverlay,
                                { width: `${progress * 100}%` },
                            ]}
                        />
                        {/* Seek indicator */}
                        <View
                            style={[
                                styles.seekIndicator,
                                { left: `${progress * 100}%` },
                            ]}
                            pointerEvents="none"
                        />
                    </>
                )}
            </Pressable>
        );
    }

    // For full mode: Canvas-based custom waveform with JSON data
    if (variant === 'full' && amplitudes && amplitudes.length > 0) {
        return (
            <Pressable
                style={styles.fullContainer}
                onPress={handleWaveformTap}
                ref={waveformRef}
                onLayout={e => setWaveformWidth(e.nativeEvent.layout.width)}
            >
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator color={COLORS.accent} size="large" />
                    </View>
                ) : (
                    <>
                        {/* Canvas-style waveform */}
                        <WaveformCanvas
                            amplitudes={amplitudes}
                            progress={progress}
                            width={waveformWidth}
                            height={60}
                            themeColors={themeColors}
                        />
                        {/* Seek indicator */}
                        <View
                            style={[
                                styles.seekIndicatorFull,
                                { left: `${progress * 100}%` },
                            ]}
                            pointerEvents="none"
                        />
                    </>
                )}
            </Pressable>
        );
    }

    // Fallback: simple progress bar
    return (
        <Pressable
            style={styles.fallbackContainer}
            onPress={handleWaveformTap}
            ref={waveformRef}
            onLayout={e => setWaveformWidth(e.nativeEvent.layout.width)}
        >
            <View style={styles.fallbackTrack}>
                <View
                    style={[
                        styles.fallbackFill,
                        { width: `${progress * 100}%` },
                    ]}
                />
            </View>
        </Pressable>
    );
});

/**
 * Canvas-style waveform renderer using Views
 * (Note: React Native doesn't have Canvas API, so we simulate with Views)
 */
interface WaveformCanvasProps {
    amplitudes: number[];
    progress: number;
    width: number;
    height: number;
    themeColors: ColorScheme;
}

const WaveformCanvas = React.memo(({
    amplitudes,
    progress,
    width,
    height,
    themeColors,
}: WaveformCanvasProps) => {
    const barWidth = Math.max(1, Math.floor(width / amplitudes.length));
    const barGap = Math.max(0, barWidth > 2 ? 1 : 0);
    const centerY = height / 2;

    return (
        <View style={{ width, height, flexDirection: 'row', alignItems: 'center', gap: barGap }}>
            {amplitudes.slice(0, Math.floor(width / (barWidth + barGap))).map((amp, idx) => {
                const amp0to1 = Math.max(0, Math.min(1, amp / 100));
                const barHeight = amp0to1 * (centerY - 4);
                const isPlayed = idx / amplitudes.length < progress;

                return (
                    <View
                        key={idx}
                        style={{
                            width: barWidth,
                            height: barHeight,
                            borderRadius: barWidth / 2,
                            backgroundColor: isPlayed
                                ? themeColors.accent
                                : themeColors.glass25,
                            marginVertical: centerY - barHeight / 2,
                        }}
                    />
                );
            })}
        </View>
    );
});

const createStyles = (c: ColorScheme, variant: 'compact' | 'full') =>
    StyleSheet.create({
        // === COMPACT MODE ===
        compactContainer: {
            height: variant === 'compact' ? 40 : 80,
            backgroundColor: c.glass05,
            borderRadius: 8,
            overflow: 'hidden',
            marginHorizontal: 20,
            marginVertical: 8,
        },
        waveformImage: {
            width: '100%',
            height: '100%',
        },
        progressOverlay: {
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            backgroundColor: c.accentFill20,
            opacity: 0.6,
        },
        seekIndicator: {
            position: 'absolute',
            top: 0,
            width: 2,
            height: '100%',
            backgroundColor: c.accent,
        },

        // === FULL MODE ===
        fullContainer: {
            height: 80,
            backgroundColor: c.glass02,
            borderRadius: 12,
            marginHorizontal: 20,
            marginVertical: 16,
            justifyContent: 'center',
            overflow: 'hidden',
        },
        seekIndicatorFull: {
            position: 'absolute',
            top: 0,
            width: 3,
            height: '100%',
            backgroundColor: c.white,
            shadowColor: c.accent,
            shadowOpacity: 0.6,
            shadowRadius: 8,
            elevation: 5,
        },

        // === FALLBACK ===
        fallbackContainer: {
            height: 20,
            justifyContent: 'center',
            marginHorizontal: 20,
            marginVertical: 8,
        },
        fallbackTrack: {
            height: 3,
            backgroundColor: c.glass12,
            borderRadius: 2,
        },
        fallbackFill: {
            height: 3,
            backgroundColor: c.white,
            borderRadius: 2,
        },

        // === LOADING/ERROR ===
        loadingContainer: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
        },
        errorContainer: {
            flex: 1,
            backgroundColor: c.glass08,
        },
    });

Waveform.displayName = 'Waveform';
WaveformCanvas.displayName = 'WaveformCanvas';
