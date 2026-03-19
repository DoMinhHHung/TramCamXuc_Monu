import React, { useEffect, useRef } from 'react';
import {
    Animated, Pressable, StyleSheet, Text, View,
} from 'react-native';
import { COLORS } from '../config/colors';
import { VoiceSearchState } from '../hooks/useVoiceSearch';

interface VoiceSearchButtonProps {
    state: VoiceSearchState;
    onPressIn:  () => void;
    onPressOut: () => void;
}

export const VoiceSearchButton = ({
    state, onPressIn, onPressOut,
}: VoiceSearchButtonProps) => {
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

const styles = StyleSheet.create({
    btn: {
        width: SIZE, height: SIZE, borderRadius: SIZE / 2,
        backgroundColor: COLORS.surface,
        borderWidth: 1, borderColor: COLORS.border,
        alignItems: 'center', justifyContent: 'center',
    },
    btnRecording: {
        backgroundColor: COLORS.accentDim,
        borderColor:     COLORS.accent,
    },
    btnProcessing: {
        opacity: 0.6,
    },
    pulse: {
        position: 'absolute',
        width: SIZE, height: SIZE, borderRadius: SIZE / 2,
        backgroundColor: COLORS.accent,
        opacity: 0.25,
        alignSelf: 'center',
    },
    icon: { fontSize: 18 },
});