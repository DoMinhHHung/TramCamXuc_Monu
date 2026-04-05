import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '../config/colors';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  visible: boolean;
  onHide: () => void;
}

export const Toast = ({ message, type = 'success', visible, onHide }: ToastProps) => {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const onHideRef = useRef(onHide);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHidingRef = useRef(false);
  onHideRef.current = onHide;

  const hideToast = useCallback(() => {
    if (isHidingRef.current) return;
    isHidingRef.current = true;

    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    Animated.parallel([
      Animated.timing(translateY, { toValue: -100, duration: 220, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(({ finished }) => {
      isHidingRef.current = false;
      if (finished) onHideRef.current();
    });
  }, [opacity, translateY]);

  useEffect(() => {
    if (!visible) return undefined;

    isHidingRef.current = false;
    translateY.setValue(-100);
    opacity.setValue(0);

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    const baseDuration = type === 'error' ? 4000 : type === 'info' ? 3500 : 2500;
    const extraPerChar = message.length > 40 ? (message.length - 40) * 30 : 0;
    const totalDuration = Math.min(baseDuration + extraPerChar, 6000);

    hideTimerRef.current = setTimeout(hideToast, totalDuration);

    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [visible, message, type, hideToast, translateY, opacity]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  if (!visible) return null;

  const bgColor =
    type === 'success' ? COLORS.success : type === 'error' ? COLORS.error : COLORS.accent;
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.toast,
          {
            top: insets.top + 8,
            backgroundColor: COLORS.surface,
            borderColor: COLORS.glass12,
            transform: [{ translateY }],
            opacity,
          },
        ]}
        pointerEvents="auto"
      >
        <Pressable style={styles.toastContent} onPress={hideToast} hitSlop={4}>
          <View style={[styles.iconCircle, { backgroundColor: bgColor }]}>
            <Text style={styles.iconText}>{icon}</Text>
          </View>
          <Text style={styles.message} numberOfLines={4}>
            {message}
          </Text>
          <Text style={styles.dismissHint}>✕</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  toast: {
    position: 'absolute',
    left: 20,
    right: 20,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  toastContent: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  message: { color: COLORS.white, fontSize: 14, fontWeight: '500', flex: 1 },
  dismissHint: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '700' },
});

export function useToast() {
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    visible: boolean;
  }>({ message: '', type: 'success', visible: false });

  const show = useCallback((msg: string, kind: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message: msg, type: kind, visible: true });
  }, []);

  const hide = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  return { toast, show, hide };
}
