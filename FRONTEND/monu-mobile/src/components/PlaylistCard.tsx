/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PlaylistCard – Displays playlist with stats
 * Shows playlist name, song count, play count, and average play time
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
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../context/LocalizationContext';
import themeUtils from '../config/themeUtils';
import type { PlaylistStats } from '../hooks/useHomeStats';

interface PlaylistCardProps {
  playlist: PlaylistStats;
  onPress?: () => void;
  style?: ViewStyle;
}

export const PlaylistCard: React.FC<PlaylistCardProps> = ({
  playlist,
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
      justifyContent: 'space-between',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: themeUtils.spacing.md,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: themeUtils.borderRadius.md,
      backgroundColor: `rgba(255, 255, 255, 0.1)`,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: themeUtils.spacing.md,
    },
    headerText: {
      flex: 1,
    },
    title: {
      fontSize: themeUtils.fontSize.lg,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    description: {
      fontSize: themeUtils.fontSize.xs,
      color: colors.textSecondary,
    },
    statsContainer: {
      flexDirection: 'row',
      gap: themeUtils.spacing.md,
    },
    statItem: {
      alignItems: 'center',
    },
    statValue: {
      fontSize: themeUtils.fontSize.md,
      fontWeight: '600',
      color: colors.accent,
    },
    statLabel: {
      fontSize: themeUtils.fontSize.xs,
      color: colors.muted,
      marginTop: 2,
    },
  });

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
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="playlist-play" size={28} color={colors.accent} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title} numberOfLines={2}>{playlist.name}</Text>
              {playlist.description && (
                <Text style={styles.description} numberOfLines={1}>
                  {playlist.description}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{playlist.songCount}</Text>
              <Text style={styles.statLabel}>{t('playlistDetails.songs')}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{playlist.playCount}</Text>
              <Text style={styles.statLabel}>Plays</Text>
            </View>
            {playlist.avgPlayTime && (
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{playlist.avgPlayTime}</Text>
                <Text style={styles.statLabel}>min avg</Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </View>
    </Pressable>
  );
};

export default PlaylistCard;
