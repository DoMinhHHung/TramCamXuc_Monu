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
import { createCachedThemeStyles } from '../utils/cardStyles';

interface ArtistCardEnhancedProps {
  artist: ArtistStats;
  onPress?: () => void;
  onFollowPress?: (artistId: string, isFollowing: boolean) => void;
  style?: ViewStyle;
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  card: {
    borderRadius: themeUtils.borderRadius.full,
    overflow: 'hidden',
    backgroundColor: colors.surfaceVariant,
    padding: themeUtils.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surfaceMid,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: themeUtils.spacing.md,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  artistName: {
    fontSize: themeUtils.fontSize.xl,
    fontWeight: '800',
    fontFamily: 'Plus Jakarta Sans',
    color: colors.text,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  followerText: {
    fontSize: themeUtils.fontSize.sm,
    color: colors.textSecondary,
    fontFamily: 'Inter',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statValue: {
    fontSize: themeUtils.fontSize.sm,
    fontWeight: '700',
    color: colors.success, // Spotify Green for active play count
  },
  followButton: {
    paddingHorizontal: themeUtils.spacing.lg,
    paddingVertical: themeUtils.spacing.sm,
    borderRadius: themeUtils.borderRadius.full,
    backgroundColor: colors.accent, // Electric orange for primary action
    justifyContent: 'center',
    alignItems: 'center',
  },
  followButtonFollowing: {
    backgroundColor: colors.surfaceMid,
  },
  followButtonText: {
    fontSize: themeUtils.fontSize.xs,
    fontWeight: '800',
    color: colors.bg, // Black text on neon orange background
  },
  followButtonTextFollowing: {
    color: colors.text,
  }
});

const useCardStyles = createCachedThemeStyles(getStyles);

export const ArtistCardEnhanced: React.FC<ArtistCardEnhancedProps> = ({
  artist,
  onPress,
  onFollowPress,
  style,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [isFollowing, setIsFollowing] = useState(artist.isFollowing ?? false);
  const styles = useCardStyles(colors);

  const handleFollowPress = () => {
    setIsFollowing(!isFollowing);
    onFollowPress?.(artist.id, !isFollowing);
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <Pressable
      onPress={onPress}
      style={[styles.container, style]}
    >
      <View style={styles.card}>
        <View style={styles.avatarContainer}>
          <MaterialCommunityIcons
            name="account-music"
            size={36}
            color={colors.accent}
          />
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.artistName} numberOfLines={1}>{artist.name}</Text>
          <View style={styles.statsContainer}>
            <Text style={styles.followerText}>
              {formatNumber(artist.followerCount)} followers
            </Text>
            <Text style={styles.followerText}>•</Text>
            <Text style={styles.statValue}>{formatNumber(artist.playCount)} plays</Text>
          </View>
        </View>

        <Pressable
          style={[styles.followButton, isFollowing && styles.followButtonFollowing]}
          onPress={handleFollowPress}
        >
          <Text style={[styles.followButtonText, isFollowing && styles.followButtonTextFollowing]}>
            {isFollowing ? t('screens.artist.unfollowArtist') : t('screens.artist.followArtist')}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
};

export default ArtistCardEnhanced;
