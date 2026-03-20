/**
 * ─────────────────────────────────────────────────────────────────────────────
 * AlbumCard – Displays album with stats and luxury styling
 * Shows album cover, title, artist, listener count, and user play count
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../context/LocalizationContext';
import themeUtils from '../config/themeUtils';
import type { AlbumStats } from '../hooks/useHomeStats';

interface AlbumCardProps {
  album: AlbumStats;
  onPress?: () => void;
  style?: ViewStyle;
}

export const AlbumCard: React.FC<AlbumCardProps> = ({
  album,
  onPress,
  style,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const styles = StyleSheet.create({
    container: {
      marginBottom: 12,
      ...themeUtils.shadowPresets.md,
    },
    card: {
      borderRadius: themeUtils.borderRadius.lg,
      overflow: 'hidden',
      backgroundColor: colors.surface,
      borderColor: colors.accentBorder25,
      borderWidth: 0.5,
    },
    gradient: {
      padding: themeUtils.spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
    },
    albumArtContainer: {
      width: 80,
      height: 80,
      borderRadius: themeUtils.borderRadius.md,
      backgroundColor: colors.surfaceMid,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: themeUtils.spacing.md,
      borderColor: colors.accentBorder25,
      borderWidth: 0.5,
      ...themeUtils.shadowPresets.sm,
    },
    albumArtIcon: {
      opacity: 0.6,
    },
    contentContainer: {
      flex: 1,
    },
    title: {
      fontSize: themeUtils.fontSize.md,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 2,
    },
    artist: {
      fontSize: themeUtils.fontSize.sm,
      color: colors.textSecondary,
      marginBottom: themeUtils.spacing.sm,
    },
    statsRow: {
      flexDirection: 'row',
      gap: themeUtils.spacing.md,
    },
    stat: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    statText: {
      fontSize: themeUtils.fontSize.xs,
      color: colors.muted,
    },
    statValue: {
      fontSize: themeUtils.fontSize.xs,
      fontWeight: '600',
      color: colors.accent,
    },
  });

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <Pressable
      onPress={onPress}
      style={[styles.container, style]}
      android_ripple={{ color: colors.accentFill20 }}
    >
      <View style={styles.card}>
        <LinearGradient
          colors={[colors.surface, colors.surfaceLow]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.albumArtContainer}>
            <MaterialCommunityIcons
              name="album"
              size={40}
              color={colors.accent}
              style={styles.albumArtIcon}
            />
          </View>

          <View style={styles.contentContainer}>
            <Text style={styles.title} numberOfLines={1}>{album.title}</Text>
            <Text style={styles.artist} numberOfLines={1}>{album.artist}</Text>

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <MaterialCommunityIcons
                  name="ear-hearing"
                  size={12}
                  color={colors.muted}
                />
                <Text style={styles.statValue}>{formatNumber(album.playCount)}</Text>
                <Text style={styles.statText}>listeners</Text>
              </View>
              {album.userPlayCount && (
                <View style={styles.stat}>
                  <MaterialCommunityIcons
                    name="play"
                    size={12}
                    color={colors.accent}
                  />
                  <Text style={styles.statValue}>{album.userPlayCount}</Text>
                  <Text style={styles.statText}>plays</Text>
                </View>
              )}
            </View>
          </View>
        </LinearGradient>
      </View>
    </Pressable>
  );
};

export default AlbumCard;
