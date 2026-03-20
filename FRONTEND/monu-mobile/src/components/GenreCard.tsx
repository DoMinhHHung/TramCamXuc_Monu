/**
 * ─────────────────────────────────────────────────────────────────────────────
 * GenreCard – Displays genre with trending rank and top songs count
 * Shows genre name, trending position, and indicators of popular songs in genre
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
import type { GenreStats } from '../hooks/useHomeStats';

interface GenreCardProps {
  genre: GenreStats;
  onPress?: () => void;
  style?: ViewStyle;
}

export const GenreCard: React.FC<GenreCardProps> = ({
  genre,
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
      paddingRight: themeUtils.spacing.lg,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    leftContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: themeUtils.spacing.md,
    },
    iconContainer: {
      width: 56,
      height: 56,
      borderRadius: themeUtils.borderRadius.md,
      backgroundColor: colors.surfaceMid,
      justifyContent: 'center',
      alignItems: 'center',
      borderColor: colors.accentBorder25,
      borderWidth: 0.5,
    },
    genreInfo: {
      flex: 1,
    },
    genreName: {
      fontSize: themeUtils.fontSize.lg,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    genreSubtitle: {
      fontSize: themeUtils.fontSize.sm,
      color: colors.textSecondary,
    },
    rightContent: {
      alignItems: 'center',
      gap: themeUtils.spacing.sm,
    },
    trendingBadge: {
      paddingHorizontal: themeUtils.spacing.sm,
      paddingVertical: 4,
      borderRadius: themeUtils.borderRadius.full,
      backgroundColor: colors.accentFill20,
      borderColor: colors.accentBorder25,
      borderWidth: 0.5,
    },
    trendingText: {
      fontSize: themeUtils.fontSize.xs,
      fontWeight: '600',
      color: colors.accent,
    },
    songCount: {
      fontSize: themeUtils.fontSize.md,
      fontWeight: '600',
      color: colors.accent,
    },
    songCountLabel: {
      fontSize: themeUtils.fontSize.xs,
      color: colors.muted,
    },
  });

  const getTrendingIcon = (rank?: number) => {
    if (!rank) return 'star-outline';
    if (rank === 1) return 'fire';
    if (rank <= 3) return 'trending-up';
    return 'star-outline';
  };

  const genreIcons: Record<string, string> = {
    'Lo-fi Hip Hop': 'music-note-quarter',
    'Indie Pop': 'music-box-outline',
    'Synthwave': 'synthesizer',
    'Ambient': 'meditation',
    'Rock': 'guitar-electric',
    'Pop': 'music-note',
    'Hip Hop': 'microphone-outline',
    'R&B': 'music-note-heart-outline',
    'EDM': 'pulse',
    'Jazz': 'saxophone',
  };

  const getGenreIcon = (name: string) => {
    return genreIcons[name] || 'music-note';
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
          <View style={styles.leftContent}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons
                name={getGenreIcon(genre.name)}
                size={28}
                color={colors.accent}
              />
            </View>
            <View style={styles.genreInfo}>
              <Text style={styles.genreName} numberOfLines={1}>{genre.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {genre.trendingRank && (
                  <>
                    <MaterialCommunityIcons
                      name={getTrendingIcon(genre.trendingRank)}
                      size={14}
                      color={genre.trendingRank === 1 ? '#FF6B6B' : colors.accent}
                    />
                    <Text style={styles.genreSubtitle}>
                      #{genre.trendingRank} Trending
                    </Text>
                  </>
                )}
              </View>
            </View>
          </View>

          <View style={styles.rightContent}>
            <View style={styles.trendingBadge}>
              <Text style={styles.trendingText}>
                {genre.topSongsCount} songs
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color={colors.muted}
            />
          </View>
        </LinearGradient>
      </View>
    </Pressable>
  );
};

export default GenreCard;
