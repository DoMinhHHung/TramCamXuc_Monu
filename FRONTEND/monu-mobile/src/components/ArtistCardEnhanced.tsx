/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ArtistCardEnhanced – Displays artist with follower and play stats
 * Shows artist avatar, follower count, play count, and follow button
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';
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
import type { ArtistStats } from '../hooks/useHomeStats';

interface ArtistCardEnhancedProps {
  artist: ArtistStats;
  onPress?: () => void;
  onFollowPress?: (artistId: string, isFollowing: boolean) => void;
  style?: ViewStyle;
}

export const ArtistCardEnhanced: React.FC<ArtistCardEnhancedProps> = ({
  artist,
  onPress,
  onFollowPress,
  style,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [isFollowing, setIsFollowing] = useState(artist.isFollowing ?? false);

  const handleFollowPress = () => {
    setIsFollowing(!isFollowing);
    onFollowPress?.(artist.id, !isFollowing);
  };

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
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: themeUtils.spacing.md,
    },
    avatarContainer: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.surfaceMid,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: themeUtils.spacing.md,
      borderColor: colors.accent,
      borderWidth: 2,
    },
    headerContent: {
      flex: 1,
    },
    artistName: {
      fontSize: themeUtils.fontSize.lg,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 2,
    },
    followerText: {
      fontSize: themeUtils.fontSize.sm,
      color: colors.textSecondary,
    },
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    statsGroup: {
      flexDirection: 'row',
      gap: themeUtils.spacing.lg,
    },
    statItem: {
      alignItems: 'center',
    },
    statValue: {
      fontSize: themeUtils.fontSize.md,
      fontWeight: '600',
      color: colors.accent,
      marginBottom: 2,
    },
    statLabel: {
      fontSize: themeUtils.fontSize.xs,
      color: colors.muted,
    },
    followButton: {
      paddingHorizontal: themeUtils.spacing.md,
      paddingVertical: themeUtils.spacing.sm,
      borderRadius: themeUtils.borderRadius.full,
      borderWidth: 1.5,
      borderColor: colors.accent,
      justifyContent: 'center',
      alignItems: 'center',
    },
    followButtonFollowing: {
      backgroundColor: colors.accentFill20,
    },
    followButtonText: {
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
          <View style={styles.header}>
            <View style={styles.avatarContainer}>
              <MaterialCommunityIcons
                name="account-music"
                size={32}
                color={colors.accent}
              />
            </View>
            <View style={styles.headerContent}>
              <Text style={styles.artistName} numberOfLines={1}>{artist.name}</Text>
              <Text style={styles.followerText}>
                {formatNumber(artist.followerCount)} followers
              </Text>
            </View>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statsGroup}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatNumber(artist.playCount)}</Text>
                <Text style={styles.statLabel}>plays</Text>
              </View>
            </View>

            <Pressable
              style={[styles.followButton, isFollowing && styles.followButtonFollowing]}
              onPress={handleFollowPress}
            >
              <Text style={styles.followButtonText}>
                {isFollowing ? t('screens.artist.unfollowArtist') : t('screens.artist.followArtist')}
              </Text>
            </Pressable>
          </View>
        </LinearGradient>
      </View>
    </Pressable>
  );
};

export default ArtistCardEnhanced;
