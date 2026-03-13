import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '../../config/colors';
import { createFeedPost, deleteFeedPost, FeedPost, getTimeline, likeFeedPost, unlikeFeedPost, updateFeedPost } from '../../services/social';

const PUBLIC_LINK_BASE = 'https://phazelsound.oopsgolden.id.vn';
const socials = ['Facebook', 'Instagram', 'TikTok', 'YouTube', 'Discord'];

const timeAgo = (iso: string): string => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.floor(diffMs / 60000));
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
};

export const DiscoverScreen = () => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [posting, setPosting] = useState(false);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [editingPost, setEditingPost] = useState<FeedPost | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingCaption, setEditingCaption] = useState('');

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
    const id = setInterval(() => void loadFeed(true), 10000);
    return () => clearInterval(id);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadFeed(true);
    }, []),
  );

  const handleCreatePost = async () => {
    if (!title.trim()) {
      Alert.alert('Thiếu tiêu đề', 'Vui lòng nhập title cho feed post.');
      return;
    }
    try {
      setPosting(true);
      await createFeedPost({ visibility: 'PUBLIC', title: title.trim(), caption: caption.trim() || undefined });
      setTitle('');
      setCaption('');
      await loadFeed(true);
    } catch (error: any) {
      Alert.alert('Không thể đăng feed', error?.message || 'Vui lòng thử lại');
    } finally {
      setPosting(false);
    }
  };

  const handleLikeToggle = async (post: FeedPost) => {
    try {
      if (post.likedByCurrentUser) {
        await unlikeFeedPost(post.id);
      } else {
        await likeFeedPost(post.id);
      }
      await loadFeed(true);
    } catch (error: any) {
      Alert.alert('Lỗi', error?.message || 'Không thể thao tác like');
    }
  };

  const handleDelete = async (postId: string) => {
    try {
      await deleteFeedPost(postId);
      await loadFeed(true);
    } catch (error: any) {
      Alert.alert('Lỗi', error?.message || 'Không thể xóa bài viết');
    }
  };

  const renderPostActions = (post: FeedPost) => (
    <View style={styles.actionRow}>
      <Pressable onPress={() => void handleLikeToggle(post)}><Text style={styles.action}>{post.likedByCurrentUser ? '💜 Bỏ tim' : '🤍 Tim'}</Text></Pressable>
      <Pressable onPress={() => Alert.alert('Comment', 'API comment chưa được map ở frontend service, sẽ bổ sung tiếp.') }><Text style={styles.action}>💬 Comment</Text></Pressable>
      <Pressable onPress={() => void Share.share({ message: `${post.title ?? 'Feed post'}\n${PUBLIC_LINK_BASE}/feed/${post.id}` })}><Text style={styles.action}>↗ Share</Text></Pressable>
      <Pressable onPress={() => void handleDelete(post.id)}><Text style={styles.actionDanger}>🗑 Xóa</Text></Pressable>
      <Pressable onPress={() => { setEditingPost(post); setEditingTitle(post.title ?? ''); setEditingCaption(post.caption ?? ''); }}><Text style={styles.action}>✏ Sửa</Text></Pressable>
    </View>
  );

  const heroSubtitle = useMemo(() => 'Newfeed xã hội âm nhạc realtime.', []);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadFeed(true)} tintColor={COLORS.accent} />}
        contentContainerStyle={{ paddingBottom: 36 }}
      >
        <LinearGradient colors={[COLORS.gradNavy, COLORS.bg]} style={[styles.hero, { paddingTop: insets.top + 20 }]}>
          <Text style={styles.title}>Discovery Feed</Text>
          <Text style={styles.sub}>{heroSubtitle}</Text>
          <View style={styles.socialRow}>
            {socials.map((item) => <View key={item} style={styles.socialChip}><Text style={styles.socialChipText}>{item}</Text></View>)}
          </View>

          <View style={styles.createCard}>
            <TextInput value={title} onChangeText={setTitle} placeholder="Title bài đăng" placeholderTextColor={COLORS.glass45} style={styles.input} />
            <TextInput value={caption} onChangeText={setCaption} placeholder="Caption..." placeholderTextColor={COLORS.glass45} style={[styles.input, styles.inputArea]} multiline />
            <Pressable onPress={handleCreatePost} disabled={posting} style={styles.postBtn}><Text style={styles.postBtnText}>{posting ? 'Đang đăng...' : 'Đăng Feed'}</Text></Pressable>
          </View>
        </LinearGradient>

        <View style={styles.body}>

      {editingPost && (
        <View style={styles.editCard}>
          <Text style={styles.editTitle}>Sửa bài đăng</Text>
          <TextInput value={editingTitle} onChangeText={setEditingTitle} placeholder="Title" placeholderTextColor={COLORS.glass45} style={styles.input} />
          <TextInput value={editingCaption} onChangeText={setEditingCaption} placeholder="Caption" placeholderTextColor={COLORS.glass45} style={[styles.input, styles.inputArea]} multiline />
          <View style={styles.actionRow}>
            <Pressable onPress={() => setEditingPost(null)}><Text style={styles.actionDanger}>Hủy</Text></Pressable>
            <Pressable onPress={async () => {
              try {
                await updateFeedPost(editingPost.id, { visibility: editingPost.visibility, title: editingTitle.trim(), caption: editingCaption.trim() });
                setEditingPost(null);
                await loadFeed(true);
              } catch (error: any) {
                Alert.alert('Lỗi', error?.message || 'Không thể sửa bài viết');
              }
            }}><Text style={styles.action}>Lưu</Text></Pressable>
          </View>
        </View>
      )}

          {loading ? <ActivityIndicator color={COLORS.accent} /> : null}
          {!loading && posts.length === 0 ? <View style={styles.emptyCard}><Text style={styles.emptyText}>Chưa có bài đăng trong feed.</Text></View> : null}

          {posts.map((post) => (
            <View key={post.id} style={styles.postCard}>
              <Text style={styles.postTitle}>{post.title || 'Bài chia sẻ âm nhạc'}</Text>
              {!!post.caption && <Text style={styles.postCaption}>{post.caption}</Text>}
              <Text style={styles.postMeta}>{post.contentType} • {timeAgo(post.createdAt)}</Text>
              <View style={styles.statRow}>
                <Text style={styles.stat}>❤️ {post.likeCount}</Text>
                <Text style={styles.stat}>💬 {post.commentCount}</Text>
                <Text style={styles.stat}>↗ {post.shareCount}</Text>
              </View>
              {renderPostActions(post)}
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
  socialChip: { backgroundColor: COLORS.glass10, borderColor: COLORS.glass20, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  socialChipText: { color: COLORS.glass90, fontSize: 12 },
  createCard: { marginTop: 14, backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.glass07, padding: 12 },
  input: { color: COLORS.white, borderWidth: 1, borderColor: COLORS.glass12, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8 },
  inputArea: { minHeight: 70, textAlignVertical: 'top' },
  postBtn: { backgroundColor: COLORS.accentDim, borderRadius: 8, minHeight: 38, alignItems: 'center', justifyContent: 'center' },
  postBtnText: { color: COLORS.white, fontWeight: '700' },
  body: { paddingHorizontal: 20, gap: 12 },
  postCard: { backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.glass07, padding: 14 },
  postTitle: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  postCaption: { color: COLORS.glass70, marginTop: 8, lineHeight: 20 },
  postMeta: { color: COLORS.glass45, marginTop: 10, fontSize: 12 },
  statRow: { flexDirection: 'row', gap: 14, marginTop: 10 },
  stat: { color: COLORS.glass80, fontSize: 12 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
  action: { color: COLORS.accent, fontSize: 12, fontWeight: '700' },
  actionDanger: { color: COLORS.error, fontSize: 12, fontWeight: '700' },
  emptyCard: { backgroundColor: COLORS.glass05, borderRadius: 12, padding: 16 },
  emptyText: { color: COLORS.glass50 },
  editCard: { backgroundColor: COLORS.surfaceLow, borderRadius: 10, borderWidth: 1, borderColor: COLORS.glass10, padding: 10, marginBottom: 10 },
  editTitle: { color: COLORS.white, fontWeight: '700', marginBottom: 8 },
});
