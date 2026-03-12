import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '../config/colors';
import { useAuth } from '../context/AuthContext';

const quickActions = [
  { title: 'Nhạc chữa lành', emoji: '🌙' },
  { title: 'Top Trending', emoji: '🔥' },
  { title: 'Acoustic', emoji: '🎸' },
  { title: 'Lofi Focus', emoji: '🎧' },
];

export const HomeScreen = () => {
  const { authSession } = useAuth();

  const displayName = authSession?.profile?.fullName || authSession?.profile?.email || 'bạn';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>Chào mừng trở lại,</Text>
      <Text style={styles.name}>{displayName}</Text>

      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>PhazelSound Premium Vibes</Text>
        <Text style={styles.bannerSubtitle}>Khám phá playlist được cá nhân hóa theo cảm xúc của bạn.</Text>
      </View>

      <Text style={styles.sectionTitle}>Phát nhanh</Text>
      <View style={styles.grid}>
        {quickActions.map((item) => (
          <Pressable key={item.title} style={styles.card}>
            <Text style={styles.cardEmoji}>{item.emoji}</Text>
            <Text style={styles.cardTitle}>{item.title}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Dành cho bạn</Text>
      <View style={styles.listCard}>
        <Text style={styles.listTitle}>Daily Mix #1</Text>
        <Text style={styles.listSubtitle}>Pop • Indie • Chill • 32 bài hát</Text>
      </View>
      <View style={styles.listCard}>
        <Text style={styles.listTitle}>Healing Night</Text>
        <Text style={styles.listSubtitle}>Piano • Ambient • Sleep • 21 bài hát</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 40 },
  greeting: { color: COLORS.muted, fontSize: 14 },
  name: { color: COLORS.text, fontSize: 28, fontWeight: '800', marginTop: 4, marginBottom: 18 },
  banner: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  bannerTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  bannerSubtitle: { color: COLORS.muted, fontSize: 14, marginTop: 6, lineHeight: 20 },
  sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 12 },
  card: {
    width: '48.5%',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  cardEmoji: { fontSize: 22, marginBottom: 8 },
  cardTitle: { color: COLORS.text, fontWeight: '600' },
  listCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  listTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  listSubtitle: { color: COLORS.muted, marginTop: 4, fontSize: 13 },
});
