import React, { ReactNode, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '../config/colors';
import { FeedbackType, RecommendedSong } from '../services/recommendation';
import { HorizontalSongScroll } from './HorizontalSongScroll';

interface RecommendationSectionProps {
  icon: string;
  title: string;
  subtitle?: string;
  songs: RecommendedSong[];
  activeSongId?: string;
  loading?: boolean;
  emptyText?: string;
  onPress: (song: RecommendedSong) => void;
  onLongPress?: (song: RecommendedSong) => void;
  onFeedback?: (songId: string, feedback: FeedbackType) => void;
  onSeeAll?: () => void;
  hasBadge?: boolean;
  hideIfEmpty?: boolean;
  footer?: ReactNode;
}

export const RecommendationSection = ({
  icon,
  title,
  subtitle,
  songs,
  activeSongId,
  loading = false,
  emptyText,
  onPress,
  onLongPress,
  onFeedback,
  onSeeAll,
  hasBadge = false,
  hideIfEmpty = true,
  footer,
}: RecommendationSectionProps) => {
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);

  if (hideIfEmpty && !loading && songs.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.icon}>{icon}</Text>
          <Text style={styles.title}>{title}</Text>
          {hasBadge && <View style={styles.newDot} />}
        </View>

        {onSeeAll && (
          <Pressable onPress={onSeeAll} hitSlop={8}>
            <Text style={styles.seeAll}>Xem thêm ›</Text>
          </Pressable>
        )}
      </View>

      {subtitle && (
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      )}

      <HorizontalSongScroll
        songs={songs}
        activeSongId={activeSongId}
        onPress={onPress}
        onLongPress={onLongPress}
        onFeedback={onFeedback}
        loading={loading}
        emptyText={emptyText}
      />

      {footer}
    </View>
  );
};

const getStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  section: {
    marginTop: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  icon: { fontSize: 18 },
  title: { color: colors.text, fontSize: 18, fontWeight: '800' },
  newDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.error,
    marginLeft: 2,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  seeAll: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
});
