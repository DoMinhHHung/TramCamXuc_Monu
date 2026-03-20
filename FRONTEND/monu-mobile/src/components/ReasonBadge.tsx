import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '../config/colors';
import { ReasonType } from '../services/recommendation';

interface ReasonBadgeProps {
  reasonType: ReasonType;
  reason?: string;
  variant?: 'compact' | 'full';
}


export const ReasonBadge = ({ reasonType, reason, variant = 'full' }: ReasonBadgeProps) => {
  const colors = useThemeColors();

  const REASON_CONFIG: Record<ReasonType, { icon: string; label: string; color: string; bg: string }> = {
    BECAUSE_YOU_LISTEN: { icon: '🎧', label: 'Vì bạn nghe', color: colors.accent, bg: colors.accentFill20 },
    FRIEND_LIKED: { icon: '👥', label: 'Bạn bè thích', color: colors.success, bg: 'rgba(34,197,94,0.12)' },
    ARTIST_YOU_FOLLOW: { icon: '🎤', label: 'Artist bạn follow', color: colors.warning, bg: colors.warningDim },
    NEW_RELEASE: { icon: '✨', label: 'Mới phát hành', color: colors.info, bg: 'rgba(59,130,246,0.12)' },
    TRENDING_NOW: { icon: '🔥', label: 'Đang hot', color: colors.error, bg: 'rgba(239,68,68,0.12)' },
    TRENDING_IN_GENRE: { icon: '📈', label: 'Hot trong thể loại', color: colors.warningMid, bg: colors.warningDim },
    SIMILAR_TO_LIKED: { icon: '💡', label: 'Tương tự bạn thích', color: colors.accent, bg: 'rgba(192,132,252,0.12)' },
    POPULAR_GLOBALLY: { icon: '🌍', label: 'Phổ biến toàn cầu', color: colors.glass50, bg: colors.glass08 },
  };

  const cfg = REASON_CONFIG[reasonType] ?? REASON_CONFIG.POPULAR_GLOBALLY;
  const label = reason ?? cfg.label;

  if (variant === 'compact') {
    return <Text style={styles.icon}>{cfg.icon}</Text>;
  }

  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={styles.icon}>{cfg.icon}</Text>
      <Text style={[styles.label, { color: cfg.color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    gap: 4,
  },
  icon: { fontSize: 11 },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },
});
