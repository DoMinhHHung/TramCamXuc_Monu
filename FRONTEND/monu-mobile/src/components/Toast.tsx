import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
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
  onHideRef.current = onHide;

  useEffect(() => {
    if (!visible) return undefined;

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

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -100, duration: 220, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) onHideRef.current();
      });
    }, 2500);

    return () => clearTimeout(timer);
  }, [visible, message, type, translateY, opacity]);

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
        <View style={[styles.iconCircle, { backgroundColor: bgColor }]}>
          <Text style={styles.iconText}>{icon}</Text>
        </View>
        <Text style={styles.message} numberOfLines={4}>
          {message}
        </Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  message: { color: COLORS.white, fontSize: 14, fontWeight: '500', flex: 1 },
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
