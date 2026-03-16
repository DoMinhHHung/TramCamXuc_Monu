import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome, Ionicons, AntDesign, Fontisto } from '@expo/vector-icons';

import { COLORS } from '../../config/colors';
import { useAuth } from '../../context/AuthContext';
import {
  Comment,
  createFeedPost,
  createPostComment,
  deleteComment,
  deleteFeedPost,
  FeedPost,
  getPostComments,
  getTimeline,
  likeComment,
  likeFeedPost,
  unlikeComment,
  unlikeFeedPost,
  updateComment,
  updateFeedPost,
  getArtistByUserId,
} from '../../services/social';

interface OwnerInfo {
  displayName: string;
  artistId: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const timeAgo = (iso: string): string => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.floor(diffMs / 60_000));
  if (mins < 60) return `${mins} phút`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ`;
  return `${Math.floor(hours / 24)} ngày`;
};

const getAvatarColors = (id: string): [string, string] => {
  const palette: [string, string][] = [
    [COLORS.gradPurple, COLORS.accent],
    [COLORS.cardTrendingFrom, COLORS.cardTrendingTo],
    [COLORS.cardAcousticFrom, COLORS.cardAcousticTo],
    [COLORS.gradIndigo, COLORS.accentAlt],
    [COLORS.cardLofiFrom, COLORS.catRnbTo],
  ];
  const idx = id.charCodeAt(0) % palette.length;
  return palette[idx];
};

const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

// ─── Sub-components ───────────────────────────────────────────────────────────

const Avatar = ({
                  id,
                  displayName,
                  size = 40,
                }: {
  id: string;
  displayName?: string;
  size?: number;
}) => {
  const colors = getAvatarColors(id);
  return (
      <LinearGradient
          colors={colors}
          style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
      >
        <Text style={[styles.avatarText, { fontSize: size * 0.34 }]}>
          {getInitials(displayName ?? id)}
        </Text>
      </LinearGradient>
  );
};

const ActionBtn = ({
                     icon,
                     label,
                     active,
                     onPress,
                   }: {
  icon: string | React.ReactNode;
  label: string | number;
  active?: boolean;
  onPress: () => void;
}) => (
    <Pressable style={styles.actionBtn} onPress={onPress} hitSlop={8}>
      <Text style={[styles.actionIcon, active && { color: COLORS.accent }]}>
        {icon}
      </Text>
      {Number(label) > 0 && (
          <Text style={[styles.actionLabel, active && { color: COLORS.accent }]}>
            {label}
          </Text>
      )}
    </Pressable>
);

// ─── Compose Modal ─────────────────────────────────────────────────────────────

interface ComposeModalProps {
  visible: boolean;
  userId: string;
  displayName: string | null;
  onClose: () => void;
  onPost: (title: string, caption: string) => Promise<void>;
  posting: boolean;
}

const ComposeModal = ({
                        visible,
                        userId,
                        displayName,
                        onClose,
                        onPost,
                        posting,
                      }: ComposeModalProps) => {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      const t = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(t);
    } else {
      setTitle('');
      setCaption('');
    }
  }, [visible]);

  const canPost = title.trim().length > 0;

  const handlePost = async () => {
    if (!canPost || posting) return;
    await onPost(title.trim(), caption.trim());
    setTitle('');
    setCaption('');
  };

  const shownName = displayName || userId?.slice(0, 8) + '...';

  return (
      <Modal
          visible={visible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={onClose}
      >
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.composeRoot, { paddingTop: insets.top + 4 }]}>
            <View style={styles.composeHeader}>
              <Pressable onPress={onClose} style={styles.composeCancelBtn}>
                <Text style={styles.composeCancelText}>Huỷ</Text>
              </Pressable>
              <Text style={styles.composeHeaderTitle}>Tạo bài viết</Text>
              <Pressable
                  style={[styles.composePostBtn, !canPost && styles.composePostBtnDisabled]}
                  onPress={handlePost}
                  disabled={!canPost || posting}
              >
                {posting ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                    <Text style={styles.composePostBtnText}>Đăng</Text>
                )}
              </Pressable>
            </View>

            <View style={styles.composeDivider} />

            <View style={styles.composeUserRow}>
              <Avatar id={userId} displayName={displayName ?? userId} size={44} />
              <View style={styles.composeUserInfo}>
                <Text style={styles.composeUserName}>{shownName}</Text>
                <View style={styles.composeAudienceTag}>
                  <Text style={styles.composeAudienceIcon}>
                    <Fontisto name="world-o" size={16} color="#2F80ED" />
                  </Text>
                  <Text style={styles.composeAudienceText}>Công khai</Text>
                </View>
              </View>
            </View>

            <ScrollView
                style={styles.composeBody}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
              <TextInput
                  ref={inputRef}
                  style={styles.composeTitleInput}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Tiêu đề bài viết..."
                  placeholderTextColor={COLORS.glass25}
                  multiline
              />
              <TextInput
                  style={styles.composeCaptionInput}
                  value={caption}
                  onChangeText={setCaption}
                  placeholder="Chia sẻ cảm xúc âm nhạc của bạn..."
                  placeholderTextColor={COLORS.glass20}
                  multiline
              />
            </ScrollView>

            <View style={[styles.composeToolbar, { paddingBottom: insets.bottom + 8 }]}>
              <Text style={styles.composeToolbarLabel}>Thêm vào bài viết</Text>
              <View style={styles.composeToolbarIcons}>
                {['🎵', '🎧', '🎸', '💿'].map((e) => (
                    <Pressable key={e} style={styles.composeToolbarIcon}>
                      <Text style={{ fontSize: 20 }}>{e}</Text>
                    </Pressable>
                ))}
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
  );
};

// ─── Comment Sheet ─────────────────────────────────────────────────────────────

interface CommentSheetProps {
  visible: boolean;
  post: FeedPost | null;
  comments: Comment[];
  currentUserId: string | null;
  myDisplayName: string | null;
  onClose: () => void;
  onSendComment: (content: string) => Promise<void>;
  onLikeComment: (c: Comment) => Promise<void>;
  onDeleteComment: (id: string) => Promise<void>;
  onEditComment: (id: string, content: string) => Promise<void>;
}

const CommentSheet = ({
                        visible,
                        post,
                        comments,
                        currentUserId,
                        myDisplayName,
                        onClose,
                        onSendComment,
                        onLikeComment,
                        onDeleteComment,
                        onEditComment,
                      }: CommentSheetProps) => {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const inputRef = useRef<TextInput>(null);

  const [commentAuthorCache, setCommentAuthorCache] = useState<Record<string, string>>({});

  const loadCommentAuthors = useCallback(async () => {
    if (!comments.length || !currentUserId) return;

    const missingIds = comments
        .filter((c) => c.userId && !commentAuthorCache[c.userId] && c.userId !== currentUserId)
        .map((c) => c.userId);

    if (!missingIds.length) return;

    const uniqueMissing = [...new Set(missingIds)];

    try {
      const results = await Promise.allSettled(
          uniqueMissing.map(async (userId) => {
            const artist = await getArtistByUserId(userId);
            return {
              userId,
              name: artist?.stageName  || userId.slice(0, 8),
            };
          })
      );

      const updates: Record<string, string> = {};
      results.forEach((res) => {
        if (res.status === 'fulfilled' && res.value) {
          updates[res.value.userId] = res.value.name;
        }
      });

      setCommentAuthorCache((prev) => ({ ...prev, ...updates }));
    } catch (err) {
      console.warn('Lỗi load tên người comment:', err);
    }
  }, [comments, currentUserId, commentAuthorCache]);

  useEffect(() => {
    loadCommentAuthors();
  }, [loadCommentAuthors]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await onSendComment(text.trim());
      setText('');
    } finally {
      setSending(false);
    }
  };

  const handleEdit = async (id: string) => {
    if (!editingText.trim()) return;
    await onEditComment(id, editingText.trim());
    setEditingId(null);
  };

  if (!post) return null;

  return (
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <Pressable style={styles.sheetOverlay} onPress={onClose} />
        <KeyboardAvoidingView
            style={styles.sheetKbWrapper}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.sheetContainer, { paddingBottom: insets.bottom }]}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Bình luận</Text>
              <Pressable onPress={onClose} hitSlop={10}>
                <Text style={styles.sheetClose}>✕</Text>
              </Pressable>
            </View>

            <ScrollView
                style={styles.sheetList}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
              {comments.length === 0 && (
                  <Text style={styles.noComments}>
                    Chưa có bình luận nào. Hãy là người đầu tiên!
                  </Text>
              )}

              {comments.map((c) => {
                const isOwn = c.userId === currentUserId;
                const displayName = isOwn
                    ? myDisplayName || 'Bạn'
                    : commentAuthorCache[c.userId] || c.userId.slice(0, 8);

                return (
                    <View key={c.id} style={styles.commentRow}>
                      <Avatar id={c.userId} displayName={displayName} size={34} />

                      <View style={styles.commentContent}>
                        {editingId === c.id ? (
                            <View style={styles.commentEditRow}>
                              <TextInput
                                  style={styles.commentEditInput}
                                  value={editingText}
                                  onChangeText={setEditingText}
                                  autoFocus
                                  multiline
                              />
                              <View style={styles.commentEditActions}>
                                <Pressable onPress={() => setEditingId(null)}>
                                  <Text style={styles.commentEditCancel}>Huỷ</Text>
                                </Pressable>
                                <Pressable onPress={() => handleEdit(c.id)}>
                                  <Text style={styles.commentEditSave}>Lưu</Text>
                                </Pressable>
                              </View>
                            </View>
                        ) : (
                            <>
                              <View style={styles.commentBubble}>
                                <Text style={styles.commentUser}>{displayName}</Text>
                                <Text style={styles.commentText}>{c.content}</Text>
                              </View>

                              <View style={styles.commentMeta}>
                                <Text style={styles.commentTime}>{timeAgo(c.createdAt)}</Text>

                                <Pressable onPress={() => onLikeComment(c)} hitSlop={8}>
                                  <Text
                                      style={[
                                        styles.commentLike,
                                        c.likedByCurrentUser && { color: COLORS.accent },
                                      ]}
                                  >
                                    {c.likedByCurrentUser ? '♥' : '♡'}
                                    {c.likeCount > 0 ? ` ${c.likeCount}` : ''}
                                  </Text>
                                </Pressable>

                                {isOwn && (
                                    <>
                                      <Pressable
                                          onPress={() => {
                                            setEditingId(c.id);
                                            setEditingText(c.content);
                                          }}
                                          hitSlop={8}
                                      >
                                        <Text style={styles.commentAction}>Sửa</Text>
                                      </Pressable>
                                      <Pressable
                                          onPress={() => onDeleteComment(c.id)}
                                          hitSlop={8}
                                      >
                                        <Text style={[styles.commentAction, { color: COLORS.error }]}>
                                          Xoá
                                        </Text>
                                      </Pressable>
                                    </>
                                )}
                              </View>
                            </>
                        )}
                      </View>
                    </View>
                );
              })}

              <View style={{ height: 16 }} />
            </ScrollView>

            <View style={styles.commentInputBar}>
              <Avatar
                  id={currentUserId ?? 'anon'}
                  displayName={myDisplayName ?? 'Bạn'}
                  size={32}
              />
              <View style={styles.commentInputWrap}>
                <TextInput
                    ref={inputRef}
                    style={styles.commentInput}
                    value={text}
                    onChangeText={setText}
                    placeholder="Viết bình luận..."
                    placeholderTextColor={COLORS.glass30}
                    multiline
                    maxLength={500}
                />
              </View>
              <Pressable
                  style={[
                    styles.commentSendBtn,
                    (!text.trim() || sending) && { opacity: 0.35 },
                  ]}
                  onPress={handleSend}
                  disabled={!text.trim() || sending}
              >
                <Ionicons name="send-sharp" color="#000" size={24} />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
  );
};

// ─── Post Card ────────────────────────────────────────────────────────────────

interface PostCardProps {
  post: FeedPost;
  currentUserId: string | null;
  ownerInfo: OwnerInfo;
  onLike: (post: FeedPost) => void;
  onComment: (post: FeedPost) => void;
  onShare: (post: FeedPost) => void;
  onDelete: (post: FeedPost) => void;
  onEdit: (post: FeedPost) => void;
  onViewProfile: (artistId: string) => void;
}

const PostCard = ({
                    post,
                    currentUserId,
                    ownerInfo,
                    onLike,
                    onComment,
                    onShare,
                    onDelete,
                    onEdit,
                    onViewProfile,
                  }: PostCardProps) => {
  const isOwner = currentUserId === post.ownerId;
  const [menuOpen, setMenuOpen] = useState(false);

  const handleNamePress = () => {
    if (ownerInfo.artistId) onViewProfile(ownerInfo.artistId);
  };

  return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <Pressable onPress={handleNamePress} disabled={!ownerInfo.artistId}>
            <Avatar id={post.ownerId} displayName={ownerInfo.displayName} size={42} />
          </Pressable>
          <View style={styles.postMeta}>
            <Pressable onPress={handleNamePress} disabled={!ownerInfo.artistId}>
              <Text
                  style={[
                    styles.postOwnerName,
                    ownerInfo.artistId ? { color: COLORS.accent } : {},
                  ]}
              >
                {ownerInfo.displayName}
                {ownerInfo.artistId ? ' 🎤' : ''}
              </Text>
            </Pressable>
            <View style={styles.postMetaRow}>
              <Text style={styles.postTime}>{timeAgo(post.createdAt)} trước</Text>
              <Text style={styles.postMetaDot}>·</Text>
              <Text style={styles.postType}>
                {post.contentType === 'SONG'
                    ? '🎵'
                    : post.contentType === 'ALBUM'
                        ? '💿'
                        : post.contentType === 'PLAYLIST'
                            ? '📋'
                            : '📝'}
              </Text>
              <Text style={styles.postMetaDot}>·</Text>
              <Text style={styles.postVisibility}>
                <Fontisto name="world-o" size={16} color="#2F80ED" />
              </Text>
            </View>
          </View>
          {isOwner && (
              <Pressable
                  style={styles.postMenuBtn}
                  onPress={() => setMenuOpen((v) => !v)}
                  hitSlop={10}
              >
                <Text style={styles.postMenuIcon}>•••</Text>
              </Pressable>
          )}
        </View>

        {menuOpen && isOwner && (
            <View style={styles.postMenu}>
              <Pressable
                  style={styles.postMenuItem}
                  onPress={() => {
                    setMenuOpen(false);
                    onEdit(post);
                  }}
              >
                <Text style={styles.postMenuItemIcon}>
                  <FontAwesome name="edit" color="#ff7e5f" size={18} />
                </Text>
                <Text style={styles.postMenuItemText}>Chỉnh sửa bài viết</Text>
              </Pressable>
              <View style={styles.postMenuDivider} />
              <Pressable
                  style={styles.postMenuItem}
                  onPress={() => {
                    setMenuOpen(false);
                    onDelete(post);
                  }}
              >
                <Text style={styles.postMenuItemIcon}>
                  <AntDesign name="delete" color="#fff" size={18} />
                </Text>
                <Text style={[styles.postMenuItemText, { color: COLORS.error }]}>
                  Xoá bài viết
                </Text>
              </Pressable>
            </View>
        )}

        <View style={styles.postContent}>
          {post.title && <Text style={styles.postTitle}>{post.title}</Text>}
          {post.caption && <Text style={styles.postCaption}>{post.caption}</Text>}
        </View>

        {(post.likeCount > 0 || post.commentCount > 0) && (
            <View style={styles.postStats}>
              {post.likeCount > 0 && (
                  <View style={styles.postStatItem}>
                    <View style={styles.postLikeIcon}>
                      <Text style={{ fontSize: 10 }}>♥</Text>
                    </View>
                    <Text style={styles.postStatText}>{post.likeCount}</Text>
                  </View>
              )}
              {post.commentCount > 0 && (
                  <Text style={styles.postStatText}>{post.commentCount} bình luận</Text>
              )}
            </View>
        )}

        <View style={styles.postDivider} />

        <View style={styles.postActions}>
          <ActionBtn
              icon={post.likedByCurrentUser ? '♥' : '♡'}
              label={post.likeCount}
              active={post.likedByCurrentUser}
              onPress={() => onLike(post)}
          />
          <ActionBtn
              icon={<FontAwesome name="commenting-o" color={COLORS.glass50} size={18} />}
              label={post.commentCount}
              onPress={() => onComment(post)}
          />
          <ActionBtn icon="↗" label={post.shareCount} onPress={() => onShare(post)} />
        </View>
      </View>
  );
};

// ─── Edit Post Modal ──────────────────────────────────────────────────────────

interface EditPostModalProps {
  visible: boolean;
  post: FeedPost | null;
  onClose: () => void;
  onSave: (title: string, caption: string, visibility: 'PUBLIC' | 'PRIVATE' | 'FOLLOWERS') => Promise<void>;
}

const VISIBILITY_OPTIONS: { value: 'PUBLIC' | 'PRIVATE' | 'FOLLOWERS'; label: string; icon: string }[] = [
  { value: 'PUBLIC',    label: 'Công khai',         icon: '🌐' },
  { value: 'FOLLOWERS', label: 'Người theo dõi',    icon: '👥' },
  { value: 'PRIVATE',   label: 'Riêng tư',          icon: '🔒' },
];

const EditPostModal = ({ visible, post, onClose, onSave }: EditPostModalProps) => {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE' | 'FOLLOWERS'>('PUBLIC');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (post) {
      setTitle(post.title ?? '');
      setCaption(post.caption ?? '');
      setVisibility((post.visibility ?? 'PUBLIC') as 'PUBLIC' | 'PRIVATE' | 'FOLLOWERS');
    }
  }, [post]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(title, caption, visibility);
    } finally {
      setSaving(false);
    }
  };

  return (
      <Modal
          visible={visible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={onClose}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.composeRoot, { paddingTop: insets.top + 4 }]}>
            <View style={styles.composeHeader}>
              <Pressable onPress={onClose} style={styles.composeCancelBtn}>
                <Text style={styles.composeCancelText}>Huỷ</Text>
              </Pressable>
              <Text style={styles.composeHeaderTitle}>Chỉnh sửa bài viết</Text>
              <Pressable
                  style={[styles.composePostBtn, saving && styles.composePostBtnDisabled]}
                  onPress={handleSave}
                  disabled={saving}
              >
                {saving ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                    <Text style={styles.composePostBtnText}>Lưu</Text>
                )}
              </Pressable>
            </View>
            <View style={styles.composeDivider} />
            <ScrollView style={styles.composeBody} keyboardShouldPersistTaps="handled">
              <TextInput
                  style={styles.composeTitleInput}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Tiêu đề..."
                  placeholderTextColor={COLORS.glass25}
                  multiline
                  autoFocus
              />
              <TextInput
                  style={styles.composeCaptionInput}
                  value={caption}
                  onChangeText={setCaption}
                  placeholder="Caption..."
                  placeholderTextColor={COLORS.glass20}
                  multiline
              />
              <View style={styles.visibilityRow}>
                <Text style={styles.visibilityLabel}>Hiển thị:</Text>
                {VISIBILITY_OPTIONS.map(opt => (
                    <Pressable
                        key={opt.value}
                        style={[styles.visibilityChip, visibility === opt.value && styles.visibilityChipActive]}
                        onPress={() => setVisibility(opt.value)}
                    >
                      <Text style={styles.visibilityChipIcon}>{opt.icon}</Text>
                      <Text style={[styles.visibilityChipText, visibility === opt.value && styles.visibilityChipTextActive]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const DiscoverScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { authSession } = useAuth();
  const currentUserId = authSession?.profile?.id ?? null;
  const myDisplayName = authSession?.profile?.fullName ?? authSession?.profile?.email ?? null;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [posting, setPosting] = useState(false);
  const [posts, setPosts] = useState<FeedPost[]>([]);

  const [ownerCache, setOwnerCache] = useState<Record<string, OwnerInfo>>({});
  const ownerCacheRef = useRef<Record<string, OwnerInfo>>({});

  const [composeOpen, setComposeOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<FeedPost | null>(null);

  const [commentPost, setCommentPost] = useState<FeedPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => {
    if (!currentUserId || !myDisplayName) return;
    const mine: OwnerInfo = { displayName: myDisplayName, artistId: null };
    ownerCacheRef.current[currentUserId] = mine;
    setOwnerCache((prev) => ({ ...prev, [currentUserId]: mine }));
  }, [currentUserId, myDisplayName]);

  const fetchOwnerInfos = useCallback(
      async (newPosts: FeedPost[]) => {
        const toFetch = newPosts.filter((p) => !ownerCacheRef.current[p.ownerId]);
        const uniqueIds = [...new Set(toFetch.map((p) => p.ownerId))];
        if (!uniqueIds.length) return;

        const results = await Promise.allSettled(uniqueIds.map((id) => getArtistByUserId(id)));

        const updates: Record<string, OwnerInfo> = {};
        uniqueIds.forEach((id, i) => {
          const res = results[i];
          if (res.status === 'fulfilled' && res.value) {
            updates[id] = {
              displayName: res.value.stageName || res.value.id,
              artistId: res.value.id,
            };
          } else {
            updates[id] = {
              displayName:
                  id === currentUserId
                      ? myDisplayName ?? `User ${id.slice(0, 6)}`
                      : `User ${id.slice(0, 6)}`,
              artistId: null,
            };
          }
        });

        ownerCacheRef.current = { ...ownerCacheRef.current, ...updates };
        setOwnerCache((prev) => ({ ...prev, ...updates }));
      },
      [currentUserId, myDisplayName]
  );

  const getOwnerInfo = useCallback(
      (post: FeedPost): OwnerInfo => {
        if (ownerCache[post.ownerId]) return ownerCache[post.ownerId];
        return {
          displayName:
              post.ownerId === currentUserId
                  ? myDisplayName ?? `User ${post.ownerId.slice(0, 6)}`
                  : post.ownerType === 'ARTIST'
                      ? 'Nghệ sĩ'
                      : `User ${post.ownerId.slice(0, 6)}`,
          artistId: null,
        };
      },
      [ownerCache, currentUserId, myDisplayName]
  );

  const loadFeed = async (mode: 'initial' | 'refresh' | 'silent' = 'initial') => {
    try {
      if (mode === 'initial') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);

      const data = await getTimeline({ page: 0, size: 30 });
      const newPosts = data.content ?? [];
      setPosts(newPosts);
      void fetchOwnerInfos(newPosts);
    } catch {
      if (mode !== 'silent') setPosts([]);
    } finally {
      if (mode === 'initial') setLoading(false);
      if (mode === 'refresh') setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFeed('initial');
    const pollIntervalId = setInterval(() => loadFeed('silent'), 60_000);
    return () => clearInterval(pollIntervalId);
  }, [currentUserId, myDisplayName]);

    useFocusEffect(
        useCallback(() => {
            const fetchData = async () => {
                await loadFeed('silent');
            };
            fetchData();
        }, [])
    );

  const handleCreatePost = async (title: string, caption: string) => {
    setPosting(true);
    try {
      await createFeedPost({
        visibility: 'PUBLIC',
        title,
        caption: caption || undefined,
      });
      setComposeOpen(false);
      await loadFeed('silent');
    } catch (err: any) {
      Alert.alert('Không thể đăng bài', err?.message ?? 'Vui lòng thử lại.');
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (post: FeedPost) => {
    try {
      if (post.likedByCurrentUser) await unlikeFeedPost(post.id);
      else await likeFeedPost(post.id);
      await loadFeed('silent');
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message);
    }
  };

  const handleShare = (post: FeedPost) => {
    Share.share({
      message: `${post.title ?? 'Bài viết âm nhạc'}\nhttps://phazelsound.oopsgolden.id.vn/feed/${post.id}`,
    });
  };

  const handleDelete = (post: FeedPost) => {
    Alert.alert('Xoá bài viết?', 'Hành động này không thể hoàn tác.', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: async () => {
          await deleteFeedPost(post.id);
          await loadFeed('silent');
        },
      },
    ]);
  };

  const handleSaveEdit = async (title: string, caption: string, visibility: 'PUBLIC' | 'PRIVATE' | 'FOLLOWERS') => {
    if (!editingPost) return;
    await updateFeedPost(editingPost.id, {
      visibility,
      title: title.trim(),
      caption: caption.trim() || undefined,
    });
    setEditingPost(null);
    await loadFeed('silent');
  };

  const openComments = async (post: FeedPost) => {
    setCommentPost(post);
    try {
      const data = await getPostComments(post.id, { page: 0, size: 50 });
      setComments(data.content ?? []);
    } catch {
      setComments([]);
    }
  };

  const reloadComments = async () => {
    if (!commentPost) return;
    try {
      const data = await getPostComments(commentPost.id, { page: 0, size: 50 });
      setComments(data.content ?? []);
      await loadFeed('silent');
    } catch {}
  };

  const handleSendComment = async (content: string) => {
    if (!commentPost) return;
    await createPostComment({ postId: commentPost.id, content });
    await reloadComments();
  };

  const handleLikeComment = async (c: Comment) => {
    if (c.likedByCurrentUser) await unlikeComment(c.id);
    else await likeComment(c.id);
    await reloadComments();
  };

  const handleDeleteComment = async (id: string) => {
    await deleteComment(id);
    await reloadComments();
  };

  const handleEditComment = async (id: string, content: string) => {
    await updateComment(id, content);
    await reloadComments();
  };

  return (
      <View style={styles.root}>
        <StatusBar style="light" />

        <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => loadFeed('refresh')}
                  tintColor={COLORS.accent}
              />
            }
            contentContainerStyle={{ paddingBottom: 100 }}
        >
          <LinearGradient
              colors={[COLORS.gradNavy, COLORS.bg]}
              style={[styles.header, { paddingTop: insets.top + 16 }]}
          >
            <View style={styles.headerRow}>
              <Text style={styles.headerTitle}>Khám phá</Text>
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>LIVE</Text>
              </View>
            </View>
            <Text style={styles.headerSub}>Cộng đồng âm nhạc · {posts.length} bài đăng</Text>
          </LinearGradient>

          <View style={styles.composerBar}>
            <Avatar id={myDisplayName ?? 'guest'} displayName={myDisplayName ?? 'guest'} size={40} />
            <Pressable style={styles.composerInput} onPress={() => setComposeOpen(true)}>
              <Text style={styles.composerPlaceholder}>Bạn đang nghĩ gì về âm nhạc?</Text>
            </Pressable>
            <Pressable style={styles.composerIconBtn} onPress={() => setComposeOpen(true)}>
              <Text style={styles.composerIconBtnText}>🎵</Text>
            </Pressable>
          </View>

          <View style={styles.feedDivider} />

          {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={COLORS.accent} />
              </View>
          ) : posts.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyEmoji}>🎵</Text>
                <Text style={styles.emptyTitle}>Chưa có bài đăng nào</Text>
                <Text style={styles.emptySub}>Hãy là người đầu tiên chia sẻ!</Text>
                <Pressable style={styles.emptyBtn} onPress={() => setComposeOpen(true)}>
                  <Text style={styles.emptyBtnText}>Tạo bài viết</Text>
                </Pressable>
              </View>
          ) : (
              posts.map((post) => (
                  <PostCard
                      key={post.id}
                      post={post}
                      currentUserId={currentUserId}
                      ownerInfo={getOwnerInfo(post)}
                      onLike={handleLike}
                      onComment={openComments}
                      onShare={handleShare}
                      onDelete={handleDelete}
                      onEdit={setEditingPost}
                      onViewProfile={(artistId) => navigation.navigate('ArtistProfile', { artistId })}
                  />
              ))
          )}
        </ScrollView>

        <ComposeModal
            visible={composeOpen}
            userId={currentUserId ?? 'guest'}
            displayName={myDisplayName}
            onClose={() => setComposeOpen(false)}
            onPost={handleCreatePost}
            posting={posting}
        />

        <EditPostModal
            visible={!!editingPost}
            post={editingPost}
            onClose={() => setEditingPost(null)}
            onSave={handleSaveEdit}
        />

        <CommentSheet
            visible={!!commentPost}
            post={commentPost}
            comments={comments}
            currentUserId={currentUserId}
            myDisplayName={myDisplayName}
            onClose={() => setCommentPost(null)}
            onSendComment={handleSendComment}
            onLikeComment={handleLikeComment}
            onDeleteComment={handleDeleteComment}
            onEditComment={handleEditComment}
        />
      </View>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { color: COLORS.white, fontSize: 26, fontWeight: '800' },
  headerBadge: {
    backgroundColor: COLORS.error,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  headerBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  headerSub: { color: COLORS.glass40, fontSize: 13, marginTop: 4 },

  composerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    backgroundColor: COLORS.bg,
  },
  composerInput: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.glass10,
  },
  composerPlaceholder: { color: COLORS.glass35, fontSize: 14 },
  composerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.glass10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerIconBtnText: { fontSize: 18 },

  feedDivider: {
    height: 6,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.glass06,
  },

  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: COLORS.white, fontWeight: '700' },

  postCard: {
    backgroundColor: COLORS.bg,
    borderBottomWidth: 6,
    borderBottomColor: COLORS.surface,
    paddingVertical: 12,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 10,
  },
  postMeta: { flex: 1 },
  postOwnerName: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 18,
  },
  postMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  postTime: { color: COLORS.glass40, fontSize: 12 },
  postMetaDot: { color: COLORS.glass25, fontSize: 12 },
  postType: { fontSize: 12 },
  postVisibility: { fontSize: 11 },
  postMenuBtn: { paddingHorizontal: 6, paddingVertical: 4 },
  postMenuIcon: {
    color: COLORS.glass50,
    fontSize: 13,
    letterSpacing: 1,
    fontWeight: '700',
  },

  postMenu: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.glass10,
    overflow: 'hidden',
  },
  postMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  postMenuItemIcon: { fontSize: 16 },
  postMenuItemText: { color: COLORS.white, fontSize: 14, fontWeight: '500' },
  postMenuDivider: { height: 1, backgroundColor: COLORS.glass06 },

  postContent: { paddingHorizontal: 16, marginBottom: 10 },
  postTitle: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
    marginBottom: 4,
  },
  postCaption: {
    color: COLORS.glass80,
    fontSize: 14,
    lineHeight: 20,
  },

  postStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  postStatItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  postLikeIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postStatText: { color: COLORS.glass45, fontSize: 12 },

  postDivider: {
    height: 1,
    backgroundColor: COLORS.glass06,
    marginHorizontal: 16,
    marginBottom: 4,
  },

  postActions: { flexDirection: 'row', paddingHorizontal: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 5,
    borderRadius: 8,
  },
  actionIcon: { color: COLORS.glass50, fontSize: 18 },
  actionLabel: { color: COLORS.glass50, fontSize: 13, fontWeight: '500' },

  loadingWrap: { paddingVertical: 48, alignItems: 'center' },
  emptyWrap: { paddingVertical: 64, alignItems: 'center', paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySub: {
    color: COLORS.glass40,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyBtn: {
    backgroundColor: COLORS.accentDim,
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyBtnText: { color: COLORS.white, fontWeight: '700' },

  composeRoot: { flex: 1, backgroundColor: COLORS.bg },
  composeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  composeCancelBtn: { minWidth: 48 },
  composeCancelText: { color: COLORS.glass60, fontSize: 15 },
  composeHeaderTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  composePostBtn: {
    backgroundColor: COLORS.accentDim,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 8,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composePostBtnDisabled: { opacity: 0.35 },
  composePostBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  composeDivider: { height: 1, backgroundColor: COLORS.glass08 },
  composeUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  composeUserInfo: { flex: 1 },
  composeUserName: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  composeAudienceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    backgroundColor: COLORS.glass08,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: COLORS.glass12,
  },
  composeAudienceIcon: { fontSize: 11 },
  composeAudienceText: { color: COLORS.glass60, fontSize: 12, fontWeight: '600' },
  composeBody: { flex: 1, paddingHorizontal: 16 },
  composeTitleInput: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  composeCaptionInput: {
    color: COLORS.glass70,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 120,
    textAlignVertical: 'top',
    marginTop: 4,
  },
  composeToolbar: {
    borderTopWidth: 1,
    borderTopColor: COLORS.glass08,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  composeToolbarLabel: {
    color: COLORS.glass40,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  composeToolbarIcons: { flexDirection: 'row', gap: 8 },
  composeToolbarIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.glass10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sheetOverlay: { flex: 1, backgroundColor: COLORS.scrim },
  sheetKbWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0, maxHeight: '85%' },
  sheetContainer: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '100%',
    minHeight: 400,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.glass20,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glass08,
  },
  sheetTitle: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  sheetClose: { color: COLORS.glass40, fontSize: 16 },
  sheetList: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },

  noComments: {
    color: COLORS.glass35,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 32,
  },

  commentRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  commentContent: { flex: 1 },
  commentBubble: {
    backgroundColor: COLORS.surfaceLow,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  commentUser: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  commentText: { color: COLORS.glass85, fontSize: 14, lineHeight: 19 },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
    paddingLeft: 4,
  },
  commentTime: { color: COLORS.glass35, fontSize: 11 },
  commentLike: { color: COLORS.glass45, fontSize: 12, fontWeight: '600' },
  commentAction: { color: COLORS.glass45, fontSize: 12, fontWeight: '600' },

  commentEditRow: { gap: 8 },
  commentEditInput: {
    backgroundColor: COLORS.surfaceLow,
    borderRadius: 12,
    padding: 10,
    color: COLORS.white,
    fontSize: 14,
    borderWidth: 1,
    borderColor: COLORS.accentBorder25,
  },
  commentEditActions: { flexDirection: 'row', gap: 16, paddingLeft: 4 },
  commentEditCancel: { color: COLORS.glass45, fontSize: 12, fontWeight: '600' },
  commentEditSave: { color: COLORS.accent, fontSize: 12, fontWeight: '700' },

  commentInputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.glass08,
    gap: 10,
  },
  commentInputWrap: {
    flex: 1,
    backgroundColor: COLORS.surfaceLow,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.glass10,
    minHeight: 38,
    justifyContent: 'center',
  },
  commentInput: {
    color: COLORS.white,
    fontSize: 14,
    maxHeight: 100,
    lineHeight: 19,
  },
  commentSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
  },

  visibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.glass08,
    marginTop: 12,
  },
  visibilityLabel: { color: COLORS.glass50, fontSize: 13, fontWeight: '600', marginRight: 4 },
  visibilityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: COLORS.glass08,
    borderWidth: 1,
    borderColor: COLORS.glass12,
  },
  visibilityChipActive: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentFill20,
  },
  visibilityChipIcon: { fontSize: 13 },
  visibilityChipText: { color: COLORS.glass60, fontSize: 12, fontWeight: '600' },
  visibilityChipTextActive: { color: COLORS.accent },
});