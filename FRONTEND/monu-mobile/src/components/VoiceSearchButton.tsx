import React, { useEffect, useMemo, useRef } from 'react';
import {
    Animated, Pressable, StyleSheet, Text, View,
} from 'react-native';
import { useThemeColors } from '../config/colors';
import { VoiceSearchState } from '../hooks/useVoiceSearch';

interface VoiceSearchButtonProps {
    state: VoiceSearchState;
    onPressIn:  () => void;
    onPressOut: () => void;
}

export const VoiceSearchButton = ({
    state, onPressIn, onPressOut,
}: VoiceSearchButtonProps) => {
    const colors = useThemeColors();
    const styles = useMemo(() => getStyles(colors), [colors]);
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

    useEffect(() => {
        if (state === 'recording') {
            pulseLoop.current = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.35, duration: 600, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1,    duration: 600, useNativeDriver: true }),
                ]),
            );
            pulseLoop.current.start();
        } else {
            pulseLoop.current?.stop();
            pulseAnim.setValue(1);
        }
        return () => { pulseLoop.current?.stop(); };
    }, [state]);

    const isRecording  = state === 'recording';
    const isProcessing = state === 'processing';

    return (
        <Pressable
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            disabled={isProcessing}
            hitSlop={10}
        >
            {isRecording && (
                <Animated.View
                    style={[
                        styles.pulse,
                        { transform: [{ scale: pulseAnim }] },
                    ]}
                />
            )}

            <View style={[
                styles.btn,
                isRecording  && styles.btnRecording,
                isProcessing && styles.btnProcessing,
            ]}>
                <Text style={styles.icon}>
                    {isProcessing ? '⏳' : '🎤'}
                </Text>
            </View>
        </Pressable>
    );
};

const SIZE = 40;

const getStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
    btn: {
        width: SIZE, height: SIZE, borderRadius: SIZE / 2,
        backgroundColor: colors.surface,
        borderWidth: 1, borderColor: colors.border,
        alignItems: 'center', justifyContent: 'center',
    },
    btnRecording: {
        backgroundColor: colors.accentDim,
        borderColor:     colors.accent,
    },
    btnProcessing: {
        opacity: 0.6,
    },
    pulse: {
        position: 'absolute',
        width: SIZE, height: SIZE, borderRadius: SIZE / 2,
        backgroundColor: colors.accent,
        opacity: 0.25,
        alignSelf: 'center',
    },
    icon: { fontSize: 18 },
});