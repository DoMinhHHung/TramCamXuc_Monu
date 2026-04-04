// src/components/SongActionSheet.tsx
//
// Bottom sheet đẹp với animation slide + backdrop fade.
// API mới dùng "actions" array thay vì flat props.

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../config/colors';
import { MUSIC_EMOJIS } from '../config/emojis';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SheetAction {
  /** Emoji hoặc ký tự icon */
  icon: string | React.ReactNode;
  label: string;
  sublabel?: string;
  onPress: () => void | Promise<void>;
  /** Tô màu đỏ — dùng cho "Báo cáo", "Xoá" */
  destructive?: boolean;
  /** Bật icon khoá và mờ — dùng cho "cần Premium" */
  disabled?: boolean;
  /** Nếu true, vẽ đường kẻ trên trước action này */
  separator?: boolean;
}

interface SongActionSheetProps {
  visible: boolean;
  /** Tiêu đề (thường là tên bài hát) */
  title?: string;
  /** Phụ đề (thường là tên nghệ sĩ) */
  subtitle?: string;
  /** URL thumbnail để hiện ảnh thay vì emoji */
  thumbnailUrl?: string;
  /** Emoji fallback khi không có thumbnailUrl */
  thumbnailEmoji?: string;
  onClose: () => void;
  actions: SheetAction[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export const SongActionSheet = ({
  visible,
  title,
  subtitle,
  thumbnailUrl,
  thumbnailEmoji = MUSIC_EMOJIS.song,
  onClose,
  actions,
}: SongActionSheetProps) => {
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const safeActions = Array.isArray(actions) ? actions : [];
  const insets    = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(500)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const isClosing = useRef(false);

  // ── Animations ───────────────────────────────────────────────────────────

  const animateIn = useCallback(() => {
    isClosing.current = false;
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 70,
        friction: 12,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, fadeAnim]);

  const animateOut = useCallback(
      (then?: () => void) => {
        if (isClosing.current) return;
        isClosing.current = true;
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: 500,
            duration: 240,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => then?.());
      },
      [slideAnim, fadeAnim],
  );

  useEffect(() => {
    if (visible) {
      animateIn();
    } else {
      // Reset ngay khi visible = false (không cần animate out vì caller đã close)
      slideAnim.setValue(500);
      fadeAnim.setValue(0);
      isClosing.current = false;
    }
  }, [visible]);

  const handleClose = useCallback(() => {
    animateOut(onClose);
  }, [animateOut, onClose]);

  const handleActionPress = useCallback(
      async (action: SheetAction) => {
        if (action.disabled) return;
        // Close trước, chạy action sau
        animateOut(() => {
          onClose();
          void Promise.resolve(action.onPress());
        });
      },
      [animateOut, onClose],
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
      <Modal
          visible={visible}
          transparent
          animationType="none"
          statusBarTranslucent
          onRequestClose={handleClose}
      >
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        {/* Sheet */}
        <Animated.View
            style={[
              styles.sheet,
              { paddingBottom: insets.bottom + 10 },
              { transform: [{ translateY: slideAnim }] },
            ]}
        >
          {/* Handle */}
          <View style={styles.handle} />

          {/* Song info header */}
          {!!title && (
              <>
                <View style={styles.header}>
                  {/* Thumbnail */}
                  <View style={styles.thumbWrap}>
                    {thumbnailUrl ? (
                        <Image
                            source={{ uri: thumbnailUrl }}
                            style={styles.thumbImg}
                        />
                    ) : (
                        <View style={styles.thumbPlaceholder}>
                          <Text style={styles.thumbEmoji}>{thumbnailEmoji}</Text>
                        </View>
                    )}
                  </View>

                  {/* Text */}
                  <View style={styles.headerText}>
                    <Text style={styles.headerTitle} numberOfLines={2}>
                      {title}
                    </Text>
                    {!!subtitle && (
                        <Text style={styles.headerSub} numberOfLines={1}>
                          {subtitle}
                        </Text>
                    )}
                  </View>
                </View>

                <View style={styles.headerDivider} />
              </>
          )}

          {/* Actions */}
          <ScrollView
              scrollEnabled={false}
              contentContainerStyle={styles.actionsContainer}
              showsVerticalScrollIndicator={false}
          >
            {safeActions.map((action, index) => (
                <React.Fragment key={index}>
                  {action.separator && <View style={styles.separator} />}

                  <Pressable
                      style={({ pressed }) => [
                        styles.actionRow,
                        pressed && !action.disabled && styles.actionRowPressed,
                        action.disabled && styles.actionRowDisabled,
                      ]}
                      onPress={() => void handleActionPress(action)}
                      disabled={action.disabled}
                  >
                    {/* Icon bubble */}
                    <View
                        style={[
                          styles.iconWrap,
                          action.destructive && styles.iconWrapDestructive,
                          action.disabled && styles.iconWrapDisabled,
                        ]}
                    >
                      {typeof action.icon === "string" ? (
                          <Text style={styles.iconText}>{action.icon}</Text>
                      ) : (
                          action.icon
                      )}
                    </View>

                    {/* Labels */}
                    <View style={styles.labelWrap}>
                      <Text
                          style={[
                            styles.actionLabel,
                            action.destructive && styles.actionLabelDestructive,
                            action.disabled && styles.actionLabelDisabled,
                          ]}
                          numberOfLines={1}
                      >
                        {action.label}
                      </Text>
                      {!!action.sublabel && (
                          <Text style={styles.actionSublabel} numberOfLines={1}>
                            {action.sublabel}
                          </Text>
                      )}
                    </View>

                    {/* Chevron / lock */}
                    <Text
                        style={[
                          styles.actionChevron,
                          action.disabled && { opacity: 0.3 },
                        ]}
                    >
                      {action.disabled ? '🔒' : '›'}
                    </Text>
                  </Pressable>
                </React.Fragment>
            ))}
          </ScrollView>

          {/* Cancel button */}
          <View style={styles.cancelWrapper}>
            <Pressable
                style={({ pressed }) => [
                  styles.cancelBtn,
                  pressed && styles.cancelBtnPressed,
                ]}
                onPress={handleClose}
            >
              <Text style={styles.cancelText}>Đóng</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Modal>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const getStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    borderWidth: 1, borderBottomWidth: 0, borderColor: colors.divider,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 20,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.divider,
    alignSelf: 'center', marginTop: 12, marginBottom: 6,
  },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, gap: 14 },
  thumbWrap: { width: 54, height: 54, borderRadius: 12, overflow: 'hidden', flexShrink: 0 },
  thumbImg: { width: 54, height: 54, borderRadius: 12 },
  thumbPlaceholder: {
    width: 54, height: 54, borderRadius: 12,
    backgroundColor: colors.accentFill20,
    borderWidth: 1, borderColor: colors.accentBorder25,
    alignItems: 'center', justifyContent: 'center',
  },
  thumbEmoji: { fontSize: 26 },
  headerText: { flex: 1 },
  headerTitle: { color: colors.text, fontSize: 16, fontWeight: '700', lineHeight: 21, marginBottom: 3 },
  headerSub: { color: colors.muted, fontSize: 13 },
  headerDivider: { height: 1, backgroundColor: colors.divider },
  actionsContainer: { paddingHorizontal: 10, paddingTop: 6 },
  separator: { height: 1, backgroundColor: colors.divider, marginHorizontal: 8, marginVertical: 4 },
  actionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 12, borderRadius: 14, gap: 14 },
  actionRowPressed: { backgroundColor: colors.surfaceMid },
  actionRowDisabled: { opacity: 0.45 },
  iconWrap: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.surfaceMid, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  iconWrapDestructive: { backgroundColor: `${colors.error}20` },
  iconWrapDisabled: { backgroundColor: colors.surfaceLow },
  iconText: { fontSize: 20 },
  labelWrap: { flex: 1 },
  actionLabel: { color: colors.text, fontSize: 15, fontWeight: '500' },
  actionLabelDestructive: { color: colors.error },
  actionLabelDisabled: { color: colors.muted },
  actionSublabel: { color: colors.muted, fontSize: 12, marginTop: 2 },
  actionChevron: { color: colors.muted, fontSize: 22, fontWeight: '300' },
  cancelWrapper: { paddingHorizontal: 10, paddingTop: 6 },
  cancelBtn: { borderRadius: 16, backgroundColor: colors.surfaceLow, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.divider },
  cancelBtnPressed: { backgroundColor: colors.surfaceMid },
  cancelText: { color: colors.text, fontWeight: '700', fontSize: 15 },
});
