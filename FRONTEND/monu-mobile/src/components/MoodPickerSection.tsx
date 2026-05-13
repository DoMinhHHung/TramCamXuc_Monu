import React, { memo, useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors } from '../config/colors';
import { FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING } from '../config/design';

export interface MoodItem {
  emoji: string;
  label: string;
  query: string;
  gradientFrom: string;
  gradientTo: string;
}

export const MOOD_ITEMS: MoodItem[] = [
  { emoji: '😌', label: 'Bình yên', query: 'nhẹ nhàng chill', gradientFrom: '#1a3a5c', gradientTo: '#0d7377' },
  { emoji: '🔥', label: 'Bùng cháy', query: 'sôi động edm', gradientFrom: '#7b1a1a', gradientTo: '#c0392b' },
  { emoji: '💔', label: 'Buồn bã', query: 'ballad buồn', gradientFrom: '#1a1a4a', gradientTo: '#4a3570' },
  { emoji: '🌙', label: 'Đêm khuya', query: 'đêm khuya lofi', gradientFrom: '#0d0d2b', gradientTo: '#1a1044' },
  { emoji: '☀️', label: 'Năng lượng', query: 'vui tươi pop', gradientFrom: '#7a4500', gradientTo: '#c07800' },
  { emoji: '💪', label: 'Tập luyện', query: 'tập gym hiphop', gradientFrom: '#1a3a1a', gradientTo: '#2d6a2d' },
];

interface Props {
  onSelectMood: (mood: MoodItem) => void;
}

const MoodPill = memo(({ mood, onSelectMood }: { mood: MoodItem; onSelectMood: (m: MoodItem) => void }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.93, useNativeDriver: true, tension: 120, friction: 8 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 120, friction: 8 }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => onSelectMood(mood)}
        accessibilityRole="button"
        accessibilityLabel={`Tâm trạng ${mood.label}`}
      >
        <LinearGradient
          colors={[mood.gradientFrom, mood.gradientTo]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.pill}
        >
          <Text style={styles.pillEmoji}>{mood.emoji}</Text>
          <Text style={styles.pillLabel}>{mood.label}</Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
});

MoodPill.displayName = 'MoodPill';

export const MoodPickerSection = memo(({ onSelectMood }: Props) => {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      <View style={[styles.headerRow, { paddingHorizontal: SPACING.xl }]}>
        <Text style={[styles.sectionTitle, { color: colors.white }]}>Bạn đang cảm thấy thế nào?</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {MOOD_ITEMS.map((mood) => (
          <MoodPill key={mood.label} mood={mood} onSelectMood={onSelectMood} />
        ))}
      </ScrollView>
    </View>
  );
});

MoodPickerSection.displayName = 'MoodPickerSection';

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.section,
  },
  headerRow: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.extrabold,
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.full,
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  pillEmoji: {
    fontSize: 18,
  },
  pillLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFFFFF',
  },
});
