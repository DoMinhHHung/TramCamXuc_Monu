import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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

import { COLORS, useThemeColors } from '../../config/colors';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LocalizationContext';
import {
  Comment,
  createFeedPost,
  createPostComment,
  deleteComment,
  deleteFeedPost,
  FeedPost,
  getCommentReplies,
  getPostComments,
  getTimeline,
  likeComment,
  likeFeedPost,
  unlikeComment,
  unlikeFeedPost,
  updateComment,
  updateFeedPost,
  getArtistByUserId,
  getMyFollowedArtists,
} from '../../services/social';
import {Song, getAlbumById, getMyAlbumById, getPlaylistById, getSongById, getSongsByIds, getPlaylistBySlug} from '../../services/music';
import { usePlayer } from '../../context/PlayerContext';

interface OwnerInfo {
  displayName: string;
  artistId: string | null;
  avatarUrl?: string;
}
let tr = (key: string, fallback?: string) => fallback ?? key;
let rc = COLORS;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const timeAgo = (iso: string): string => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.floor(diffMs / 60_000));
  if (mins < 60) return `${mins} ${tr('screens.history.minutesAgoSuffix', 'min ago')}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ${tr('screens.history.hoursAgoSuffix', 'hours ago')}`;
  return `${Math.floor(hours / 24)} ${tr('screens.history.daysAgoSuffix', 'days ago')}`;
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
                  avatarUrl,
                }: {
  id: string;
  displayName?: string;
  size?: number;
  avatarUrl?: string;
}) => {
  const colors = getAvatarColors(id);
  return (
      <LinearGradient
          colors={colors}
          style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
      >
        {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} />
        ) : (
            <Text style={[styles.avatarText, { fontSize: size * 0.34 }]}>
              {getInitials(displayName ?? id)}
            </Text>
        )}
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
  onPost: (title: string, caption: string, visibility: 'PUBLIC' | 'PRIVATE' | 'FOLLOWERS_ONLY') => Promise<void>;
  posting: boolean;
}

const VISIBILITY_OPTIONS: { value: 'PUBLIC' | 'PRIVATE' | 'FOLLOWERS_ONLY'; label: string; icon: string }[] = [
  { value: 'PUBLIC',    label: 'Công khai',         icon: '🌐' },
  { value: 'FOLLOWERS_ONLY', label: 'Người theo dõi',    icon: '👥' },
  { value: 'PRIVATE',   label: 'Riêng tư',          icon: '🔒' },
];

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
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE' | 'FOLLOWERS_ONLY'>('PUBLIC');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      const t = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(t);
    } else {
      setTitle('');
      setCaption('');
      setVisibility('PUBLIC');
    }
  }, [visible]);

  const canPost = title.trim().length > 0;

  const handlePost = async () => {
    if (!canPost || posting) return;
    await onPost(title.trim(), caption.trim(), visibility);
    setTitle('');
    setCaption('');
    setVisibility('PUBLIC');
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
                  <Text style={styles.composeAudienceIcon}>{VISIBILITY_OPTIONS.find(v => v.value === visibility)?.icon ?? '🌐'}</Text>
                  <Text style={styles.composeAudienceText}>
                    {VISIBILITY_OPTIONS.find(v => v.value === visibility)?.label ?? 'Công khai'}
                  </Text>
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
  onSendComment: (content: string, parentId?: string) => Promise<void>;
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
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [replies, setReplies] = useState<Record<string, Comment[]>>({});
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const [loadingReplies, setLoadingReplies] = useState<Record<string, boolean>>({});

  const loadCommentAuthors = useCallback(async () => {
    if (!currentUserId) return;

    const allComments: Comment[] = [
      ...comments,
      ...Object.values(replies).flat(),
    ];

    if (!allComments.length) return;

    const missingIds = allComments
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
  }, [comments, replies, currentUserId, commentAuthorCache]);

  useEffect(() => {
    loadCommentAuthors();
  }, [loadCommentAuthors]);

  const loadReplies = useCallback(async (parentId: string) => {
    setLoadingReplies((prev) => ({ ...prev, [parentId]: true }));
    try {
      const res = await getCommentReplies(parentId, { page: 0, size: 50 });
      const fetched = res.content ?? [];
      setReplies((prev) => ({ ...prev, [parentId]: fetched }));
      setExpandedReplies((prev) => ({ ...prev, [parentId]: true }));
      const newNames: Record<string, string> = {};
      fetched.forEach((c) => {
        if (c.userId && !commentAuthorCache[c.userId]) newNames[c.userId] = c.userId.slice(0, 8);
      });
      if (Object.keys(newNames).length) setCommentAuthorCache((prev) => ({ ...prev, ...newNames }));
    } catch (err) {
      console.warn('Lỗi tải replies', err);
    } finally {
      setLoadingReplies((prev) => ({ ...prev, [parentId]: false }));
    }
  }, [commentAuthorCache]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    const parentId = replyingTo?.id;
    try {
      await onSendComment(text.trim(), parentId);
      setText('');
      if (parentId) {
        await loadReplies(parentId);
      }
      setReplyingTo(null);
    } finally {
      setSending(false);
    }
  };

  const handleEdit = async (id: string, parentId?: string) => {
    if (!editingText.trim()) return;
    await onEditComment(id, editingText.trim());
    setEditingId(null);
    if (parentId) await loadReplies(parentId);
  };

  const replyingToLabel = replyingTo
      ? replyingTo.userId === currentUserId
          ? myDisplayName || tr('screens.profile.myProfile', 'You')
          : commentAuthorCache[replyingTo.userId] || replyingTo.userId.slice(0, 8)
      : null;

  const renderCommentNode = useCallback((comment: Comment, depth = 0): React.ReactNode => {
    const isOwn = comment.userId === currentUserId;
    const displayName = isOwn
        ? myDisplayName || tr('screens.profile.myProfile', 'You')
        : commentAuthorCache[comment.userId] || comment.userId.slice(0, 8);

    const childReplies = replies[comment.id] ?? [];
    const isExpanded = expandedReplies[comment.id];
    const isLoadingReplies = loadingReplies[comment.id];
    const indent = Math.min(depth, 5) * 10;

    return (
        <View key={`${comment.id}-${depth}`} style={[depth === 0 ? styles.commentRow : styles.replyRow, depth > 0 && { marginLeft: indent }]}>
          <Avatar id={comment.userId} displayName={displayName} size={depth === 0 ? 34 : 30} />

          <View style={styles.commentContent}>
            {editingId === comment.id ? (
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
                    <Pressable onPress={() => handleEdit(comment.id, comment.parentId)}>
                      <Text style={styles.commentEditSave}>Lưu</Text>
                    </Pressable>
                  </View>
                </View>
            ) : (
                <>
                  <View style={styles.commentBubble}>
                    <Text style={styles.commentUser}>{displayName}</Text>
                    <Text style={styles.commentText}>{comment.content}</Text>
                  </View>

                  <View style={styles.commentMeta}>
                    <Text style={styles.commentTime}>{timeAgo(comment.createdAt)}</Text>

                    <Pressable onPress={() => onLikeComment(comment)} hitSlop={8}>
                      <Text
                          style={[
                            styles.commentLike,
                            comment.likedByCurrentUser && { color: COLORS.accent },
                          ]}
                      >
                        {comment.likedByCurrentUser ? '♥' : '♡'}
                        {comment.likeCount > 0 ? ` ${comment.likeCount}` : ''}
                      </Text>
                    </Pressable>

                    <Pressable
                        onPress={() => {
                          setReplyingTo(comment);
                          setTimeout(() => inputRef.current?.focus(), 50);
                        }}
                        hitSlop={8}
                    >
                      <Text style={styles.commentAction}>Trả lời</Text>
                    </Pressable>

                    {isOwn && (
                        <>
                          <Pressable
                              onPress={() => {
                                setEditingId(comment.id);
                                setEditingText(comment.content);
                              }}
                              hitSlop={8}
                          >
                            <Text style={styles.commentAction}>Sửa</Text>
                          </Pressable>
                          <Pressable
                              onPress={async () => {
                                await onDeleteComment(comment.id);
                                if (comment.parentId) await loadReplies(comment.parentId);
                              }}
                              hitSlop={8}
                          >
                            <Text style={[styles.commentAction, { color: COLORS.error }]}>Xoá</Text>
                          </Pressable>
                        </>
                    )}
                  </View>

                  {comment.replyCount > 0 && (
                      <Pressable
                          style={styles.replyToggle}
                          onPress={() => {
                            if (isExpanded) {
                              setExpandedReplies((prev) => ({ ...prev, [comment.id]: false }));
                            } else {
                              void loadReplies(comment.id);
                            }
                          }}
                      >
                        <Text style={styles.replyToggleText}>
                          {isExpanded ? 'Ẩn trả lời' : `Xem ${comment.replyCount} trả lời`}
                        </Text>
                      </Pressable>
                  )}

                  {isExpanded && (
                      <View style={styles.replyList}>
                        {isLoadingReplies ? (
                            <ActivityIndicator color={COLORS.accent} size="small" />
                        ) : (
                            childReplies.map((reply) => renderCommentNode(reply, depth + 1))
                        )}
                      </View>
                  )}
                </>
            )}
          </View>
        </View>
    );
  }, [
    currentUserId,
    myDisplayName,
    commentAuthorCache,
    replies,
    expandedReplies,
    loadingReplies,
    editingId,
    editingText,
    onLikeComment,
    onDeleteComment,
    loadReplies,
    handleEdit,
  ]);

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

              {comments.map((comment) => renderCommentNode(comment, 0))}

              <View style={{ height: 16 }} />
            </ScrollView>

            {replyingToLabel && (
                <View style={styles.replyingToBar}>
                  <Text style={styles.replyingToText}>Đang trả lời {replyingToLabel}</Text>
                  <Pressable onPress={() => { setReplyingTo(null); setText(''); }} hitSlop={8}>
                    <Text style={styles.replyingToCancel}>Huỷ</Text>
                  </Pressable>
                </View>
            )}

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
                    placeholder={replyingToLabel ? `Trả lời ${replyingToLabel}...` : 'Viết bình luận...'}
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
                <Ionicons name="send-sharp" color={rc.bg} size={24} />
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
  contentInfo?: PostContentInfo | null;
  onOpenContent?: (content: PostContentInfo) => void;
  onLike: (post: FeedPost) => void;
  onComment: (post: FeedPost) => void;
  onShare: (post: FeedPost) => void;
  onDelete: (post: FeedPost) => void;
  onEdit: (post: FeedPost) => void;
  onViewProfile: (artistId: string) => void;
}

interface PostContentInfo {
  type: 'SONG' | 'ALBUM' | 'PLAYLIST';
  id: string;
  slug?: string;
  title: string;
  subtitle?: string;
  coverUrl?: string;
  songs: Song[];
  totalCount?: number;
}

const PostCard = ({
                    post,
                    currentUserId,
                    ownerInfo,
                    contentInfo,
                    onOpenContent,
                    onLike,
                    onComment,
                    onShare,
                    onDelete,
                    onEdit,
                    onViewProfile,
                  }: PostCardProps) => {
  const isOwner = currentUserId === post.ownerId;
  const [menuOpen, setMenuOpen] = useState(false);
  const { playSong } = usePlayer();

  const visibilityBadge = (() => {
    if (post.visibility === 'PRIVATE') return { icon: '🔒', label: tr('screens.discover.private', 'Private') };
    if (post.visibility === 'FOLLOWERS_ONLY') return { icon: '👥', label: tr('screens.discover.followersOnly', 'Followers only') };
    return { icon: '🌐', label: tr('screens.discover.public', 'Public') };
  })();

  const handleNamePress = async () => {
    console.log('Post owner tapped', { ownerId: post.ownerId, cachedArtistId: ownerInfo.artistId });
    if (ownerInfo.artistId) {
      onViewProfile(ownerInfo.artistId);
      return;
    }

    try {
      const resolved = await getArtistByUserId(post.ownerId);
      console.log('Resolved artist from userId', { resolved });
      if (resolved?.id) {
        onViewProfile(resolved.id);
      } else {
        Alert.alert('Không có hồ sơ nghệ sĩ', 'Người dùng này chưa đăng ký Nghệ sĩ.');
      }
    } catch {
      /* no-op */
    }
  };

  return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <Pressable onPress={() => { void handleNamePress(); }}>
            <Avatar id={post.ownerId} displayName={ownerInfo.displayName} avatarUrl={ownerInfo.avatarUrl} size={42} />
          </Pressable>
          <View style={styles.postMeta}>
            <Pressable onPress={() => { void handleNamePress(); }}>
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
              <View style={styles.postVisibilityBadge}>
                <Text style={styles.postVisibilityIcon}>{visibilityBadge.icon}</Text>
                <Text style={styles.postVisibilityText}>{visibilityBadge.label}</Text>
              </View>
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
                  <FontAwesome name="edit" color={COLORS.accentAlt} size={18} />
                </Text>
                <Text style={styles.postMenuItemText}>{tr('screens.discover.editPost', 'Edit post')}</Text>
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
                  <AntDesign name="delete" color={COLORS.white} size={18} />
                </Text>
                <Text style={[styles.postMenuItemText, { color: COLORS.error }]}>
                  {tr('screens.discover.deletePost', 'Delete post')}
                </Text>
              </Pressable>
            </View>
        )}

        <View style={styles.postContent}>
          {post.title && <Text style={styles.postTitle}>{post.title}</Text>}
          {post.caption && <Text style={styles.postCaption}>{post.caption}</Text>}
          {contentInfo && (
              <Pressable
                  style={styles.contentCard}
                  onPress={() => {
                    if (contentInfo.type === 'PLAYLIST' || contentInfo.type === 'ALBUM') {
                      if (onOpenContent) onOpenContent(contentInfo);
                      return;
                    }
                    const first = contentInfo.songs?.[0];
                    if (first) playSong(first, contentInfo.songs);
                  }}
              >
                <View style={styles.contentCardHeader}>
                  <Image
                      source={{ uri: contentInfo.coverUrl || post.coverImageUrl || 'https://via.placeholder.com/120' }}
                      style={styles.contentCover}
                  />
                  <View style={styles.contentMeta}>
                    <Text style={styles.contentTitle}>{contentInfo.title}</Text>
                    {contentInfo.subtitle ? (
                        <Text style={styles.contentSubtitle}>{contentInfo.subtitle}</Text>
                    ) : null}
                    <Text style={styles.contentBadge}>
                      {contentInfo.type === 'SONG' ? tr('labels.song', 'Song') : contentInfo.type === 'ALBUM' ? tr('labels.album', 'Album') : tr('labels.playlist', 'Playlist')}
                      {contentInfo.totalCount ? ` · ${contentInfo.totalCount} ${tr('screens.library.songsSuffix', 'songs')}` : ''}
                    </Text>
                  </View>
                </View>

                {(contentInfo.type === 'SONG' || contentInfo.type === 'ALBUM' || contentInfo.type === 'PLAYLIST') && contentInfo.songs?.length ? (
                    <View style={styles.contentTracks}>
                      {(contentInfo.type === 'SONG' ? contentInfo.songs : contentInfo.songs.slice(0, 3)).map((s, idx) => (
                          <Pressable
                              key={`${post.id}-${contentInfo.type}-${s.id ?? 'song'}-${idx}`}
                              style={styles.trackRow}
                              onPress={() => {
                                if (contentInfo.type === 'PLAYLIST' || contentInfo.type === 'ALBUM') return;
                                playSong(s, contentInfo.songs);
                              }}
                          >
                            <View style={styles.trackInfo}>
                              <Text style={styles.trackTitle} numberOfLines={1}>{s.title}</Text>
                              <Text style={styles.trackArtist} numberOfLines={1}>{s.primaryArtist?.stageName ?? tr('labels.artist', 'Artist')}</Text>
                            </View>
                            {contentInfo.type !== 'PLAYLIST' && contentInfo.type !== 'ALBUM' && <Text style={styles.trackPlay}>▶</Text>}
                          </Pressable>
                      ))}
                      {(contentInfo.type === 'ALBUM' || contentInfo.type === 'PLAYLIST') && contentInfo.totalCount && contentInfo.totalCount > 3 ? (
                          <Text style={styles.trackMore}>+ {contentInfo.totalCount - 3} {tr('screens.discover.moreSongs', 'more songs')}</Text>
                      ) : null}
                    </View>
                ) : null}
              </Pressable>
          )}
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
                  <Text style={styles.postStatText}>{post.commentCount} {tr('screens.discover.comments', 'comments')}</Text>
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
  onSave: (title: string, caption: string, visibility: 'PUBLIC' | 'PRIVATE' | 'FOLLOWERS_ONLY') => Promise<void>;
}


const EditPostModal = ({ visible, post, onClose, onSave }: EditPostModalProps) => {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE' | 'FOLLOWERS_ONLY'>('PUBLIC');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (post) {
      setTitle(post.title ?? '');
      setCaption(post.caption ?? '');
      setVisibility((post.visibility ?? 'PUBLIC') as 'PUBLIC' | 'PRIVATE' | 'FOLLOWERS_ONLY');
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
              <Text style={styles.composeHeaderTitle}>{tr('screens.discover.editPost', 'Edit post')}</Text>
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

interface SharedContentDetailModalProps {
  visible: boolean;
  content: PostContentInfo | null;
  onClose: () => void;
}

const SharedContentDetailModal = ({ visible, content, onClose }: SharedContentDetailModalProps) => {
  const insets = useSafeAreaInsets();
  const { playSong, currentSong } = usePlayer();

  if (!content) return null;

  return (
      <Modal
          visible={visible}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={onClose}
      >
        <View style={styles.root}>
          <View style={[styles.detailHeader, { paddingTop: insets.top + 6 }]}> 
            <Pressable style={styles.detailBackBtn} onPress={onClose}>
              <Ionicons name="arrow-back" size={22} color={COLORS.white} />
              <Text style={styles.detailBackText}>Quay lại</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.detailBody} showsVerticalScrollIndicator={false}>
            <Image
                source={{ uri: content.coverUrl || 'https://via.placeholder.com/240' }}
                style={styles.detailCover}
            />
            <Text style={styles.detailTitle}>{content.title}</Text>
            <Text style={styles.detailType}>
              {content.type === 'ALBUM' ? 'Album' : 'Playlist'}
              {content.totalCount ? ` · ${content.totalCount} ${tr('screens.library.songsSuffix', 'songs')}` : ''}
            </Text>
            {content.subtitle ? <Text style={styles.detailSubtitle}>{content.subtitle}</Text> : null}

            {content.songs && content.songs.length > 0 ? (
                <View style={styles.detailTracks}>
                    {content.songs.map((song, index) => {
                    const isCurrentSongPlaying = currentSong?.id === song.id;
                    return (
                      <Pressable
                        key={`${song.id}-${index}`}
                        style={[styles.detailTrackRow, isCurrentSongPlaying && styles.detailTrackRowActive]}
                          onPress={() => playSong(song, content.songs)}
                        >
                        <Text style={styles.detailTrackIndex}>{index + 1}</Text>
                        <View style={styles.detailTrackInfo}>
                          <Text style={[styles.detailTrackTitle, isCurrentSongPlaying && styles.detailTrackTitleActive]} numberOfLines={1}>
                            {song.title}
                          </Text>
                          <Text style={styles.detailTrackArtist} numberOfLines={1}>{song.primaryArtist?.stageName ?? tr('labels.artist', 'Artist')}</Text>
                        </View>
                        <Ionicons name={isCurrentSongPlaying ? 'pause' : 'play'} size={18} color={isCurrentSongPlaying ? COLORS.accent : COLORS.glass60} />
                        </Pressable>
                    );
                  })}
                </View>
            ) : (
                <Text style={styles.trackEmpty}>{tr('screens.discover.noSongsToPlay', 'No songs to play')}</Text>
            )}
          </ScrollView>
        </View>
      </Modal>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const DiscoverScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const themeColors = useThemeColors();
  tr = t;
  rc = themeColors;
  const { authSession } = useAuth();
  const currentUserId = authSession?.profile?.id ?? null;
  const myDisplayName = authSession?.profile?.fullName ?? authSession?.profile?.email ?? null;
  const myAvatarUrl = authSession?.profile?.avatarUrl;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [posting, setPosting] = useState(false);
  const [posts, setPosts] = useState<FeedPost[]>([]);

  const [ownerCache, setOwnerCache] = useState<Record<string, OwnerInfo>>({});
  const ownerCacheRef = useRef<Record<string, OwnerInfo>>({});

  const [followedArtistIds, setFollowedArtistIds] = useState<Set<string>>(new Set());

  const [contentCache, setContentCache] = useState<Record<string, PostContentInfo>>({});
  const contentLoadingRef = useRef<Set<string>>(new Set());

  const [composeOpen, setComposeOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<FeedPost | null>(null);

  const [commentPost, setCommentPost] = useState<FeedPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [openedContent, setOpenedContent] = useState<PostContentInfo | null>(null);

  useEffect(() => {
    if (!currentUserId || !myDisplayName) return;
    const mine: OwnerInfo = { displayName: myDisplayName, artistId: null, avatarUrl: myAvatarUrl ?? undefined };
    ownerCacheRef.current[currentUserId] = mine;
    setOwnerCache((prev) => ({ ...prev, [currentUserId]: mine }));
  }, [currentUserId, myDisplayName, myAvatarUrl]);

  useEffect(() => {
    const loadFollowed = async () => {
      try {
        const res = await getMyFollowedArtists({ page: 0, size: 200 });
        const ids = new Set((res.content ?? []).map((f) => f.artistId));
        setFollowedArtistIds(ids);
      } catch {
        setFollowedArtistIds(new Set());
      }
    };
    void loadFollowed();
  }, []);

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
              avatarUrl: res.value.avatarUrl,
            };
          } else {
            updates[id] = {
              displayName:
                  id === currentUserId
                      ? myDisplayName ?? `User ${id.slice(0, 6)}`
                      : `User ${id.slice(0, 6)}`,
              artistId: null,
              avatarUrl: undefined,
            };
          }
        });

        ownerCacheRef.current = { ...ownerCacheRef.current, ...updates };
        setOwnerCache((prev) => ({ ...prev, ...updates }));
      },
      [currentUserId, myDisplayName]
  );

  const loadContentForPost = useCallback(async (post: FeedPost) => {
    if (!post.contentId) return;
    const key = `${post.id}:${post.contentType}:${post.contentId}`;
    if (contentCache[key] || contentLoadingRef.current.has(key)) return;

    contentLoadingRef.current.add(key);
    try {
      if (post.contentType === 'SONG') {
        const song = await getSongById(post.contentId);
        const info: PostContentInfo = {
          type: 'SONG',
          id: song.id,
          title: song.title,
          subtitle: song.primaryArtist?.stageName,
          coverUrl: song.thumbnailUrl,
          songs: [song],
          totalCount: 1,
        };
        setContentCache((prev) => ({ ...prev, [key]: info }));
        return;
      }

      if (post.contentType === 'ALBUM') {
        let album = null;
        try {
          album = await getAlbumById(post.contentId);
        } catch {
          if (post.ownerId === currentUserId) {
            album = await getMyAlbumById(post.contentId);
          }
        }

        if (!album) throw new Error('Album not found');

        const info: PostContentInfo = {
          type: 'ALBUM',
          id: album.id,
          title: album.title,
          subtitle: album.description,
          coverUrl: album.coverUrl,
          songs: album.songs ?? [],
          totalCount: album.songs?.length,
        };
        setContentCache((prev) => ({ ...prev, [key]: info }));
        return;
      }

      if (post.contentType === 'PLAYLIST') {
        let playlist = null;
        try {
          playlist = await getPlaylistById(post.contentId);
        } catch (err) {
          // Một số API dùng slug, thử lại bằng slug nếu fetch theo id thất bại
          try {
            playlist = await getPlaylistBySlug(post.contentId);
          } catch (err2) {
            throw err2;
          }
        }

        if (!playlist) throw new Error('Playlist not found');

        const playlistSongs = playlist.songs ?? [];
        const songIds = playlistSongs.map((s) => s.songId).filter(Boolean) as string[];
        let songs: Song[] = [];

        if (songIds.length) {
          try {
            songs = await getSongsByIds(songIds.slice(0, 50));
          } catch {
            songs = [];
          }
        }

        if (!songs.length && playlistSongs.length) {
          songs = playlistSongs.map((s) => ({
            id: s.songId || s.playlistSongId,
            title: s.title,
            primaryArtist: { artistId: s.artistId || '', stageName: s.artistStageName || tr('labels.artist', 'Artist') },
            genres: [],
            durationSeconds: s.durationSeconds || 0,
            playCount: s.playCount || 0,
            status: 'PUBLIC',
            transcodeStatus: 'COMPLETED',
            thumbnailUrl: s.thumbnailUrl,
            createdAt: '',
            updatedAt: '',
          }));
        }

        const info: PostContentInfo = {
          type: 'PLAYLIST',
          id: playlist.id,
          slug: playlist.slug,
          title: playlist.name,
          subtitle: playlist.description,
          coverUrl: playlist.coverUrl,
          songs,
          totalCount: playlist.totalSongs ?? playlist.songs?.length ?? songs.length,
        };
        setContentCache((prev) => ({ ...prev, [key]: info }));
        return;
      }
    } catch (err) {
      console.warn(tr('screens.discover.sharedContentLoadFailed', 'Unable to load shared content'), { postId: post.id, err });
      setContentCache((prev) => ({ ...prev, [key]: { type: post.contentType as any, id: post.contentId ?? key, title: post.title ?? tr('screens.discover.contentDeleted', 'Content deleted'), songs: [] } }));
    } finally {
      contentLoadingRef.current.delete(key);
    }
  }, [contentCache, currentUserId]);

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
          avatarUrl: undefined,
        };
      },
      [ownerCache, currentUserId, myDisplayName]
  );

  const getContentInfo = useCallback(
      (post: FeedPost): PostContentInfo | null => {
        if (!post.contentId) return null;
        const key = `${post.id}:${post.contentType}:${post.contentId}`;
        return contentCache[key] ?? null;
      },
      [contentCache]
  );



  const { getPublicFeed } = require('../../services/social');
  const loadFeed = async (mode: 'initial' | 'refresh' | 'silent' = 'initial') => {
    try {
      if (mode === 'initial') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);

      const data = await getPublicFeed({ page: 0, size: 30 });
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

  useEffect(() => {
    posts.forEach((p) => { void loadContentForPost(p); });
  }, [posts, loadContentForPost]);

    useFocusEffect(
        useCallback(() => {
            const fetchData = async () => {
                await loadFeed('silent');
            };
            fetchData();
        }, [])
    );

  const handleCreatePost = async (title: string, caption: string, visibility: 'PUBLIC' | 'PRIVATE' | 'FOLLOWERS_ONLY') => {
    setPosting(true);
    try {
      await createFeedPost({
        visibility,
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
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteFeedPost(post.id);
            setPosts((prev) => prev.filter((p) => p.id !== post.id));
            await loadFeed('silent');
          } catch (err: any) {
            Alert.alert(t('screens.discover.cannotDeletePost', 'Cannot delete post'), err?.response?.data?.message || err?.message || t('errors.tryAgain', 'Please try again.'));
          }
        },
      },
    ]);
  };

  const handleSaveEdit = async (title: string, caption: string, visibility: 'PUBLIC' | 'PRIVATE' | 'FOLLOWERS_ONLY') => {
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

  const handleSendComment = async (content: string, parentId?: string) => {
    if (!commentPost) return;
    await createPostComment({ postId: commentPost.id, content, parentId });
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
              colors={[themeColors.gradNavy, themeColors.bg]}
              style={[styles.header, { paddingTop: insets.top + 16 }]}
          >
            <View style={styles.headerRow}>
              <Text style={styles.headerTitle}>{t('screens.discover.title', 'Discover')}</Text>
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>{t('screens.discover.liveBadge', 'LIVE')}</Text>
              </View>
            </View>
            <Text style={styles.headerSub}>{t('screens.discover.communityLabel', 'Music community')} · {posts.length} {t('screens.discover.posts', 'posts')}</Text>
          </LinearGradient>

          <View style={styles.composerBar}>
            <Avatar id={myDisplayName ?? 'guest'} displayName={myDisplayName ?? 'guest'} avatarUrl={myAvatarUrl} size={40} />
            <Pressable style={styles.composerInput} onPress={() => setComposeOpen(true)}>
              <Text style={styles.composerPlaceholder}>{t('screens.discover.composerPlaceholder', 'What are you thinking about music today?')}</Text>
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
                <Text style={styles.emptyTitle}>{t('screens.discover.noPosts', 'No posts yet')}</Text>
                <Text style={styles.emptySub}>{t('screens.discover.beFirstToShare', 'Be the first to share!')}</Text>
                <Pressable style={styles.emptyBtn} onPress={() => setComposeOpen(true)}>
                  <Text style={styles.emptyBtnText}>{t('screens.discover.createPost', 'Create post')}</Text>
                </Pressable>
              </View>
          ) : (
              posts.map((post) => (
                  <PostCard
                      key={post.id}
                      post={post}
                      currentUserId={currentUserId}
                      ownerInfo={getOwnerInfo(post)}
                      contentInfo={getContentInfo(post)}
                      onOpenContent={setOpenedContent}
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

        <SharedContentDetailModal
            visible={!!openedContent}
            content={openedContent}
            onClose={() => setOpenedContent(null)}
        />
      </View>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  detailHeader: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glass08,
  },
  detailBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  detailBackText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  detailBody: { paddingHorizontal: 18, paddingBottom: 34, paddingTop: 14 },
  detailCover: {
    width: 220,
    height: 220,
    borderRadius: 14,
    alignSelf: 'center',
    marginBottom: 14,
    backgroundColor: COLORS.glass08,
  },
  detailTitle: { color: COLORS.white, fontSize: 24, fontWeight: '800', textAlign: 'center' },
  detailType: { color: COLORS.glass60, fontSize: 14, textAlign: 'center', marginTop: 4 },
  detailSubtitle: { color: COLORS.glass70, fontSize: 14, textAlign: 'center', marginTop: 10 },
  detailTracks: { marginTop: 18, gap: 8 },
  detailTrackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.glass08,
  },
  detailTrackIndex: { color: COLORS.glass60, width: 20, textAlign: 'center', fontWeight: '700' },
  detailTrackInfo: { flex: 1 },
  detailTrackTitle: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  detailTrackArtist: { color: COLORS.glass60, fontSize: 12, marginTop: 2 },
  detailTrackRowActive: {
    backgroundColor: COLORS.accentFill20,
    borderWidth: 1,
    borderColor: COLORS.accentBorder25,
  },
  detailTrackTitleActive: {
    color: COLORS.accent,
  },

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
  postVisibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.glass08,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  postVisibilityIcon: { fontSize: 12 },
  postVisibilityText: { color: COLORS.glass40, fontSize: 11, fontWeight: '600' },
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
  contentCard: {
    marginTop: 10,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.glass08,
    padding: 10,
    gap: 10,
  },
  contentCardHeader: { flexDirection: 'row', gap: 10 },
  contentCover: { width: 68, height: 68, borderRadius: 12, backgroundColor: COLORS.glass06 },
  contentMeta: { flex: 1, gap: 4, justifyContent: 'center' },
  contentTitle: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  contentSubtitle: { color: COLORS.glass70, fontSize: 13 },
  contentBadge: { color: COLORS.accent, fontSize: 12, fontWeight: '700' },
  contentTracks: { gap: 8 },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingVertical: 6,
    backgroundColor: COLORS.surfaceLow,
    borderRadius: 10,
  },
  trackInfo: { flex: 1, marginRight: 8 },
  trackTitle: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  trackArtist: { color: COLORS.glass60, fontSize: 12, marginTop: 2 },
  trackPlay: { color: COLORS.accent, fontSize: 16, fontWeight: '800' },
  trackMore: { color: COLORS.glass50, fontSize: 12, marginLeft: 6 },
  trackEmpty: { color: COLORS.glass45, fontSize: 12 },

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
  commentContent: { flex: 1, gap: 6 },
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
  replyToggle: { marginTop: 4, paddingHorizontal: 4 },
  replyToggleText: { color: COLORS.accent, fontSize: 12, fontWeight: '600' },
  replyList: { marginTop: 8, marginLeft: 10, gap: 10 },
  replyRow: { flexDirection: 'row', gap: 8 },
  replyContent: { flex: 1, gap: 4 },

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

  replyingToBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: COLORS.surfaceLow,
    borderTopWidth: 1,
    borderTopColor: COLORS.glass08,
  },
  replyingToText: { color: COLORS.glass40, fontSize: 12 },
  replyingToCancel: { color: COLORS.accent, fontSize: 12, fontWeight: '600' },

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
