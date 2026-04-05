import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '../components/BackButton';
import { COLORS } from '../config/colors';
import { useAuth } from '../context/AuthContext';
import { RetryState } from '../components/RetryState';
import { SectionSkeleton } from '../components/SkeletonLoader';
import { useTranslation } from '../context/LocalizationContext';
import { deleteFeedPost, FeedPost, getOwnerFeed, updateFeedPost } from '../services/social';
import { notifyFeedUpdated, subscribeFeedUpdates } from '../services/feedEvents';

const VIS_OPTIONS: Array<{ value: 'PUBLIC' | 'FOLLOWERS_ONLY' | 'PRIVATE'; label: string }> = [
  { value: 'PUBLIC', label: '🌐 Công khai' },
  { value: 'FOLLOWERS_ONLY', label: '👥 Chỉ người theo dõi' },
  { value: 'PRIVATE', label: '🔒 Riêng tư' },
];

const visLabel = (v: FeedPost['visibility']) =>
  v === 'PUBLIC' ? '🌐 Công khai' : v === 'FOLLOWERS_ONLY' ? '👥 Chỉ người theo dõi' : '🔒 Riêng tư';

export const MyPostsScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const { authSession } = useAuth();

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingPost, setEditingPost] = useState<FeedPost | null>(null);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'FOLLOWERS_ONLY' | 'PRIVATE'>('PUBLIC');

  const currentUserId = authSession?.profile?.id;

  const load = useCallback(async (silent = false) => {
    if (!currentUserId) {
      setPosts([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      if (!silent) setLoading(true);
      setLoadError(null);
      const data = await getOwnerFeed(currentUserId, { page: 0, size: 50 });
      setPosts(data.content ?? []);
    } catch (error: any) {
      if (!silent) {
        setLoadError(error?.message ?? 'Không thể tải danh sách bài viết');
        setPosts([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUserId]);

  useFocusEffect(useCallback(() => {
    void load(false);
    const unsubscribe = subscribeFeedUpdates(() => { void load(true); });
    return unsubscribe;
  }, [load]));

  const openEdit = (post: FeedPost) => {
    setEditingPost(post);
    setTitle(post.title ?? '');
    setCaption(post.caption ?? '');
    setVisibility(post.visibility);
  };

  const handleSave = async () => {
    if (!editingPost) return;
    try {
      setSaving(true);
      await updateFeedPost(editingPost.id, {
        title: title.trim(),
        caption: caption.trim() || undefined,
        visibility,
      });
      setEditingPost(null);
      await load(true);
      notifyFeedUpdated();
    } catch (e: any) {
      Alert.alert(t('common.error', 'Lỗi'), e?.message ?? 'Không thể cập nhật bài viết');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (post: FeedPost) => {
    Alert.alert('Xoá bài viết?', 'Không thể hoàn tác.', [
      { text: t('common.cancel', 'Huỷ'), style: 'cancel' },
      {
        text: t('common.delete', 'Xoá'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteFeedPost(post.id);
            setPosts(prev => prev.filter(p => p.id !== post.id));
            notifyFeedUpdated();
          } catch (e: any) {
            Alert.alert(t('common.error', 'Lỗi'), e?.message ?? 'Không thể xoá bài viết');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Bài đăng của tôi</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(true); }} tintColor={COLORS.accent} />}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {loading ? (
          <View style={{ paddingTop: 16 }}><SectionSkeleton rows={3} /></View>
        ) : loadError && posts.length === 0 ? (
          <RetryState
            title="Không tải được bài đăng"
            description={loadError}
            onRetry={() => { setLoading(true); void load(false); }}
            fallbackLabel="Quay lại"
            onFallback={() => navigation.goBack()}
            icon="📝"
          />
        ) : posts.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>Chưa có bài đăng</Text>
            <Text style={styles.emptySub}>Hãy tạo bài viết ở tab Khám phá.</Text>
          </View>
        ) : (
          posts.map(post => (
            <View key={post.id} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.badge}>{visLabel(post.visibility)}</Text>
                <View style={styles.row}>
                  <Pressable onPress={() => openEdit(post)}><Text style={styles.action}>Sửa</Text></Pressable>
                  <Pressable onPress={() => handleDelete(post)}><Text style={[styles.action, { color: COLORS.error }]}>Xoá</Text></Pressable>
                </View>
              </View>
              {!!post.title && <Text style={styles.title}>{post.title}</Text>}
              {!!post.caption && <Text style={styles.caption}>{post.caption}</Text>}
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={!!editingPost} transparent animationType="fade" onRequestClose={() => setEditingPost(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Chỉnh sửa bài viết</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Tiêu đề..." placeholderTextColor={COLORS.glass30} />
            <TextInput style={[styles.input, { minHeight: 90 }]} multiline value={caption} onChangeText={setCaption} placeholder="Nội dung..." placeholderTextColor={COLORS.glass30} />
            <View style={styles.visRow}>
              {VIS_OPTIONS.map(opt => (
                <Pressable key={opt.value} style={[styles.visChip, visibility === opt.value && styles.visChipActive]} onPress={() => setVisibility(opt.value)}>
                  <Text style={[styles.visText, visibility === opt.value && styles.visTextActive]}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setEditingPost(null)}>
                <Text style={styles.cancelText}>{t('common.cancel', 'Huỷ')}</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color={COLORS.white} /> : <Text style={styles.saveText}>{t('common.save', 'Lưu')}</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10 },
  headerTitle: { color: COLORS.white, fontSize: 18, fontWeight: '800' },
  center: { alignItems: 'center', paddingVertical: 56, paddingHorizontal: 24 },
  emptyTitle: { color: COLORS.white, fontSize: 17, fontWeight: '700' },
  emptySub: { color: COLORS.glass45, fontSize: 13, marginTop: 6, textAlign: 'center' },
  card: { marginHorizontal: 16, marginBottom: 10, padding: 12, borderRadius: 12, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.glass10, gap: 6 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: { color: COLORS.accent, fontSize: 12, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 12 },
  action: { color: COLORS.glass60, fontSize: 13, fontWeight: '700' },
  title: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  caption: { color: COLORS.glass70, fontSize: 14, lineHeight: 20 },
  modalOverlay: { flex: 1, backgroundColor: COLORS.scrim, alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: { width: '100%', backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.glass12, padding: 14, gap: 10 },
  modalTitle: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
  input: { backgroundColor: COLORS.surfaceLow, borderWidth: 1, borderColor: COLORS.glass12, borderRadius: 10, color: COLORS.white, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  visRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  visChip: { borderRadius: 999, borderWidth: 1, borderColor: COLORS.glass12, backgroundColor: COLORS.glass08, paddingHorizontal: 10, paddingVertical: 6 },
  visChipActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accentFill20 },
  visText: { color: COLORS.glass60, fontSize: 12, fontWeight: '600' },
  visTextActive: { color: COLORS.accent },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 2 },
  cancelBtn: { flex: 1, borderRadius: 10, borderWidth: 1, borderColor: COLORS.glass12, backgroundColor: COLORS.glass08, minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: COLORS.glass60, fontWeight: '700' },
  saveBtn: { flex: 1, borderRadius: 10, backgroundColor: COLORS.accentDim, minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: COLORS.white, fontWeight: '700' },
});

