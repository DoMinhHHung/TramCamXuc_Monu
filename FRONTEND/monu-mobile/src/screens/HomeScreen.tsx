import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { COLORS } from '../config/colors';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../navigation/AppNavigator';

type HomeNavigationProp = NativeStackNavigationProp<RootStackParamList, 'MainTabs'>;

const quickActions = [
  { title: 'Nhạc chữa lành', emoji: '🌙', color: [COLORS.cardHealingFrom, COLORS.gradPurple] as const },
  { title: 'Top Trending', emoji: '🔥', color: [COLORS.cardTrendingFrom, COLORS.cardTrendingTo] as const },
  { title: 'Acoustic', emoji: '🎸', color: [COLORS.cardAcousticFrom, COLORS.cardAcousticTo] as const },
  { title: 'Lofi Focus', emoji: '🎧', color: [COLORS.cardLofiFrom, COLORS.cardLofiTo] as const },
];

const recentPlaylists = [
  { title: 'Daily Mix #1', subtitle: 'Pop • Indie • Chill', count: '32 bài', emoji: '🎵' },
  { title: 'Healing Night', subtitle: 'Piano • Ambient • Sleep', count: '21 bài', emoji: '🌙' },
  { title: 'Morning Boost', subtitle: 'EDM • Pop • Energy', count: '18 bài', emoji: '⚡' },
];

export const HomeScreen = () => {
  const navigation = useNavigation<HomeNavigationProp>();
  const { authSession } = useAuth();
  const insets = useSafeAreaInsets();

  const displayName =
      authSession?.profile?.fullName ||
      authSession?.profile?.email?.split('@')[0] ||
      'bạn';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return 'Chào buổi sáng ☀';
    if (hour >= 11 && hour < 14) return 'Chúc buổi trưa vui vẻ 🌤';
    if (hour >= 14 && hour < 22) return 'Chào buổi tối 🌆';
    return 'Chúc ngủ ngon 🌙';
  };

  const greetingText = getGreeting();

  return (
      <View style={styles.container}>
        <StatusBar style="light" />

        <ScrollView
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
        >
          {/* Header gradient */}
          <LinearGradient
              colors={[COLORS.gradPurple, COLORS.gradIndigo, COLORS.bg]}
              locations={[0, 0.6, 1]}
              style={[styles.header, { paddingTop: insets.top + 16 }]}
          >
            {/* Nhấn vào đây (tên + avatar) sẽ đi Profile */}
            <Pressable
                style={styles.headerTop}
                onPress={() => navigation.navigate('Profile')}
            >
              <View>
                <Text style={styles.greeting}>{greetingText},</Text>
                <Text style={styles.name}>{displayName} 👋</Text>
              </View>

              <View style={styles.avatarBtn}>
                <View style={styles.avatarCircle}>
                  <Text style={{ fontSize: 20 }}>👤</Text>
                </View>
              </View>
            </Pressable>

            {/* Featured banner (đã sửa colors đúng) */}
            <View style={styles.featuredCard}>
              <LinearGradient
                  colors={[COLORS.accentFill90, COLORS.accentFill95]}
                  style={styles.featuredGradient}
              >
                <View style={styles.featuredBadge}>
                  <Text style={styles.featuredBadgeText}>✦ NỔI BẬT</Text>
                </View>
                <Text style={styles.featuredTitle}>PhazelSound{'\n'}Premium Vibes</Text>
                <Text style={styles.featuredSub}>Playlist cá nhân hóa theo cảm xúc</Text>
                <Pressable style={styles.featuredBtn}>
                  <Text style={styles.featuredBtnText}>▶  Phát ngay</Text>
                </Pressable>
              </LinearGradient>
            </View>
          </LinearGradient>

          {/* Quick actions & Recommended giữ nguyên như cũ */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Phát nhanh</Text>
            <View style={styles.grid}>
              {quickActions.map((item) => (
                  <Pressable key={item.title} style={styles.quickCard}>
                    <LinearGradient
                        colors={item.color}
                        style={styles.quickCardGradient}
                    >
                      <Text style={styles.cardEmoji}>{item.emoji}</Text>
                      <Text style={styles.cardTitle}>{item.title}</Text>
                    </LinearGradient>
                  </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Dành cho bạn</Text>
              <Text style={styles.seeAll}>Xem tất cả</Text>
            </View>

            {recentPlaylists.map((item, i) => (
                <Pressable key={i} style={styles.listCard}>
                  <LinearGradient
                      colors={[COLORS.surface, COLORS.surfaceLow]}
                      style={styles.listCardGradient}
                  >
                    <View style={styles.listIconWrap}>
                      <Text style={styles.listIcon}>{item.emoji}</Text>
                    </View>
                    <View style={styles.listInfo}>
                      <Text style={styles.listTitle}>{item.title}</Text>
                      <Text style={styles.listSubtitle}>{item.subtitle}</Text>
                    </View>
                    <View style={styles.listMeta}>
                      <Text style={styles.listCount}>{item.count}</Text>
                      <Text style={styles.listArrow}>›</Text>
                    </View>
                  </LinearGradient>
                </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  header: { paddingHorizontal: 20, paddingBottom: 24 },

  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  greeting: { color: COLORS.glass50, fontSize: 14, fontWeight: '500' },
  name: { color: COLORS.white, fontSize: 28, fontWeight: '800', marginTop: 2 },
  avatarBtn: {},
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.glass10,
    borderWidth: 1,
    borderColor: COLORS.glass20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ... phần còn lại của styles giữ nguyên (featuredCard, section, grid, listCard...)
  featuredCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: COLORS.accentDeep,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  featuredGradient: { padding: 22 },
  featuredBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.glass15,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  featuredBadgeText: { color: COLORS.glass90, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  featuredTitle: { color: COLORS.white, fontSize: 22, fontWeight: '800', lineHeight: 30, marginBottom: 6 },
  featuredSub: { color: COLORS.glass65, fontSize: 14, marginBottom: 18 },
  featuredBtn: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.white,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  featuredBtnText: { color: COLORS.gradIndigo, fontWeight: '800', fontSize: 14 },

  section: { paddingHorizontal: 20, paddingTop: 28 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { color: COLORS.white, fontSize: 20, fontWeight: '800', marginBottom: 14 },
  seeAll: { color: COLORS.accent, fontSize: 13, fontWeight: '600' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickCard: { width: '47.5%', borderRadius: 14, overflow: 'hidden' },
  quickCardGradient: {
    padding: 16,
    minHeight: 90,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.glass06,
  },
  cardEmoji: { fontSize: 26 },
  cardTitle: { color: COLORS.white, fontWeight: '700', fontSize: 14 },

  listCard: { marginBottom: 10, borderRadius: 14, overflow: 'hidden' },
  listCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.glass06,
  },
  listIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: COLORS.accentBorder25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  listIcon: { fontSize: 24 },
  listInfo: { flex: 1 },
  listTitle: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  listSubtitle: { color: COLORS.glass45, marginTop: 3, fontSize: 12 },
  listMeta: { alignItems: 'flex-end', gap: 4 },
  listCount: { color: COLORS.glass35, fontSize: 12 },
  listArrow: { color: COLORS.glass30, fontSize: 20 },
});