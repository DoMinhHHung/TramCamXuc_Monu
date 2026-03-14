import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { COLORS } from '../config/colors';
import { useUpload, UploadStage } from '../context/UploadContext';

const MINI_PLAYER_HEIGHT = 64;
const TAB_BAR_HEIGHT     = 78;
const BOTTOM_OFFSET      = MINI_PLAYER_HEIGHT + TAB_BAR_HEIGHT;

const STAGE_LABEL: Record<UploadStage, string> = {
    idle:       '',
    requesting: 'Đang chuẩn bị...',
    uploading:  'Đang upload...',
    confirming: 'Đang xử lý...',
    done:       '✓ Upload hoàn tất',
    error:      '✕ Upload thất bại',
};

export const UploadProgressBanner = () => {
    const { job, dismissJob } = useUpload();
    const slideAnim = useRef(new Animated.Value(80)).current;
    const prevStage = useRef<UploadStage | null>(null);

    const isActive = job !== null && job.stage !== 'idle';

    // Slide in khi xuất hiện, slide out khi done/error sau 3s
    useEffect(() => {
        if (!isActive) {
            Animated.timing(slideAnim, {
                toValue: 80,
                duration: 220,
                useNativeDriver: true,
            }).start();
            return;
        }

        Animated.spring(slideAnim, {
            toValue: 0,
            tension: 80,
            friction: 10,
            useNativeDriver: true,
        }).start();

        // Auto-dismiss sau khi done hoặc error
        if (job?.stage === 'done' || job?.stage === 'error') {
            const timer = setTimeout(() => {
                Animated.timing(slideAnim, {
                    toValue: 80,
                    duration: 220,
                    useNativeDriver: true,
                }).start(() => {
                    if (job?.stage === 'done') dismissJob();
                });
            }, job.stage === 'done' ? 2500 : 5000);
            return () => clearTimeout(timer);
        }
    }, [isActive, job?.stage]);

    if (!isActive) return null;

    const isError    = job!.stage === 'error';
    const isDone     = job!.stage === 'done';
    const isUploading = job!.stage === 'uploading';
    const progress   = job!.progress;

    const barColor = isError
        ? COLORS.error
        : isDone
            ? COLORS.success
            : COLORS.accent;

    return (
        <Animated.View
            style={[
                styles.container,
                { bottom: BOTTOM_OFFSET, transform: [{ translateY: slideAnim }] },
            ]}
        >
            {/* Progress fill bar */}
            {isUploading && (
                <View style={styles.progressTrack}>
                    <View
                        style={[
                            styles.progressFill,
                            {
                                width: `${progress}%` as any,
                                backgroundColor: barColor,
                            },
                        ]}
                    />
                </View>
            )}

            <View style={styles.content}>
                {/* Left: icon + text */}
                <View style={styles.info}>
                    <View style={[styles.dot, { backgroundColor: barColor }]} />
                    <View style={styles.textBlock}>
                        <Text style={styles.songTitle} numberOfLines={1}>
                            {job!.title}
                        </Text>
                        <Text style={[styles.stageLabel, isError && { color: COLORS.error }]}>
                            {isUploading
                                ? `${STAGE_LABEL.uploading} ${progress}%`
                                : STAGE_LABEL[job!.stage]}
                        </Text>
                        {isError && job!.errorMessage && (
                            <Text style={styles.errorMsg} numberOfLines={1}>
                                {job!.errorMessage}
                            </Text>
                        )}
                    </View>
                </View>

                {/* Right: dismiss (chỉ khi done/error) */}
                {(isDone || isError) && (
                    <Pressable onPress={dismissJob} hitSlop={12} style={styles.closeBtn}>
                        <Text style={styles.closeIcon}>✕</Text>
                    </Pressable>
                )}
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 8,
        right: 8,
        backgroundColor: COLORS.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.accentBorder25,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 12,
        zIndex: 200,
    },
    progressTrack: {
        height: 2,
        backgroundColor: COLORS.glass10,
    },
    progressFill: {
        height: 2,
        borderRadius: 1,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        gap: 10,
    },
    info: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    textBlock: {
        flex: 1,
    },
    songTitle: {
        color: COLORS.white,
        fontSize: 13,
        fontWeight: '700',
        lineHeight: 17,
    },
    stageLabel: {
        color: COLORS.glass50,
        fontSize: 11,
        marginTop: 1,
    },
    errorMsg: {
        color: COLORS.error,
        fontSize: 11,
        marginTop: 1,
    },
    closeBtn: {
        width: 28,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeIcon: {
        color: COLORS.glass40,
        fontSize: 14,
    },
});