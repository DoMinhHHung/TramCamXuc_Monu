/**
 * ─────────────────────────────────────────────────────────────────────────────
 * DraggablePlaylistList – Interactive drag-and-drop playlist reordering
 * Provides visual feedback during dragging with animations and error recovery
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../context/LocalizationContext';
import themeUtils from '../config/themeUtils';

export interface PlaylistItem {
  id: string;
  name: string;
  songCount: number;
  coverUrl?: string;
}

interface DraggablePlaylistListProps {
  playlists: PlaylistItem[];
  onReorder?: (reorderedIds: string[]) => Promise<void>;
  onPlaylistPress?: (playlistId: string) => void;
}

export const DraggablePlaylistList: React.FC<DraggablePlaylistListProps> = ({
  playlists,
  onReorder,
  onPlaylistPress,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const [items, setItems] = useState(playlists);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [previousOrder, setPreviousOrder] = useState(playlists);
  const [undoAvailable, setUndoAvailable] = useState(false);
  const animatedScaleRef = useRef(new Animated.Value(1)).current;

  const playMoveAnimation = useCallback(() => {
    Animated.sequence([
      Animated.timing(animatedScaleRef, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(animatedScaleRef, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  }, [animatedScaleRef]);

  const handleMoveItem = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    playMoveAnimation();
    const newItems = [...items];
    const [movedItem] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, movedItem);

    setPreviousOrder(items);
    setItems(newItems);
    setUndoAvailable(true);
  }, [items, playMoveAnimation]);

  const handleSaveOrder = useCallback(async () => {
    if (!onReorder) return;

    try {
      setSaving(true);
      const newOrder = items.map(item => item.id);
      await onReorder(newOrder);
      setPreviousOrder(items);
      setUndoAvailable(false);
      Alert.alert('Success', t('libraryPlaylist.reorderingSuccess'));
    } catch (error) {
      Alert.alert('Error', t('libraryPlaylist.reorderingFailed'));
      // Revert to previous order on error
      setItems(previousOrder);
      console.error('[DraggablePlaylistList] Error saving order:', error);
    } finally {
      setSaving(false);
    }
  }, [items, onReorder, previousOrder, t]);

  const handleUndo = useCallback(() => {
    setItems(previousOrder);
    setUndoAvailable(false);
  }, [previousOrder]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    listContainer: {
      paddingHorizontal: themeUtils.spacing.md,
      paddingVertical: themeUtils.spacing.md,
    },
    playlistItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: themeUtils.spacing.md,
      paddingHorizontal: themeUtils.spacing.md,
      marginBottom: themeUtils.spacing.sm,
      borderRadius: themeUtils.borderRadius.md,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 0.5,
      ...themeUtils.shadowPresets.sm,
    },
    playlistItemDragging: {
      backgroundColor: colors.surfaceMid,
      borderColor: colors.accent,
      ...themeUtils.shadowPresets.lg,
      opacity: 0.95,
    },
    dragHandle: {
      width: 40,
      height: 40,
      borderRadius: themeUtils.borderRadius.md,
      backgroundColor: colors.surfaceMid,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: themeUtils.spacing.md,
    },
    playlistContent: {
      flex: 1,
    },
    playlistName: {
      fontSize: themeUtils.fontSize.md,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 2,
    },
    playlistSongCount: {
      fontSize: themeUtils.fontSize.xs,
      color: colors.muted,
    },
    moveButtons: {
      flexDirection: 'row',
      gap: themeUtils.spacing.sm,
      marginLeft: themeUtils.spacing.md,
    },
    moveButton: {
      width: 32,
      height: 32,
      borderRadius: themeUtils.borderRadius.sm,
      backgroundColor: colors.surfaceMid,
      justifyContent: 'center',
      alignItems: 'center',
      borderColor: colors.border,
      borderWidth: 0.5,
    },
    moveButtonDisabled: {
      opacity: 0.3,
    },
    actionBar: {
      flexDirection: 'row',
      gap: themeUtils.spacing.md,
      paddingHorizontal: themeUtils.spacing.md,
      paddingVertical: themeUtils.spacing.md,
      borderTopColor: colors.border,
      borderTopWidth: 0.5,
    },
    actionButton: {
      flex: 1,
      paddingVertical: themeUtils.spacing.md,
      paddingHorizontal: themeUtils.spacing.md,
      borderRadius: themeUtils.borderRadius.md,
      borderColor: colors.accent,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      gap: themeUtils.spacing.sm,
    },
    actionButtonPrimary: {
      backgroundColor: colors.accentFill20,
    },
    actionButtonText: {
      color: colors.accent,
      fontWeight: '600',
      fontSize: themeUtils.fontSize.sm,
    },
    hintText: {
      textAlign: 'center',
      color: colors.textSecondary,
      fontSize: themeUtils.fontSize.sm,
      marginVertical: themeUtils.spacing.lg,
    },
  });

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.hintText}>{t('libraryPlaylist.dragToReorder')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.listContainer}>
        {items.map((item, index) => (
          <View
            key={item.id}
            style={[
              styles.playlistItem,
              draggedIndex === index && styles.playlistItemDragging,
            ]}
          >
            <View style={styles.dragHandle}>
              <MaterialCommunityIcons
                name="drag"
                size={20}
                color={colors.accent}
              />
            </View>

            <Pressable
              style={styles.playlistContent}
              onPress={() => onPlaylistPress?.(item.id)}
            >
              <Text style={styles.playlistName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.playlistSongCount}>
                {item.songCount} {t('playlistDetails.songs')}
              </Text>
            </Pressable>

            <View style={styles.moveButtons}>
              <Pressable
                style={[
                  styles.moveButton,
                  index === 0 && styles.moveButtonDisabled,
                ]}
                onPress={() => {
                  if (index > 0) {
                    setDraggedIndex(index);
                    handleMoveItem(index, index - 1);
                    setTimeout(() => setDraggedIndex(null), 200);
                  }
                }}
                disabled={index === 0}
              >
                <MaterialCommunityIcons
                  name="chevron-up"
                  size={18}
                  color={index === 0 ? colors.muted : colors.accent}
                />
              </Pressable>

              <Pressable
                style={[
                  styles.moveButton,
                  index === items.length - 1 && styles.moveButtonDisabled,
                ]}
                onPress={() => {
                  if (index < items.length - 1) {
                    setDraggedIndex(index);
                    handleMoveItem(index, index + 1);
                    setTimeout(() => setDraggedIndex(null), 200);
                  }
                }}
                disabled={index === items.length - 1}
              >
                <MaterialCommunityIcons
                  name="chevron-down"
                  size={18}
                  color={index === items.length - 1 ? colors.muted : colors.accent}
                />
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>

      {undoAvailable && (
        <View style={styles.actionBar}>
          <Pressable style={styles.actionButton} onPress={handleUndo} disabled={saving}>
            <MaterialCommunityIcons
              name="undo"
              size={18}
              color={colors.accent}
            />
            <Text style={styles.actionButtonText}>
              {t('libraryPlaylist.undoReorder')}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.actionButton, styles.actionButtonPrimary]}
            onPress={handleSaveOrder}
            disabled={saving}
          >
            {saving ? (
              <>
                <ActivityIndicator size="small" color={colors.accent} />
                <Text style={styles.actionButtonText}>
                  {t('libraryPlaylist.savingOrder')}
                </Text>
              </>
            ) : (
              <>
                <MaterialCommunityIcons
                  name="check"
                  size={18}
                  color={colors.accent}
                />
                <Text style={styles.actionButtonText}>Save Order</Text>
              </>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
};

export default DraggablePlaylistList;
