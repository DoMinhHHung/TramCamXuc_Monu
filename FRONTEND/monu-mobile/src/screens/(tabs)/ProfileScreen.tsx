
import React, { useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import {
    ActivityIndicator, Alert, Image, Modal, Pressable,
    ScrollView, StyleSheet, Text, TextInput, View, FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmModal } from '../../components/ConfirmModal';
import { COLORS } from '../../config/colors';
import { useAuth } from '../../context/AuthContext';
import { useDownload } from '../../context/DownloadContext';
import { deleteMyProfile, updateMyProfile, uploadAvatar } from '../../services/auth';
import { getMyPlaylists } from '../../services/music';
import { getMyHearts } from '../../services/social';
import { apiClient } from '../../services/api';
import { BackButton } from '../../components/BackButton';
import { useNavigation } from '@react-navigation/native';
import {AntDesign, FontAwesome, Fontisto, SimpleLineIcons, Feather  } from "@expo/vector-icons";

type ArtistProfile = {
    id: string;
    stageName: string;
    bio?: string;
    status: 'ACTIVE' | 'PENDING' | 'BANNED' | 'REJECTED';
};

export const ProfileScreen = () => {
    const { authSession, refreshProfile, logout } = useAuth();
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const { downloadedSongs, storageUsed, deleteDownload } = useDownload();

    const [menuOpen,    setMenuOpen]    = useState(false);
    const [editOpen,    setEditOpen]    = useState(false);
    const [deleteOpen,  setDeleteOpen]  = useState(false);
    const [logoutOpen,  setLogoutOpen]  = useState(false);
    const [saving,      setSaving]      = useState(false);
    const [fullName,    setFullName]    = useState(authSession?.profile?.fullName ?? '');
    const [artistProfile, setArtistProfile] = useState<ArtistProfile | null>(null);
    const [loadingArtist, setLoadingArtist] = useState(true);

    // Downloads modal
    const [downloadsOpen, setDownloadsOpen] = useState(false);

    // Stats từ API
    const [playlistCount, setPlaylistCount] = useState<number | null>(null);
    const [favoriteCount, setFavoriteCount] = useState<number | null>(null);

    useEffect(() => {
        void loadArtistProfile();
        void loadStats();
    }, [authSession?.tokens.accessToken]);

    const loadArtistProfile = async () => {
        setLoadingArtist(true);
        try {
            const res = await apiClient.get('/artists/me');
            setArtistProfile(res.data as ArtistProfile);
        } catch {
            setArtistProfile(null);
        } finally {
            setLoadingArtist(false);
        }
    };

    const loadStats = async () => {
        try {
            const [plRes, hvRes] = await Promise.allSettled([
                getMyPlaylists({ page: 1, size: 1 }),
                getMyHearts({ page: 1, size: 1 }),
            ]);
            if (plRes.status === 'fulfilled') setPlaylistCount(plRes.value.totalElements ?? 0);
            if (hvRes.status === 'fulfilled') setFavoriteCount(hvRes.value.totalElements ?? 0);
        } catch { /* silent */ }
    };

    const pickAvatar = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Quyền truy cập bị từ chối', 'Vui lòng cấp quyền để chọn ảnh.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });
        if (result.canceled || !result.assets?.[0]) return;
        try {
            setSaving(true);
            await uploadAvatar(result.assets[0].uri);
            await refreshProfile();
        } catch (error: any) {
            Alert.alert('Lỗi', error?.message || 'Không thể cập nhật avatar.');
        } finally {
            setSaving(false);
        }
    };

    const onSaveProfile = async () => {
        try {
            setSaving(true);
            await updateMyProfile({ fullName: fullName.trim() });
            await refreshProfile();
            setEditOpen(false);
        } catch (error: any) {
            Alert.alert('Lỗi', error?.message || 'Không thể cập nhật hồ sơ.');
        } finally {
            setSaving(false);
        }
    };

    const onDeleteAccount = async () => {
        try {
            setSaving(true);
            await deleteMyProfile();
            setDeleteOpen(false);
            await logout();
        } catch (error: any) {
            Alert.alert('Lỗi', error?.message || 'Không thể xóa tài khoản.');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteDownloadedSong = async (songId: string) => {
        Alert.alert('Xoá bài đã tải', 'Bạn muốn xoá bài hát này khỏi bộ nhớ máy?', [
            { text: 'Huỷ', style: 'cancel' },
            {
                text: 'Xoá',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteDownload(songId);
                    } catch (error: any) {
                        Alert.alert('Lỗi', error?.message || 'Không thể xoá bài đã tải.');
                    }
                },
            },
        ]);
    };

    const getArtistStatusColor = () => {
        if (!artistProfile) return COLORS.glass35;
        switch (artistProfile.status) {
            case 'ACTIVE':   return COLORS.success;
            case 'PENDING':  return COLORS.warningMid;
            case 'BANNED':   return COLORS.error;
            case 'REJECTED': return COLORS.error;
            default:         return COLORS.glass35;
        }
    };

    const getArtistStatusLabel = () => {
        if (!artistProfile) return '';
        switch (artistProfile.status) {
            case 'ACTIVE':   return '✓ Đã được duyệt';
            case 'PENDING':  return '⏳ Đang chờ xét duyệt';
            case 'BANNED':   return '🚫 Bị đình chỉ';
            case 'REJECTED': return '✕ Bị từ chối';
            default:         return '';
        }
    };

    const formatStorage = (bytes: number): string => {
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // ── Menu items config ─────────────────────────────────────────────────
    const menuItems = [
        {
            icon: <Fontisto name="play-list" color="#22C55E" size={18} />,
            label: 'Playlist của tôi',
            sub: playlistCount !== null ? `${playlistCount} playlist` : undefined,
            onPress: () => navigation.navigate('MainTabs', { screen: 'Library' }),
        },
        {
            icon: <FontAwesome name="heartbeat" color="#E11D48" size={18} />,
            label: 'Bài hát yêu thích',
            sub: favoriteCount !== null ? `${favoriteCount} bài` : undefined,
            onPress: () => navigation.navigate('FavoriteSongs'),
        },
        {
            icon: <FontAwesome name="history" color="#38BDF8" size={18} />,
            label: 'Lịch sử nghe nhạc',
            sub: 'Các bài bạn đã nghe',
            onPress: () => navigation.navigate('History'),
        },
        {
            icon: <AntDesign name="download" color="#fff" size={18} />,
            label: 'Đã tải xuống',
            sub: downloadedSongs.length > 0
                ? `${downloadedSongs.length} bài · ${formatStorage(storageUsed)}`
                : 'Chưa có bài nào',
            onPress: () => setDownloadsOpen(true),
        },
        {
            icon: <SimpleLineIcons name="user-following" color="#22C55E" size={18} />,
            label: 'Đang theo dõi',
            sub: undefined,
            onPress: () => navigation.navigate('Following'),
        },
    ];

    return (
        <View style={styles.root}>
            <StatusBar style="light" />
            <ScrollView showsVerticalScrollIndicator={false}>

                {/* Hero */}
                <LinearGradient
                    colors={[COLORS.gradPurple, COLORS.gradIndigo, COLORS.bg]}
                    locations={[0, 0.5, 1]}
                    style={[styles.hero, { paddingTop: insets.top + 12 }]}
                >
                    <View style={styles.topBar}>
                        <BackButton onPress={() => navigation.goBack()} />
                        <Text style={styles.topBarTitle}>Hồ sơ</Text>
                        <Pressable onPress={() => setMenuOpen(p => !p)} style={styles.gearBtn}>
                            <Text style={styles.gearIcon}><Feather name="settings" color="#FFFFFF" size={24} /></Text>
                        </Pressable>
                    </View>

                    {/* Avatar */}
                    <Pressable onPress={pickAvatar} style={styles.avatarWrap}>
                        {authSession?.profile?.avatarUrl ? (
                            <Image
                                source={{ uri: authSession.profile.avatarUrl }}
                                style={styles.avatar}
                            />
                        ) : (
                            <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                <Text style={styles.avatarEmoji}>👤</Text>
                            </View>
                        )}
                        <View style={styles.avatarEditBadge}>
                            <Text style={{ fontSize: 12 }}><FontAwesome name="edit" color="#FFFFFF" size={16} /></Text>
                        </View>
                    </Pressable>

                    <Text style={styles.name}>
                        {authSession?.profile?.fullName ?? authSession?.profile?.email ?? 'Monu User'}
                    </Text>
                    <Text style={styles.email}>{authSession?.profile?.email}</Text>

                    <Pressable style={styles.editBtn} onPress={() => setEditOpen(true)}>
                        <Text style={styles.editBtnText}>Chỉnh sửa hồ sơ</Text>
                    </Pressable>
                </LinearGradient>

                {/* ── Artist card ──────────────────────────────────── */}
                <View style={styles.sectionWrapper}>
                    <Text style={styles.sectionHeading}>Nghệ sĩ</Text>

                    {loadingArtist ? (
                        <View style={[styles.artistCard, { alignItems: 'center', paddingVertical: 20 }]}>
                            <ActivityIndicator color={COLORS.accent} />
                        </View>
                    ) : artistProfile ? (
                        /* Has artist profile */
                        <Pressable
                            style={styles.artistCard}
                            onPress={() => navigation.navigate('ArtistProfile', { artistId: artistProfile.id })}
                        >
                            <View style={styles.artistCardTop}>
                                <View style={styles.artistAvatarSmall}>
                                    <Text style={{ fontSize: 22 }}>🎤</Text>
                                </View>
                                <View style={styles.artistInfo}>
                                    <Text style={styles.artistStageName}>{artistProfile.stageName}</Text>
                                    <Text style={[styles.artistStatus, { color: getArtistStatusColor() }]}>
                                        {getArtistStatusLabel()}
                                    </Text>
                                </View>
                                <Text style={styles.artistArrow}>›</Text>
                            </View>

                            {!!artistProfile.bio && (
                                <Text style={styles.artistBio} numberOfLines={2}>
                                    {artistProfile.bio}
                                </Text>
                            )}

                            <Text style={styles.artistViewHint}>
                                Nhấn để xem trang nghệ sĩ công khai
                            </Text>
                        </Pressable>
                    ) : (
                        /* No artist profile */
                        <View style={styles.artistCard}>
                            <Text style={styles.artistNoProfileTitle}>🎤 Bạn chưa có hồ sơ Nghệ sĩ</Text>
                            <Text style={styles.artistNoProfileDesc}>
                                Đăng ký để upload nhạc, tạo album và chia sẻ âm nhạc của bạn với hàng nghìn người nghe.
                            </Text>
                            <Pressable
                                style={styles.registerArtistBtn}
                                onPress={() => navigation.navigate('RegisterArtist')}
                            >
                                <LinearGradient
                                    colors={[COLORS.accent, COLORS.accentAlt]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.registerArtistBtnGradient}
                                >
                                    <Text style={styles.registerArtistBtnText}>Đăng ký Nghệ sĩ →</Text>
                                </LinearGradient>
                            </Pressable>
                        </View>
                    )}
                </View>

                {/* ── Stats ───────────────────────────────────────── */}
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statVal}>
                            {playlistCount !== null ? playlistCount : '—'}
                        </Text>
                        <Text style={styles.statLabel}>Playlist</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statVal}>
                            {downloadedSongs.length}
                        </Text>
                        <Text style={styles.statLabel}>Đã tải</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statVal}>
                            {favoriteCount !== null ? favoriteCount : '—'}
                        </Text>
                        <Text style={styles.statLabel}>Yêu thích</Text>
                    </View>
                </View>

                {/* ── Menu items ───────────────────────────────────── */}
                <View style={styles.menuCard}>
                    {menuItems.map((item, i) => (
                        <Pressable
                            key={i}
                            style={({ pressed }) => [
                                styles.menuRow,
                                pressed && { backgroundColor: COLORS.glass04 },
                            ]}
                            onPress={item.onPress}
                        >
                            <LinearGradient
                                colors={[COLORS.surface, COLORS.surfaceLow]}
                                style={styles.menuIconWrap}
                            >
                                <Text>{item.icon}</Text>
                            </LinearGradient>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.menuLabel}>{item.label}</Text>
                                {item.sub ? (
                                    <Text style={styles.menuSub}>{item.sub}</Text>
                                ) : null}
                            </View>
                            <Text style={styles.menuArrow}>›</Text>
                        </Pressable>
                    ))}
                </View>

                <View style={{ height: insets.bottom + 20 }} />
            </ScrollView>

            {/* Dropdown menu */}
            {menuOpen && (
                <View style={[styles.dropMenu, { top: insets.top + 54 }]}>
                    <Pressable
                        style={styles.dropItem}
                        onPress={() => { setMenuOpen(false); setLogoutOpen(true); }}
                    >
                        <Text style={styles.dropText}>Đăng xuất</Text>
                    </Pressable>
                    <View style={styles.dropDivider} />
                    <Pressable
                        style={styles.dropItem}
                        onPress={() => { setMenuOpen(false); setDeleteOpen(true); }}
                    >
                        <Text style={[styles.dropText, { color: COLORS.error }]}>Xóa tài khoản</Text>
                    </Pressable>
                </View>
            )}

            {/* Edit profile modal */}
            {editOpen && (
                <View style={styles.modalOverlay}>
                    <View style={styles.editModal}>
                        <Text style={styles.modalTitle}>Chỉnh sửa hồ sơ</Text>
                        <Text style={styles.modalFieldLabel}>Tên hiển thị</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={fullName}
                            onChangeText={setFullName}
                            placeholder="Nhập tên hiển thị"
                            placeholderTextColor={COLORS.glass25}
                        />
                        <View style={styles.modalActions}>
                            <Pressable style={styles.cancelBtn} onPress={() => setEditOpen(false)}>
                                <Text style={styles.cancelBtnText}>Hủy</Text>
                            </Pressable>
                            <Pressable style={styles.saveBtn} onPress={onSaveProfile}>
                                {saving
                                    ? <ActivityIndicator color={COLORS.white} size="small" />
                                    : <Text style={styles.saveBtnText}>Lưu</Text>
                                }
                            </Pressable>
                        </View>
                    </View>
                </View>
            )}

            {/* Downloads modal */}
            <Modal
                visible={downloadsOpen}
                animationType="slide"
                transparent
                onRequestClose={() => setDownloadsOpen(false)}
            >
                <Pressable
                    style={{ flex: 1, backgroundColor: COLORS.scrim }}
                    onPress={() => setDownloadsOpen(false)}
                />
                <View style={styles.dlSheet}>
                    <View style={styles.dlHandle} />
                    <Text style={styles.dlTitle}>
                        Đã tải xuống · {downloadedSongs.length} bài
                    </Text>
                    {downloadedSongs.length === 0 ? (
                        <View style={styles.dlEmpty}>
                            <Text style={{ fontSize: 40, marginBottom: 10 }}>⬇️</Text>
                            <Text style={styles.dlEmptyText}>Chưa có bài hát nào được tải</Text>
                            <Text style={styles.dlEmptyHint}>
                                Bấm ⬇️ trên bài hát để tải về nghe offline
                            </Text>
                        </View>
                    ) : (
                        <>
                            <Text style={styles.dlStorage}>
                                Dung lượng đã dùng: {formatStorage(storageUsed)}
                            </Text>
                            <FlatList
                                data={downloadedSongs}
                                keyExtractor={(i, idx) => `${i.song.id}-${idx}`}
                                style={{ maxHeight: 320 }}
                                renderItem={({ item }) => (
                                    <View style={styles.dlRow}>
                                        <View style={styles.dlThumb}>
                                            <Text style={{ fontSize: 20 }}>🎵</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.dlSongTitle} numberOfLines={1}>
                                                {item.song.title}
                                            </Text>
                                            <Text style={styles.dlSongArtist} numberOfLines={1}>
                                                {item.song.primaryArtist?.stageName}
                                            </Text>
                                        </View>
                                        <Text style={styles.dlSize}>
                                            {formatStorage(item.size)}
                                        </Text>
                                        <Pressable
                                            style={styles.dlDeleteBtn}
                                            onPress={() => handleDeleteDownloadedSong(item.song.id)}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        >
                                            <Text style={styles.dlDeleteText}>Xoá</Text>
                                        </Pressable>
                                    </View>
                                )}
                            />
                        </>
                    )}
                    <Pressable
                        style={styles.dlCloseBtn}
                        onPress={() => setDownloadsOpen(false)}
                    >
                        <Text style={styles.dlCloseBtnText}>Đóng</Text>
                    </Pressable>
                </View>
            </Modal>

            <ConfirmModal
                visible={deleteOpen}
                title="Xóa tài khoản?"
                message="Hành động này không thể hoàn tác."
                confirmText="Xóa tài khoản"
                destructive
                onCancel={() => setDeleteOpen(false)}
                onConfirm={onDeleteAccount}
            />
            <ConfirmModal
                visible={logoutOpen}
                title="Xác nhận đăng xuất"
                message="Bạn có chắc muốn đăng xuất?"
                confirmText="Đăng xuất"
                onCancel={() => setLogoutOpen(false)}
                onConfirm={async () => { setLogoutOpen(false); await logout(); }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: COLORS.bg },

    hero: { paddingHorizontal: 20, paddingBottom: 32, alignItems: 'center' },
    topBar: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    topBarTitle: { color: COLORS.white, fontSize: 20, fontWeight: '700' },
    gearBtn:     { padding: 8 },
    gearIcon:    { fontSize: 22 },

    avatarWrap: { position: 'relative', marginBottom: 16 },
    avatar: {
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: COLORS.surface,
    },
    avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
    avatarEmoji: { fontSize: 44 },
    avatarEditBadge: {
        position: 'absolute', bottom: 0, right: 0,
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: COLORS.accent,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: COLORS.bg,
    },

    name: { color: COLORS.white, fontSize: 22, fontWeight: '800', marginBottom: 4 },
    email: { color: COLORS.glass40, fontSize: 13, marginBottom: 18 },

    editBtn: {
        paddingHorizontal: 22, paddingVertical: 10,
        borderRadius: 999, borderWidth: 1,
        borderColor: COLORS.glass20, backgroundColor: COLORS.glass07,
    },
    editBtnText: { color: COLORS.white, fontWeight: '600', fontSize: 14 },

    // Section wrapper
    sectionWrapper: { marginHorizontal: 20, marginTop: 20 },
    sectionHeading: {
        color: COLORS.white, fontSize: 16, fontWeight: '700', marginBottom: 10,
    },

    // Artist card
    artistCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.glass10,
        padding: 16,
        gap: 8,
    },
    artistCardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    artistAvatarSmall: {
        width: 46, height: 46, borderRadius: 23,
        backgroundColor: COLORS.accentFill20,
        borderWidth: 1, borderColor: COLORS.accentBorder25,
        alignItems: 'center', justifyContent: 'center',
    },
    artistInfo:      { flex: 1 },
    artistStageName: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
    artistStatus:    { fontSize: 12, marginTop: 2 },
    artistArrow:     { color: COLORS.glass25, fontSize: 22 },
    artistBio:       { color: COLORS.glass50, fontSize: 13, lineHeight: 19 },
    artistViewHint:  { color: COLORS.accent, fontSize: 12 },

    artistNoProfileTitle: {
        color: COLORS.white, fontSize: 15, fontWeight: '700', marginBottom: 6,
    },
    artistNoProfileDesc: {
        color: COLORS.glass50, fontSize: 13, lineHeight: 20,
    },
    registerArtistBtn: { borderRadius: 999, overflow: 'hidden', marginTop: 8 },
    registerArtistBtnGradient: {
        minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 999,
    },
    registerArtistBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },

    // Stats
    statsRow: {
        flexDirection: 'row',
        marginHorizontal: 20,
        marginTop: 20,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: COLORS.glass04,
        borderWidth: 1,
        borderColor: COLORS.glass07,
    },
    statItem:  { flex: 1, alignItems: 'center', paddingVertical: 16 },
    statVal:   { color: COLORS.white, fontSize: 20, fontWeight: '800' },
    statLabel: { color: COLORS.glass35, fontSize: 11, marginTop: 2 },

    // Menu
    menuCard: {
        marginHorizontal: 20, marginTop: 16,
        borderRadius: 16, overflow: 'hidden',
        backgroundColor: COLORS.glass03,
        borderWidth: 1, borderColor: COLORS.glass07,
    },
    menuRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    menuIconWrap: {
        width: 36, height: 36, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center',
        marginRight: 14, overflow: 'hidden',
    },
    menuLabel: { color: COLORS.white, fontSize: 15, fontWeight: '500' },
    menuSub:   { color: COLORS.glass35, fontSize: 11, marginTop: 1 },
    menuArrow: { color: COLORS.glass20, fontSize: 22 },

    // Dropdown
    dropMenu: {
        position: 'absolute', right: 20,
        backgroundColor: COLORS.surface,
        borderWidth: 1, borderColor: COLORS.glass10,
        borderRadius: 12, zIndex: 50,
        overflow: 'hidden', minWidth: 160,
    },
    dropItem:   { paddingHorizontal: 16, paddingVertical: 14 },
    dropText:   { color: COLORS.white, fontWeight: '600' },
    dropDivider: { height: 1, backgroundColor: COLORS.glass08 },

    // Edit modal
    modalOverlay: {
        position: 'absolute', inset: 0,
        backgroundColor: COLORS.scrim,
        alignItems: 'center', justifyContent: 'center', padding: 24,
    },
    editModal: {
        width: '100%', backgroundColor: COLORS.surface,
        borderRadius: 20, padding: 20,
        borderWidth: 1, borderColor: COLORS.glass10,
    },
    modalTitle: { color: COLORS.white, fontSize: 18, fontWeight: '800', marginBottom: 16 },
    modalFieldLabel: {
        color: COLORS.glass40, fontSize: 11, fontWeight: '700',
        letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8,
    },
    modalInput: {
        backgroundColor: COLORS.glass07, borderWidth: 1,
        borderColor: COLORS.glass12, borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 12,
        color: COLORS.white, fontSize: 15, marginBottom: 16,
    },
    modalActions: { flexDirection: 'row', gap: 10 },
    cancelBtn: {
        flex: 1, minHeight: 44, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: COLORS.glass15,
    },
    cancelBtnText: { color: COLORS.glass70, fontWeight: '600' },
    saveBtn: {
        flex: 1, minHeight: 44, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: COLORS.accent,
    },
    saveBtnText: { color: COLORS.white, fontWeight: '700' },

    // Downloads sheet
    dlSheet: {
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: 36,
        borderWidth: 1,
        borderBottomWidth: 0,
        borderColor: COLORS.glass12,
    },
    dlHandle: {
        width: 40, height: 4, borderRadius: 2,
        backgroundColor: COLORS.glass20,
        alignSelf: 'center', marginBottom: 16,
    },
    dlTitle: { color: COLORS.white, fontSize: 18, fontWeight: '800', marginBottom: 4 },
    dlStorage: { color: COLORS.glass35, fontSize: 12, marginBottom: 12 },
    dlEmpty: { alignItems: 'center', paddingVertical: 32 },
    dlEmptyText: { color: COLORS.glass60, fontSize: 16, fontWeight: '600', marginBottom: 6 },
    dlEmptyHint: { color: COLORS.glass35, fontSize: 13, textAlign: 'center' },
    dlRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 10, gap: 12,
        borderBottomWidth: 1, borderBottomColor: COLORS.glass06,
    },
    dlThumb: {
        width: 44, height: 44, borderRadius: 8,
        backgroundColor: COLORS.surfaceLow,
        alignItems: 'center', justifyContent: 'center',
    },
    dlSongTitle:  { color: COLORS.white, fontSize: 14, fontWeight: '600' },
    dlSongArtist: { color: COLORS.glass45, fontSize: 12, marginTop: 2 },
    dlSize:       { color: COLORS.glass35, fontSize: 11 },
    dlDeleteBtn: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: COLORS.glass08,
        borderWidth: 1,
        borderColor: COLORS.glass12,
    },
    dlDeleteText: { color: COLORS.error, fontSize: 12, fontWeight: '700' },
    dlCloseBtn: {
        backgroundColor: COLORS.accentDim,
        borderRadius: 999,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 16,
    },
    dlCloseBtnText: { color: COLORS.white, fontWeight: '700' },
});