// src/components/AdPlayerModal.tsx
//
// Modal phát quảng cáo audio.
// Dùng AudioPlayer riêng (không dùng PlayerContext) để tránh conflict.
// Sau khi ad kết thúc hoặc user skip → gọi onFinished() để resume nhạc chính.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Linking,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '../config/colors';
import { AdDelivery, recordAdClicked, recordAdPlayed } from '../services/ads';

// ─── Số giây trước khi cho phép skip ─────────────────────────────────────────
const SKIP_LOCK_SECONDS = 5;

// ─── Props ────────────────────────────────────────────────────────────────────

interface AdPlayerModalProps {
    /** Ad cần phát. null → modal không render */
    ad: AdDelivery | null;
    /** Được gọi khi ad kết thúc (hoặc bị skip) */
    onFinished: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const AdPlayerModal = ({ ad, onFinished }: AdPlayerModalProps) => {
    const insets    = useSafeAreaInsets();
    const visible   = ad !== null;

    const [countdown,  setCountdown]  = useState(0);
    const [canSkip,    setCanSkip]    = useState(false);
    const progressAnim                = useRef(new Animated.Value(0)).current;
    const slideAnim                   = useRef(new Animated.Value(300)).current;

    // Cờ đảm bảo chỉ gọi onFinished một lần
    const dismissedRef = useRef(false);

    // Player riêng cho ad (tách biệt hoàn toàn với PlayerContext)
    const adPlayer = useAudioPlayer(null);
    const adStatus = useAudioPlayerStatus(adPlayer);

    // ── Khi ad thay đổi → reset và bắt đầu ──────────────────────────────────

    useEffect(() => {
        if (!ad) return;

        dismissedRef.current = false;
        setCanSkip(false);
        setCountdown(ad.durationSeconds);
        progressAnim.setValue(0);

        // Slide up animation
        Animated.spring(slideAnim, {
            toValue: 0,
            tension: 65,
            friction: 11,
            useNativeDriver: true,
        }).start();

        // Load và phát audio ad
        adPlayer.replace({ uri: ad.audioUrl });
        adPlayer.play();

        // Progress bar animation
        Animated.timing(progressAnim, {
            toValue: 1,
            duration: ad.durationSeconds * 1000,
            useNativeDriver: false,
        }).start();

        // Đếm ngược
        const interval = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) { clearInterval(interval); return 0; }
                return prev - 1;
            });
        }, 1000);

        // Mở khóa skip
        const skipTimer = setTimeout(() => setCanSkip(true), SKIP_LOCK_SECONDS * 1000);

        return () => {
            clearInterval(interval);
            clearTimeout(skipTimer);
            progressAnim.stopAnimation();
        };
    }, [ad?.adId]);

    // ── Phát hiện ad kết thúc tự nhiên ──────────────────────────────────────

    useEffect(() => {
        if (!ad) return;
        if (!adStatus.isLoaded) return;
        if (adStatus.playing) return;     // đang phát → bỏ qua
        if (dismissedRef.current) return; // đã dismiss rồi

        const dur = adStatus.duration    ?? 0;
        const pos = adStatus.currentTime ?? 0;

        // Kết thúc khi pos >= 85% duration (buffer cho lag)
        if (dur > 0 && pos >= dur * 0.85) {
            void handleFinish(true);
        }
    }, [adStatus.playing, ad]);

    // ── Dismiss ───────────────────────────────────────────────────────────────

    const handleFinish = useCallback(
        async (completed: boolean): Promise<void> => {
            if (dismissedRef.current || !ad) return;
            dismissedRef.current = true;

            // Stop audio
            try { adPlayer.pause(); } catch { /* ignore */ }

            // Báo backend
            await recordAdPlayed(ad.adId, { completed });

            // Slide down animation rồi gọi onFinished
            Animated.timing(slideAnim, {
                toValue: 300,
                duration: 220,
                useNativeDriver: true,
            }).start(() => {
                onFinished();
            });
        },
        [ad, adPlayer, onFinished, slideAnim],
    );

    const handleSkip = useCallback((): void => {
        if (!canSkip) return;
        void handleFinish(false);
    }, [canSkip, handleFinish]);

    const handleClick = useCallback(async (): Promise<void> => {
        if (!ad) return;
        await recordAdClicked(ad.adId);
        Linking.openURL(ad.targetUrl).catch(() => {});
    }, [ad]);

    // ── Render ────────────────────────────────────────────────────────────────

    if (!ad) return null;

    const progressWidth = progressAnim.interpolate({
        inputRange:  [0, 1],
        outputRange: ['0%', '100%'],
    });

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={handleSkip}
        >
            {/* Backdrop dim */}
            <View style={styles.backdrop} />

            {/* Sheet slide-up */}
            <Animated.View
                style={[
                    styles.sheet,
                    { paddingBottom: insets.bottom + 12 },
                    { transform: [{ translateY: slideAnim }] },
                ]}
            >
                {/* Progress bar */}
                <View style={styles.progressTrack}>
                    <Animated.View style={[styles.progressFill, { width: progressWidth as any }]} />
                </View>

                {/* Header row */}
                <View style={styles.headerRow}>
                    <View style={styles.adBadge}>
                        <Text style={styles.adBadgeText}>QUẢNG CÁO</Text>
                    </View>
                    <View style={styles.headerSpacer} />
                    {/* Countdown */}
                    <View style={styles.countdownWrap}>
                        <Text style={styles.countdownText}>{countdown}s</Text>
                    </View>
                </View>

                {/* Content */}
                <View style={styles.content}>
                    {/* Âm thanh đang phát indicator */}
                    <View style={styles.audioRow}>
                        <View style={styles.waveWrap}>
                            {[1, 2, 3, 4].map((i) => (
                                <View
                                    key={i}
                                    style={[styles.wavebar, { height: 6 + i * 5 }]}
                                />
                            ))}
                        </View>
                        <Text style={styles.audioLabel}>Đang phát quảng cáo âm thanh</Text>
                    </View>

                    {/* Advertiser name */}
                    <Text style={styles.advertiserName} numberOfLines={1}>
                        {ad.advertiserName}
                    </Text>

                    {/* Ad title */}
                    <Text style={styles.adTitle} numberOfLines={2}>
                        {ad.title}
                    </Text>

                    {/* Description nếu có */}
                    {!!ad.description && (
                        <Text style={styles.adDesc} numberOfLines={2}>
                            {ad.description}
                        </Text>
                    )}
                </View>

                {/* CTA button */}
                <Pressable style={styles.ctaBtn} onPress={handleClick}>
                    <LinearGradient
                        colors={[COLORS.accent, COLORS.accentAlt]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.ctaGradient}
                    >
                        <Text style={styles.ctaText}>Tìm hiểu thêm ↗</Text>
                    </LinearGradient>
                </Pressable>

                {/* Skip button */}
                <Pressable
                    style={[styles.skipBtn, !canSkip && styles.skipBtnLocked]}
                    onPress={handleSkip}
                    disabled={!canSkip}
                >
                    <Text style={[styles.skipText, !canSkip && styles.skipTextLocked]}>
                        {canSkip
                            ? 'Bỏ qua ›'
                            : `Bỏ qua sau ${Math.max(0, SKIP_LOCK_SECONDS - (ad.durationSeconds - countdown))}s`}
                    </Text>
                </Pressable>
            </Animated.View>
        </Modal>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.70)',
    },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderWidth: 1,
        borderBottomWidth: 0,
        borderColor: COLORS.glass15,
        overflow: 'hidden',
    },

    // ── Progress ───────────────────────────────────────────────────────────────
    progressTrack: {
        height: 3,
        backgroundColor: COLORS.glass10,
    },
    progressFill: {
        height: 3,
        backgroundColor: COLORS.warningMid,
    },

    // ── Header ─────────────────────────────────────────────────────────────────
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 10,
    },
    adBadge: {
        backgroundColor: COLORS.warningDim,
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderWidth: 1,
        borderColor: COLORS.warningBorder,
    },
    adBadgeText: {
        color: COLORS.warningMid,
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.2,
    },
    headerSpacer: { flex: 1 },
    countdownWrap: {
        backgroundColor: COLORS.glass08,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    countdownText: {
        color: COLORS.glass60,
        fontSize: 13,
        fontWeight: '700',
        fontVariant: ['tabular-nums'],
    },

    // ── Content ────────────────────────────────────────────────────────────────
    content: {
        paddingHorizontal: 20,
        paddingBottom: 18,
    },
    audioRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 14,
    },
    waveWrap: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 3,
        height: 24,
    },
    wavebar: {
        width: 3,
        borderRadius: 2,
        backgroundColor: COLORS.accent,
        opacity: 0.7,
    },
    audioLabel: {
        color: COLORS.glass50,
        fontSize: 12,
        fontStyle: 'italic',
    },
    advertiserName: {
        color: COLORS.glass50,
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    adTitle: {
        color: COLORS.white,
        fontSize: 20,
        fontWeight: '800',
        lineHeight: 26,
        marginBottom: 6,
    },
    adDesc: {
        color: COLORS.glass60,
        fontSize: 14,
        lineHeight: 20,
    },

    // ── CTA ────────────────────────────────────────────────────────────────────
    ctaBtn: {
        marginHorizontal: 20,
        borderRadius: 14,
        overflow: 'hidden',
        marginBottom: 10,
    },
    ctaGradient: {
        paddingVertical: 15,
        alignItems: 'center',
    },
    ctaText: {
        color: COLORS.white,
        fontWeight: '800',
        fontSize: 15,
    },

    // ── Skip ───────────────────────────────────────────────────────────────────
    skipBtn: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    skipBtnLocked: {
        opacity: 0.4,
    },
    skipText: {
        color: COLORS.glass60,
        fontSize: 14,
        fontWeight: '600',
    },
    skipTextLocked: {
        color: COLORS.glass30,
    },
});