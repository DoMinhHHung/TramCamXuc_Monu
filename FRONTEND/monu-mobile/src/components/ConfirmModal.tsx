import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeColors } from '../config/colors';
import { AppIcon } from '../config/appIcons';
import { haptic } from '../utils/haptics';
import { useTranslation } from '../context/LocalizationContext';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal = ({
  visible,
  title,
  message,
  confirmText,
  cancelText,
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (!visible) {
      overlayOpacity.setValue(0);
      cardScale.setValue(0.92);
      return;
    }

    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(cardScale, {
        toValue: 1,
        tension: 80,
        friction: 12,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, overlayOpacity, cardScale]);

  const cancelLabel = cancelText ?? t('common.cancel', 'Cancel');
  const iconName = destructive ? 'delete' : 'check';
  const iconColor = destructive ? colors.error : colors.accent;
  const primaryGradient = destructive
    ? ['rgba(239,68,68,0.95)', 'rgba(239,68,68,0.70)', 'rgba(239,68,68,0.95)']
    : [colors.accent, (colors as any).accentAlt ?? colors.accent, colors.accent];

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />

        <Animated.View style={[styles.card, { transform: [{ scale: cardScale }] }]}>
          <View style={styles.iconWrap}>
            <AppIcon name={iconName} size={22} color={iconColor} />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.actions}>
            <Pressable
              onPress={() => {
                haptic.medium();
                onConfirm();
              }}
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
            >
              <LinearGradient
                colors={primaryGradient as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryBtnGrad}
              >
                <Text style={styles.primaryText}>{confirmText}</Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
          </View>

          <View style={{ height: insets.bottom + 6 }} />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const getStyles = (C: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.68)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'rgba(20,20,28,0.92)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.glass08,
    borderWidth: 1,
    borderColor: C.glass12,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 10,
  },
  title: { color: C.text, fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  message: { color: C.muted, fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: 16 },
  actions: { gap: 10 },
  primaryBtn: { borderRadius: 16, overflow: 'hidden' },
  primaryBtnGrad: { minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  primaryText: { color: C.white, fontSize: 15, fontWeight: '800' },
  cancelBtn: {
    minHeight: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  cancelText: { color: C.glass80, fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.88, transform: [{ scale: 0.97 }] },
});
