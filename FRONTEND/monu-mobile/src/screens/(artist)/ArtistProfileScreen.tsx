import React, { useCallback, useEffect, useState } from 'react';
import {
    ActionSheetIOS,
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '../../config/colors';
import { BackButton } from '../../components/BackButton';
import { SongCard } from '../../components/SongCard';
import { usePlayer } from '../../context/PlayerContext';
import { useAuth } from '../../context/AuthContext';
import { Album, Song, getSongsByArtist } from '../../services/music';
import { FeedPost, getTimeline } from '../../services/social';
import { apiClient } from '../../services/api';
import { FollowButton } from '../../components/FollowButton';
import { updateFeedPost, deleteFeedPost } from '../../services/social';
import {FontAwesome} from "@expo/vector-icons";
// ─── Types ────────────────────────────────────────────────────────────────────

interface ArtistDetail {
    id: string;
    stageName: string;
    bio?: string;
    avatarUrl?: string;
    status: 'ACTIVE' | 'PENDING' | 'BANNED' | 'REJECTED';
    userId?: string;
}

type Tab = 'songs' | 'albums' | 'feed';

const tabConfig: { key: Tab; label: string; icon: string }[] = [
    { key: 'songs',  label: 'Bài hát', icon: '🎵' },
    { key: 'albums', label: 'Album',   icon: '💿' },
    { key: 'feed',   label: 'Feed',    icon: '📝' },
];


// ─── FeedPostCard ─────────────────────────────────────────────────────────────

interface FeedPostCardProps {
    post: FeedPost;
    isOwnProfile: boolean;
    onDeleted: (id: string) => void;
    onUpdated: (id: string, caption: string) => void;
}

const FeedPostCard = ({ post, isOwnProfile, onDeleted, onUpdated }: FeedPostCardProps) => {
    const [editVisible, setEditVisible] = React.useState(false);
    const [caption, setCaption]         = React.useState(post.caption ?? '');
    const [saving, setSaving]           = React.useState(false);

    const timeAgo = (iso: string) => {
        const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
        if (diff < 60) return `${Math.max(1, diff)} phút`;
        if (diff < 1440) return `${Math.floor(diff / 60)} giờ`;
        return `${Math.floor(diff / 1440)} ngày`;
    };

    const openMenu = () => {
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                { options: ['Huỷ', 'Chỉnh sửa', 'Xóa bài viết'], destructiveButtonIndex: 2, cancelButtonIndex: 0 },
                (idx) => {
                    if (idx === 1) { setCaption(post.caption ?? ''); setEditVisible(true); }
                    if (idx === 2) handleDelete();
                }
            );
        } else {
            Alert.alert('Tùy chọn', '', [
                { text: 'Chỉnh sửa', onPress: () => { setCaption(post.caption ?? ''); setEditVisible(true); } },
                { text: 'Xóa bài viết', style: 'destructive', onPress: handleDelete },
                { text: 'Huỷ', style: 'cancel' },
            ]);
        }
    };

    const handleDelete = () => {
        Alert.alert('Xóa bài viết', 'Bạn có chắc muốn xóa không?', [
            { text: 'Huỷ', style: 'cancel' },
            { text: 'Xóa', style: 'destructive', onPress: async () => {
                    try { await deleteFeedPost(post.id); onDeleted(post.id); }
                    catch { Alert.alert('Lỗi', 'Không thể xóa bài viết'); }
                }},
        ]);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateFeedPost(post.id, { visibility: post.visibility, caption });
            onUpdated(post.id, caption);
            setEditVisible(false);
        } catch { Alert.alert('Lỗi', 'Không thể cập nhật bài viết'); }
        finally { setSaving(false); }
    };

    return (
        <View style={styles.postCard}>
            <View style={styles.postHeader}>
                <Text style={styles.postType}>
                    {post.contentType === 'SONG' ? '🎵' : post.contentType === 'ALBUM' ? '💿' : post.contentType === 'PLAYLIST' ? '📋' : '📝'}
                </Text>
                <Text style={styles.postTime}>{timeAgo(post.createdAt)} trước</Text>
                {isOwnProfile && (
                    <Pressable onPress={openMenu} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={{ color: COLORS.glass50, fontSize: 13, fontWeight: '700', letterSpacing: 1 }}>•••</Text>
                    </Pressable>
                )}
            </View>
            {!!post.title   && <Text style={styles.postTitle}>{post.title}</Text>}
            {!!post.caption && <Text style={styles.postCaption}>{post.caption}</Text>}
            <View style={styles.postStats}>
                <Text style={styles.postStat}>♥ {post.likeCount}</Text>
                <Text style={styles.postStat}><FontAwesome name="commenting-o" color={COLORS.glass50} size={14} /> {post.commentCount}</Text>
            </View>
            <Modal visible={editVisible} transparent animationType="slide">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
                    <View style={{ backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 }}>
                        <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: '700', marginBottom: 16 }}>Chỉnh sửa bài viết</Text>
                        <TextInput
                            style={{ backgroundColor: COLORS.surfaceLow, color: COLORS.white, borderRadius: 10, padding: 12, fontSize: 15, textAlignVertical: 'top', borderWidth: 1, borderColor: COLORS.accentBorder25, minHeight: 100 }}
                            value={caption}
                            onChangeText={setCaption}
                            multiline
                            placeholder="Nội dung bài viết..."
                            placeholderTextColor={COLORS.glass30}
                        />
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
                            <Pressable onPress={() => setEditVisible(false)} style={{ paddingHorizontal: 20, paddingVertical: 10 }}>
                                <Text style={{ color: COLORS.glass60, fontSize: 15 }}>Huỷ</Text>
                            </Pressable>
                            <Pressable
                                onPress={handleSave}
                                disabled={saving}
                                style={[{ backgroundColor: COLORS.accentDim, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 }, saving && { opacity: 0.6 }]}
                            >
                                <Text style={{ color: COLORS.white, fontWeight: '600', fontSize: 15 }}>{saving ? 'Đang lưu...' : 'Lưu'}</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

// ─── Component ────────────────────────────────────────────────────────────────

export const ArtistProfileScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const { playSong, currentSong, isPlaying } = usePlayer();
    const { authSession } = useAuth();

    const artistId = route.params?.artistId as string;

    const [artist,  setArtist]  = useState<ArtistDetail | null>(null);
    const [songs,   setSongs]   = useState<Song[]>([]);
    const [albums,  setAlbums]  = useState<Album[]>([]);
    const [posts,   setPosts]   = useState<FeedPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('songs');

    // Edit
    const [editOpen,      setEditOpen]      = useState(false);
    const [editStageName, setEditStageName] = useState('');
    const [editBio,       setEditBio]       = useState('');
    const [saving,        setSaving]        = useState(false);

    // Is this the current user's own profile?
    const [myArtistId, setMyArtistId] = useState<string | null>(null);
    const isOwnProfile = !!myArtistId && myArtistId === artistId;

    const [editingPost, setEditingPost] = useState<{ id: string; caption: string } | null>(null);
    const [editCaption, setEditCaption] = useState('');
    const [editLoading, setEditLoading] = useState(false);

    // ── Load my artist id ────────────────────────────────────────────────────

    useEffect(() => {
        if (!authSession) return;
        apiClient.get('/artists/me')
            .then(res => setMyArtistId((res.data as any)?.id ?? null))
            .catch(() => setMyArtistId(null));
    }, [authSession?.tokens.accessToken]);

    // ── Load artist data ─────────────────────────────────────────────────────

    const loadData = useCallback(async () => {
        if (!artistId) return;
        setLoading(true);
        try {
            // Artist info
            const artistRes = await apiClient.get<ArtistDetail>(`/artists/${artistId}`);
            setArtist(artistRes.data as ArtistDetail);

            // Songs
            const songsRes = await getSongsByArtist(artistId, { size: 20 });
            setSongs(songsRes.content ?? []);

            // Albums (try public endpoint, fallback to empty)
            try {
                const albumsRes = await apiClient.get('/albums', {
                    params: { artistId, size: 20 },
                });
                const data = albumsRes.data as any;
                setAlbums(data?.content ?? []);
            } catch {
                setAlbums([]);
            }

            // Feed: load timeline and filter by this artist's userId
            try {
                const feedRes = await getTimeline({ page: 0, size: 50 });
                const artistPosts = (feedRes.content ?? []).filter(
                    p => p.ownerId === (artistRes.data as ArtistDetail).userId,
                );
                setPosts(artistPosts);
            } catch {
                setPosts([]);
            }
        } catch (e: any) {
            Alert.alert('Lỗi', e?.message ?? 'Không thể tải hồ sơ nghệ sĩ.');
        } finally {
            setLoading(false);
        }
    }, [artistId]);

    useFocusEffect(useCallback(() => { void loadData(); }, [loadData]));

    // ── Edit handler ─────────────────────────────────────────────────────────

    const openEdit = () => {
        setEditStageName(artist?.stageName ?? '');
        setEditBio(artist?.bio ?? '');
        setEditOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editStageName.trim()) return;
        setSaving(true);
        try {
            await apiClient.put('/artists/me', {
                stageName: editStageName.trim(),
                bio:       editBio.trim(),
            });
            setArtist(prev =>
                prev
                    ? { ...prev, stageName: editStageName.trim(), bio: editBio.trim() }
                    : prev,
            );
            setEditOpen(false);
        } catch (e: any) {
            Alert.alert('Lỗi', e?.message ?? 'Không thể cập nhật.');
        } finally {
            setSaving(false);
        }
    };

    const formatDuration = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    const timeAgo = (iso: string) => {
        const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
        if (diff < 60) return `${Math.max(1, diff)} phút`;
        if (diff < 1440) return `${Math.floor(diff / 60)} giờ`;
        return `${Math.floor(diff / 1440)} ngày`;
    };

    // ── Loading / error ──────────────────────────────────────────────────────

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color={COLORS.accent} size="large" />
            </View>
        );
    }

    if (!artist) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>Không tìm thấy nghệ sĩ</Text>
            </View>
        );
    }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <View style={styles.root}>
            <StatusBar style="light" />

            <ScrollView
                contentContainerStyle={{ paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Header gradient ──────────────────────────────── */}
                <LinearGradient
                    colors={[COLORS.gradPurple, COLORS.gradIndigo, COLORS.bg]}
                    locations={[0, 0.55, 1]}
                    style={[styles.header, { paddingTop: insets.top + 12 }]}
                >
                    <View style={styles.headerBar}>
                        <BackButton onPress={() => navigation.goBack()} />
                        {isOwnProfile && (
                            <Pressable style={styles.editBtn} onPress={openEdit}>
                                <Text style={styles.editBtnText}><FontAwesome name="edit" color="#ff7e5f" size={18} /> Chỉnh sửa</Text>
                            </Pressable>
                        )}
                    </View>

                    {/* Avatar */}
                    <View style={styles.avatarWrap}>
                        {artist.avatarUrl ? (
                            <Image source={{ uri: artist.avatarUrl }} style={styles.avatar} />
                        ) : (
                            <LinearGradient
                                colors={[COLORS.gradPurple, COLORS.accentDeep]}
                                style={styles.avatar}
                            >
                                <Text style={styles.avatarEmoji}>🎤</Text>
                            </LinearGradient>
                        )}
                        {artist.status === 'ACTIVE' && (
                            <View style={styles.verifiedBadge}>
                                <Text style={styles.verifiedIcon}>✓</Text>
                            </View>
                        )}
                    </View>

                    {/* Name + status */}
                    <Text style={styles.stageName}>{artist.stageName}</Text>
                    <View style={styles.statusRow}>
                        <View style={[styles.statusDot, { backgroundColor: artist.status === 'ACTIVE' ? COLORS.success : COLORS.warningMid }]} />
                        <Text style={styles.statusLabel}>
                            {artist.status === 'ACTIVE' ? 'Nghệ sĩ đã xác nhận' :
                                artist.status === 'PENDING' ? 'Đang chờ xét duyệt' :
                                    'Nghệ sĩ'}
                        </Text>
                    </View>

                    {/* Bio */}
                    {!!artist.bio && (
                        <Text style={styles.bio} numberOfLines={3}>{artist.bio}</Text>
                    )}

                    {/* Stats */}
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{songs.length}</Text>
                            <Text style={styles.statLabel}>Bài hát</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{albums.length}</Text>
                            <Text style={styles.statLabel}>Album</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{posts.length}</Text>
                            <Text style={styles.statLabel}>Bài đăng</Text>
                        </View>
                    </View>
                    {/* Follow button — chỉ hiện khi không phải profile của mình */}
                    {!isOwnProfile && (
                        <View style={{ marginTop: 14 }}>
                            <FollowButton artistId={artistId} style={{ minWidth: 140 }} />
                        </View>
                    )}
                </LinearGradient>

                {/* ── Tabs ─────────────────────────────────────────── */}
                <View style={styles.tabBar}>
                    {tabConfig.map(t => (
                        <Pressable
                            key={t.key}
                            style={[styles.tab, activeTab === t.key && styles.tabActive]}
                            onPress={() => setActiveTab(t.key)}
                        >
                            <Text style={styles.tabIcon}>{t.icon}</Text>
                            <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>
                                {t.label}
                            </Text>
                        </Pressable>
                    ))}
                </View>

                {/* ── Content ──────────────────────────────────────── */}
                <View style={styles.content}>

                    {/* Songs tab */}
                    {activeTab === 'songs' && (
                        songs.length === 0 ? (
                            <View style={styles.empty}>
                                <Text style={styles.emptyEmoji}>🎵</Text>
                                <Text style={styles.emptyTitle}>Chưa có bài hát nào</Text>
                            </View>
                        ) : (
                            songs.map(song => (
                                <SongCard
                                    key={song.id}
                                    song={song}
                                    isActive={currentSong?.id === song.id}
                                    isPlaying={currentSong?.id === song.id && isPlaying}
                                    onPress={() => playSong(song, songs)}
                                    formatDuration={formatDuration}
                                />
                            ))
                        )
                    )}

                    {/* Albums tab */}
                    {activeTab === 'albums' && (
                        albums.length === 0 ? (
                            <View style={styles.empty}>
                                <Text style={styles.emptyEmoji}>💿</Text>
                                <Text style={styles.emptyTitle}>Chưa có album nào</Text>
                            </View>
                        ) : (
                            albums.map(album => (
                                <Pressable
                                    key={album.id}
                                    style={styles.albumRow}
                                    onPress={() => navigation.navigate('AlbumDetail', { albumId: album.id })}
                                >
                                    {album.coverUrl ? (
                                        <Image source={{ uri: album.coverUrl }} style={styles.albumCover} />
                                    ) : (
                                        <LinearGradient
                                            colors={[COLORS.gradPurple, COLORS.gradIndigo]}
                                            style={[styles.albumCover, styles.albumCoverFallback]}
                                        >
                                            <Text style={{ fontSize: 22 }}>💿</Text>
                                        </LinearGradient>
                                    )}
                                    <View style={styles.albumInfo}>
                                        <Text style={styles.albumTitle} numberOfLines={1}>{album.title}</Text>
                                        <Text style={styles.albumMeta}>
                                            {album.songs?.length ?? 0} bài · {album.status === 'PUBLIC' ? 'Công khai' : 'Riêng tư'}
                                        </Text>
                                    </View>
                                    <Text style={styles.albumArrow}>›</Text>
                                </Pressable>
                            ))
                        )
                    )}

                    {/* Feed tab */}
                    {activeTab === 'feed' && (
                        posts.length === 0 ? (
                            <View style={styles.empty}>
                                <Text style={styles.emptyEmoji}>📝</Text>
                                <Text style={styles.emptyTitle}>Chưa có bài đăng nào</Text>
                            </View>
                        ) : (
                            posts.map(post => (
                                <FeedPostCard
                                    key={post.id}
                                    post={post}
                                    isOwnProfile={isOwnProfile}
                                    onDeleted={(id) => setPosts(prev => prev.filter(p => p.id !== id))}
                                    onUpdated={(id, cap) =>
                                        setPosts(prev => prev.map(p => p.id === id ? { ...p, caption: cap } : p))
                                    }
                                />
                            ))
                        )
                    )}
                </View>
            </ScrollView>

            {/* ── Edit modal ───────────────────────────────────────── */}
            <Modal
                visible={editOpen}
                transparent
                animationType="slide"
                onRequestClose={() => setEditOpen(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHandle} />
                        <Text style={styles.modalTitle}>Chỉnh sửa hồ sơ Nghệ sĩ</Text>

                        <Text style={styles.modalLabel}>Nghệ danh *</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={editStageName}
                            onChangeText={setEditStageName}
                            placeholder="Nghệ danh"
                            placeholderTextColor={COLORS.glass30}
                            maxLength={50}
                            autoFocus
                        />

                        <Text style={styles.modalLabel}>Bio</Text>
                        <TextInput
                            style={[styles.modalInput, { minHeight: 80, textAlignVertical: 'top' }]}
                            value={editBio}
                            onChangeText={setEditBio}
                            placeholder="Giới thiệu về bản thân..."
                            placeholderTextColor={COLORS.glass30}
                            multiline
                            maxLength={500}
                        />

                        <View style={styles.modalActions}>
                            <Pressable
                                style={styles.modalCancelBtn}
                                onPress={() => setEditOpen(false)}
                            >
                                <Text style={styles.modalCancelText}>Huỷ</Text>
                            </Pressable>
                            <Pressable
                                style={[
                                    styles.modalSaveBtn,
                                    (!editStageName.trim() || saving) && { opacity: 0.45 },
                                ]}
                                onPress={handleSaveEdit}
                                disabled={!editStageName.trim() || saving}
                            >
                                {saving ? (
                                    <ActivityIndicator size="small" color={COLORS.white} />
                                ) : (
                                    <Text style={styles.modalSaveText}>Lưu</Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root:   { flex: 1, backgroundColor: COLORS.bg },
    center: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
    errorText: { color: COLORS.glass40, fontSize: 15 },

    // Header
    header: { paddingHorizontal: 24, paddingBottom: 28, alignItems: 'center' },
    headerBar: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    editBtn: {
        backgroundColor: COLORS.glass10,
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderWidth: 1,
        borderColor: COLORS.glass15,
    },
    editBtnText: { color: COLORS.white, fontSize: 13, fontWeight: '600' },

    // Avatar
    avatarWrap: { position: 'relative', marginBottom: 14 },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: COLORS.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: COLORS.accentBorder50,
    },
    avatarEmoji: { fontSize: 44 },
    verifiedBadge: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: COLORS.accent,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: COLORS.bg,
    },
    verifiedIcon: { color: COLORS.white, fontSize: 13, fontWeight: '800' },

    stageName: {
        color: COLORS.white,
        fontSize: 26,
        fontWeight: '800',
        marginBottom: 6,
        textAlign: 'center',
    },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    statusDot: { width: 7, height: 7, borderRadius: 4 },
    statusLabel: { color: COLORS.glass50, fontSize: 12, fontWeight: '500' },

    bio: {
        color: COLORS.glass60,
        fontSize: 13,
        lineHeight: 20,
        textAlign: 'center',
        marginBottom: 16,
        paddingHorizontal: 12,
    },

    // Stats
    statsRow: {
        flexDirection: 'row',
        backgroundColor: COLORS.glass08,
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderWidth: 1,
        borderColor: COLORS.glass12,
        gap: 4,
        marginTop: 4,
    },
    statItem: { flex: 1, alignItems: 'center' },
    statValue: { color: COLORS.white, fontSize: 20, fontWeight: '800' },
    statLabel: { color: COLORS.glass35, fontSize: 11, marginTop: 2 },
    statDivider: { width: 1, backgroundColor: COLORS.glass12, marginHorizontal: 8 },

    // Tabs
    tabBar: {
        flexDirection: 'row',
        marginHorizontal: 20,
        marginTop: 6,
        marginBottom: 16,
        backgroundColor: COLORS.surface,
        borderRadius: 14,
        padding: 4,
        borderWidth: 1,
        borderColor: COLORS.glass08,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 9,
        borderRadius: 10,
        gap: 5,
    },
    tabActive: {
        backgroundColor: COLORS.accentFill20,
        borderWidth: 1,
        borderColor: COLORS.accentBorder25,
    },
    tabIcon: { fontSize: 13 },
    tabText: { color: COLORS.glass45, fontSize: 12, fontWeight: '600' },
    tabTextActive: { color: COLORS.accent },

    // Content
    content: { paddingHorizontal: 20 },
    empty: { alignItems: 'center', paddingVertical: 48 },
    emptyEmoji: { fontSize: 40, marginBottom: 10 },
    emptyTitle: { color: COLORS.glass35, fontSize: 14 },

    // Album row
    albumRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.glass06,
        gap: 12,
    },
    albumCover: {
        width: 54,
        height: 54,
        borderRadius: 10,
        backgroundColor: COLORS.surface,
    },
    albumCoverFallback: { alignItems: 'center', justifyContent: 'center' },
    albumInfo: { flex: 1 },
    albumTitle: { color: COLORS.white, fontSize: 14, fontWeight: '600', marginBottom: 3 },
    albumMeta: { color: COLORS.glass45, fontSize: 12 },
    albumArrow: { color: COLORS.glass25, fontSize: 22 },

    // Feed post card
    postCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: COLORS.glass08,
    },
    postHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    postType: { fontSize: 16 },
    postTime: { color: COLORS.glass35, fontSize: 11 },
    postTitle: {
        color: COLORS.white,
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 4,
        lineHeight: 21,
    },
    postCaption: { color: COLORS.glass70, fontSize: 13, lineHeight: 19, marginBottom: 8 },
    postStats: { flexDirection: 'row', gap: 14 },
    postStat: { color: COLORS.glass40, fontSize: 12 },

    // Edit modal
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.65)',
    },
    modalSheet: {
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: 36,
        borderWidth: 1,
        borderBottomWidth: 0,
        borderColor: COLORS.glass12,
    },
    modalHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.glass20,
        alignSelf: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        color: COLORS.white,
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 16,
    },
    modalLabel: {
        color: COLORS.glass40,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 8,
        marginTop: 12,
    },
    modalInput: {
        backgroundColor: COLORS.surfaceLow,
        borderWidth: 1,
        borderColor: COLORS.glass15,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        color: COLORS.white,
        fontSize: 15,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 20,
    },
    modalCancelBtn: {
        flex: 1,
        minHeight: 48,
        borderRadius: 14,
        backgroundColor: COLORS.glass08,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.glass12,
    },
    modalCancelText: { color: COLORS.glass60, fontWeight: '600' },
    modalSaveBtn: {
        flex: 1,
        minHeight: 48,
        borderRadius: 14,
        backgroundColor: COLORS.accentDim,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalSaveText: { color: COLORS.white, fontWeight: '700' },
});