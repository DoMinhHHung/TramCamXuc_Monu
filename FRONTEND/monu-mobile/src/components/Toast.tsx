import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeColors } from '../config/colors';
import { SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '../config/design';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  visible: boolean;
  onHide: () => void;
}

export const Toast = ({ message, type = 'success', visible, onHide }: ToastProps) => {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
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

  const indicatorColor =
    type === 'success' ? colors.success : type === 'error' ? colors.error : colors.accent;
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.toast,
          {
            top: insets.top + SPACING.sm,
            transform: [{ translateY }],
            opacity,
          },
        ]}
        pointerEvents="auto"
      >
        <Pressable style={styles.toastContent} onPress={hideToast} hitSlop={4}>
          <View style={[styles.iconCircle, { backgroundColor: indicatorColor }]}>
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

const getStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  toast: {
    position: 'absolute',
    left: SPACING.xl,
    right: SPACING.xl,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: SPACING.md,
    backgroundColor: colors.surface,
    borderColor: colors.glass12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  toastContent: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: SPACING.sm },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconText: { color: colors.white, fontWeight: FONT_WEIGHT.bold, fontSize: FONT_SIZE.xs },
  message: { color: colors.text, fontSize: FONT_SIZE.body_sm, fontWeight: FONT_WEIGHT.medium, flex: 1 },
  dismissHint: { color: colors.muted, fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold },
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
