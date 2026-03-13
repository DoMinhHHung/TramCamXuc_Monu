import React, { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '../../config/colors';
import { FeedPost, getTimeline } from '../../services/social';

const socials = ['Facebook', 'Instagram', 'TikTok', 'YouTube', 'Discord'];

export const DiscoverScreen = () => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [posts, setPosts] = useState<FeedPost[]>([]);

  const loadFeed = async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      const data = await getTimeline({ page: 0, size: 20 });
      setPosts(data.content ?? []);
    } catch {
      setPosts([]);
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  };

  useEffect(() => {
    void loadFeed();
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadFeed(true)} tintColor={COLORS.accent} />}
        contentContainerStyle={{ paddingBottom: 36 }}
      >
        <LinearGradient colors={[COLORS.gradNavy, COLORS.bg]} style={[styles.hero, { paddingTop: insets.top + 20 }]}>
          <Text style={styles.title}>Discovery Feed</Text>
          <Text style={styles.sub}>Newfeed xã hội âm nhạc theo phong cách Facebook.</Text>
          <View style={styles.socialRow}>
            {socials.map((item) => (
              <View key={item} style={styles.socialChip}><Text style={styles.socialChipText}>{item}</Text></View>
            ))}
          </View>
        </LinearGradient>

        <View style={styles.body}>
          {loading ? <ActivityIndicator color={COLORS.accent} /> : null}
          {!loading && posts.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Chưa có bài đăng trong feed.</Text>
            </View>
          ) : null}

          {posts.map((post) => (
            <View key={post.id} style={styles.postCard}>
              <Text style={styles.postTitle}>{post.title || 'Bài chia sẻ âm nhạc'}</Text>
              {!!post.caption && <Text style={styles.postCaption}>{post.caption}</Text>}
              <Text style={styles.postMeta}>{post.contentType} • {new Date(post.createdAt).toLocaleString('vi-VN')}</Text>
              <View style={styles.statRow}>
                <Text style={styles.stat}>❤️ {post.likeCount}</Text>
                <Text style={styles.stat}>💬 {post.commentCount}</Text>
                <Text style={styles.stat}>↗ {post.shareCount}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  hero: { paddingHorizontal: 20, paddingBottom: 20 },
  title: { color: COLORS.white, fontSize: 28, fontWeight: '800' },
  sub: { color: COLORS.glass50, marginTop: 8 },
  socialRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  socialChip: {
    backgroundColor: COLORS.glass10,
    borderColor: COLORS.glass20,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  socialChipText: { color: COLORS.glass90, fontSize: 12 },
  body: { paddingHorizontal: 20, gap: 12 },
  postCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.glass07,
    padding: 14,
  },
  postTitle: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  postCaption: { color: COLORS.glass70, marginTop: 8, lineHeight: 20 },
  postMeta: { color: COLORS.glass45, marginTop: 10, fontSize: 12 },
  statRow: { flexDirection: 'row', gap: 14, marginTop: 10 },
  stat: { color: COLORS.glass80, fontSize: 12 },
  emptyCard: { backgroundColor: COLORS.glass05, borderRadius: 12, padding: 16 },
  emptyText: { color: COLORS.glass50 },
});
