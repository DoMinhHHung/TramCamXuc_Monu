/**
 * Bottom sheet “Thêm vào playlist” — cùng phong cách với SongActionSheet (backdrop + slide + handle + header).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../config/colors';
import { AppIcon } from '../config/appIcons';
import { useTranslation } from '../context/LocalizationContext';

export interface PlaylistPickItem {
  id: string;
  name: string;
  totalSongs?: number;
}

export interface AddToPlaylistSheetProps {
  visible: boolean;
  onClose: () => void;
  songTitle: string;
  songSubtitle?: string;
  thumbnailUrl?: string;
  playlists: PlaylistPickItem[];
  onSelectPlaylist: (playlistId: string) => void | Promise<void>;
  onCreateAndAdd: (name: string) => void | Promise<void>;
  /** Không cho thêm (vd. SoundCloud) */
  addDisabled?: boolean;
}

export const AddToPlaylistSheet = ({
  visible,
  onClose,
  songTitle,
  songSubtitle,
  thumbnailUrl,
  playlists,
  onSelectPlaylist,
  onCreateAndAdd,
  addDisabled = false,
}: AddToPlaylistSheetProps) => {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(520)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const isClosing = useRef(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [pickingId, setPickingId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setNewName('');
      setCreating(false);
      setPickingId(null);
      isClosing.current = false;
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 68,
          friction: 12,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(520);
      fadeAnim.setValue(0);
      isClosing.current = false;
    }
  }, [visible, fadeAnim, slideAnim]);

  const animateOut = useCallback(
    (then?: () => void) => {
      if (isClosing.current) return;
      isClosing.current = true;
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 520,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(() => then?.());
    },
    [slideAnim, fadeAnim],
  );

  const handleClose = useCallback(() => {
    if (creating || pickingId) return;
    animateOut(onClose);
  }, [animateOut, onClose, creating, pickingId]);

  const handlePick = useCallback(
    async (id: string) => {
      if (addDisabled || pickingId || creating) return;
      setPickingId(id);
      try {
        await Promise.resolve(onSelectPlaylist(id));
      } finally {
        setPickingId(null);
      }
    },
    [addDisabled, pickingId, creating, onSelectPlaylist],
  );

  const handleCreate = useCallback(async () => {
    const name = newName.trim();
    if (!name || creating || addDisabled || pickingId) return;
    setCreating(true);
    try {
      await Promise.resolve(onCreateAndAdd(name));
      setNewName('');
    } finally {
      setCreating(false);
    }
  }, [newName, creating, addDisabled, pickingId, onCreateAndAdd]);

  const hint = t('screens.library.addToPlaylistSheetHint', 'Pick a playlist or create one below.');
  const emptyList = t(
    'screens.library.addToPlaylistEmptyList',
    'No playlists yet. Enter a name to create and add this song.',
  );
  const createCta = t('screens.library.addToPlaylistCreateAdd', 'Create & add');
  const songsSuffix = t('screens.library.songsSuffix', 'songs');
  const title = t('actions.addToPlaylist', 'Add to playlist');
  const placeholder = t('screens.library.createPlaylistPlaceholder', 'Create new playlist...');

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={handleClose}>
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardRoot}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + 12 },
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.thumbWrap}>
              {thumbnailUrl ? (
                <Image source={{ uri: thumbnailUrl }} style={styles.thumbImg} />
              ) : (
                <View style={styles.thumbPlaceholder}>
                  <AppIcon name="musicNote" size={22} color={colors.textSecondary} />
                </View>
              )}
            </View>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle} numberOfLines={2}>
                {title}
              </Text>
              <Text style={styles.headerSong} numberOfLines={1}>
                {songTitle}
              </Text>
              {!!songSubtitle && (
                <Text style={styles.headerSub} numberOfLines={1}>
                  {songSubtitle}
                </Text>
              )}
            </View>
          </View>

          {addDisabled && (
            <View style={styles.warnBanner}>
              <AppIcon name="lock" size={16} color={colors.warningMid ?? colors.accent} />
              <Text style={styles.warnText}>
                {t('screens.library.soundcloudPlaylistNotSupported', 'This track cannot be added to in-app playlists.')}
              </Text>
            </View>
          )}

          <Text style={styles.hint} numberOfLines={2}>
            {hint}
          </Text>

          <ScrollView
            style={styles.listScroll}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {playlists.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>{emptyList}</Text>
              </View>
            ) : (
              playlists.map((p) => {
                const busy = pickingId === p.id;
                return (
                  <Pressable
                    key={p.id}
                    style={({ pressed }) => [
                      styles.row,
                      pressed && !addDisabled && styles.rowPressed,
                      addDisabled && styles.rowDisabled,
                    ]}
                    disabled={addDisabled || !!pickingId || creating}
                    onPress={() => { void handlePick(p.id); }}
                  >
                    <View style={styles.rowIconWrap}>
                      <AppIcon name="addToPlaylist" size={20} color={colors.accent} />
                    </View>
                    <View style={styles.rowLabel}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {p.name}
                      </Text>
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {p.totalSongs ?? 0} {songsSuffix}
                      </Text>
                    </View>
                    {busy ? (
                      <ActivityIndicator size="small" color={colors.accent} />
                    ) : (
                      <AppIcon name="chevronRight" size={18} color={colors.muted} />
                    )}
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          <View style={styles.createBlock}>
            <Text style={styles.createLabel}>{createCta}</Text>
            <View style={styles.createRow}>
              <TextInput
                style={styles.createInput}
                value={newName}
                onChangeText={setNewName}
                placeholder={placeholder}
                placeholderTextColor={colors.muted}
                editable={!addDisabled && !creating}
                returnKeyType="done"
                onSubmitEditing={() => { void handleCreate(); }}
              />
              <Pressable
                style={[
                  styles.createBtn,
                  (!newName.trim() || creating || addDisabled) && styles.createBtnDisabled,
                ]}
                disabled={!newName.trim() || creating || addDisabled}
                onPress={() => { void handleCreate(); }}
              >
                {creating ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.createBtnText}>+</Text>
                )}
              </Pressable>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
            onPress={handleClose}
            disabled={!!creating || !!pickingId}
          >
            <Text style={styles.closeBtnText}>{t('common.close', 'Close')}</Text>
          </Pressable>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const getStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    keyboardRoot: {
      flex: 1,
      justifyContent: 'flex-end',
      pointerEvents: 'box-none',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.62)',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: colors.divider,
      paddingHorizontal: 14,
      paddingTop: 4,
      maxHeight: '78%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 20,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.divider,
      alignSelf: 'center',
      marginTop: 8,
      marginBottom: 10,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 4,
      paddingBottom: 12,
      gap: 14,
    },
    thumbWrap: {
      width: 56,
      height: 56,
      borderRadius: 12,
      overflow: 'hidden',
      flexShrink: 0,
    },
    thumbImg: { width: 56, height: 56, borderRadius: 12 },
    thumbPlaceholder: {
      width: 56,
      height: 56,
      borderRadius: 12,
      backgroundColor: colors.accentFill20,
      borderWidth: 1,
      borderColor: colors.accentBorder25,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerText: { flex: 1, minWidth: 0 },
    headerTitle: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 4,
    },
    headerSong: { color: colors.text, fontSize: 16, fontWeight: '700', lineHeight: 21 },
    headerSub: { color: colors.muted, fontSize: 13, marginTop: 2 },
    warnBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.accentFill20,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.accentBorder25,
    },
    warnText: { flex: 1, color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
    hint: {
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 18,
      paddingHorizontal: 4,
      marginBottom: 8,
    },
    listScroll: { maxHeight: 240 },
    listContent: { paddingBottom: 6 },
    emptyBox: {
      paddingVertical: 20,
      paddingHorizontal: 8,
      alignItems: 'center',
    },
    emptyText: {
      color: colors.muted,
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 10,
      borderRadius: 14,
      gap: 12,
      marginBottom: 4,
    },
    rowPressed: { backgroundColor: colors.surfaceMid },
    rowDisabled: { opacity: 0.45 },
    rowIconWrap: {
      width: 42,
      height: 42,
      borderRadius: 13,
      backgroundColor: colors.surfaceMid,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowLabel: { flex: 1, minWidth: 0 },
    rowTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
    rowMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
    createBlock: {
      marginTop: 8,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
    },
    createLabel: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
      marginBottom: 8,
      paddingHorizontal: 4,
    },
    createRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    createInput: {
      flex: 1,
      backgroundColor: colors.surfaceLow,
      borderWidth: 1,
      borderColor: colors.divider,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: Platform.OS === 'ios' ? 12 : 10,
      color: colors.text,
      fontSize: 15,
    },
    createBtn: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: colors.accentDim,
      alignItems: 'center',
      justifyContent: 'center',
    },
    createBtnDisabled: { opacity: 0.35 },
    createBtnText: { color: colors.white, fontSize: 24, fontWeight: '300', marginTop: -2 },
    closeBtn: {
      marginTop: 10,
      borderRadius: 16,
      backgroundColor: colors.surfaceLow,
      paddingVertical: 15,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.divider,
    },
    closeBtnPressed: { backgroundColor: colors.surfaceMid },
    closeBtnText: { color: colors.text, fontWeight: '700', fontSize: 15 },
  });
