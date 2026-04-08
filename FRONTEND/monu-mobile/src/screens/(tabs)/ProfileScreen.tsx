
import React, { useEffect, useMemo, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import {
    ActivityIndicator, Alert, Image, Modal, Pressable,
    ScrollView, StyleSheet, Text, TextInput, View, FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmModal } from '../../components/ConfirmModal';
import { ColorScheme, useThemeColors } from '../../config/colors';
import { useAuth } from '../../context/AuthContext';
import { useDownload } from '../../context/DownloadContext';
import { useTranslation } from '../../context/LocalizationContext';
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
    const { t } = useTranslation();
    const themeColors = useThemeColors();
    const styles = useMemo(() => createStyles(themeColors), [themeColors]);
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
    const profileName = authSession?.profile?.fullName?.trim();
    const profileEmail = authSession?.profile?.email;
    const displayName = profileName && profileName.length > 0
        ? profileName
        : profileEmail ?? t('screens.profile.defaultUserName', 'Monu User');

    useEffect(() => {
        void refreshProfile();
        void loadArtistProfile();
        void loadStats();
    }, [authSession?.tokens.accessToken]);

    useEffect(() => {
        setFullName(authSession?.profile?.fullName ?? '');
    }, [authSession?.profile?.fullName]);

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
            Alert.alert(t('screens.profile.permissionDeniedTitle', 'Permission denied'), t('screens.profile.permissionDeniedMessage', 'Please grant permission to select image.'));
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
            Alert.alert(t('common.error'), error?.message || t('screens.profile.updateAvatarFailed', 'Cannot update avatar.'));
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
            Alert.alert(t('common.error'), error?.message || t('screens.profile.updateProfileFailed', 'Cannot update profile.'));
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
            Alert.alert(t('common.error'), error?.message || t('screens.profile.deleteAccountFailed', 'Cannot delete account.'));
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteDownloadedSong = async (songId: string) => {
        Alert.alert(t('screens.profile.deleteDownloadedTitle', 'Delete downloaded song'), t('screens.profile.deleteDownloadedMessage', 'Do you want to remove this song from device storage?'), [
            { text: t('common.cancel'), style: 'cancel' },
            {
                text: t('common.delete'),
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteDownload(songId);
                    } catch (error: any) {
                        Alert.alert(t('common.error'), error?.message || t('screens.profile.deleteDownloadedFailed', 'Cannot delete downloaded song.'));
                    }
                },
            },
        ]);
    };

    const getArtistStatusColor = () => {
        if (!artistProfile) return themeColors.glass35;
        switch (artistProfile.status) {
            case 'ACTIVE':   return themeColors.success;
            case 'PENDING':  return themeColors.warningMid;
            case 'BANNED':   return themeColors.error;
            case 'REJECTED': return themeColors.error;
            default:         return themeColors.glass35;
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
            icon: <Fontisto name="play-list" color={themeColors.success} size={18} />,
            label: t('screens.profile.myPlaylists', 'My playlists'),
            sub: playlistCount !== null ? `${playlistCount} ${t('screens.profile.playlistsSuffix', 'playlists')}` : undefined,
            onPress: () => navigation.navigate('MainTabs', { screen: 'Library' }),
        },
        {
            icon: <FontAwesome name="heartbeat" color={themeColors.error} size={18} />,
            label: t('screens.profile.favoriteSongs', 'Favorite songs'),
            sub: favoriteCount !== null ? `${favoriteCount} ${t('screens.profile.songsSuffix', 'songs')}` : undefined,
            onPress: () => navigation.navigate('FavoriteSongs'),
        },
        {
            icon: <FontAwesome name="history" color={themeColors.accentAlt} size={18} />,
            label: t('screens.history.title', 'Listening history'),
            sub: t('screens.profile.listenedSongsSub', 'Songs you listened to'),
            onPress: () => navigation.navigate('History'),
        },
        {
            icon: <FontAwesome name="newspaper-o" color={themeColors.accent} size={18} />,
            label: 'Bài đăng của tôi',
            sub: 'Quản lý nội dung, quyền riêng tư',
            onPress: () => navigation.navigate('MyPosts'),
        },
        {
            icon: <FontAwesome name="flag" color={themeColors.warningMid} size={18} />,
            label: 'Quản lý nội dung',
            sub: 'Bài hát bị báo cáo và trạng thái xử lý',
            onPress: () => navigation.navigate('ContentManagement'),
        },
        {
            icon: <AntDesign name="download" color={themeColors.white} size={18} />,
            label: t('screens.library.downloads', 'Downloads'),
            sub: downloadedSongs.length > 0
                ? `${downloadedSongs.length} ${t('screens.profile.songsSuffix', 'songs')} · ${formatStorage(storageUsed)}`
                : t('screens.profile.noSongsYet', 'No songs yet'),
            onPress: () => setDownloadsOpen(true),
        },
        {
            icon: <SimpleLineIcons name="user-following" color={themeColors.success} size={18} />,
            label: t('artistProfile.following', 'Following'),
            sub: undefined,
            onPress: () => navigation.navigate('Following'),
        },

        {
            icon: '📊',
            label: t('screens.insights.title', 'Insights'),
            onPress: () => navigation.navigate('Insights'),
        }
    ];

    return (
        <View style={styles.root}>
            <StatusBar style="light" />
            <ScrollView showsVerticalScrollIndicator={false}>

                {/* Hero */}
                <LinearGradient
                    colors={[themeColors.gradPurple, themeColors.gradIndigo, themeColors.bg]}
                    locations={[0, 0.5, 1]}
                    style={[styles.hero, { paddingTop: insets.top + 12 }]}
                >
                    <View style={styles.topBar}>
                        <BackButton onPress={() => navigation.goBack()} />
                        <Text style={styles.topBarTitle}>{t('screens.profile.title', 'Profile')}</Text>
                        <Pressable onPress={() => setMenuOpen(p => !p)} style={styles.gearBtn}>
                            <Text style={styles.gearIcon}><Feather name="settings" color={themeColors.white} size={24} /></Text>
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
                            <Text style={{ fontSize: 12 }}><FontAwesome name="edit" color={themeColors.white} size={16} /></Text>
                        </View>
                    </Pressable>

                    <Text style={styles.name}>{displayName}</Text>
                    <Text style={styles.email}>{authSession?.profile?.email}</Text>

                    <Pressable style={styles.editBtn} onPress={() => setEditOpen(true)}>
                        <Text style={styles.editBtnText}>{t('screens.profile.editProfile', 'Edit profile')}</Text>
                    </Pressable>
                </LinearGradient>

                {/* ── Artist card ──────────────────────────────────── */}
                <View style={styles.sectionWrapper}>
                    <Text style={styles.sectionHeading}>{t('labels.artist', 'Artist')}</Text>

                    {loadingArtist ? (
                        <View style={[styles.artistCard, { alignItems: 'center', paddingVertical: 20 }]}>
                            <ActivityIndicator color={themeColors.accent} />
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
                                {t('screens.profile.viewPublicArtistPage', 'Tap to view public artist page')}
                            </Text>
                        </Pressable>
                    ) : (
                        /* No artist profile */
                        <View style={styles.artistCard}>
                            <Text style={styles.artistNoProfileTitle}>🎤 {t('screens.profile.noArtistProfileTitle', 'You do not have an Artist profile')}</Text>
                            <Text style={styles.artistNoProfileDesc}>
                                {t('screens.profile.noArtistProfileDesc', 'Register to upload music, create albums, and share your music with thousands of listeners.')}
                            </Text>
                            <Pressable
                                style={styles.registerArtistBtn}
                                onPress={() => navigation.navigate('RegisterArtist')}
                            >
                                <LinearGradient
                                    colors={[themeColors.accent, themeColors.accentAlt ?? themeColors.accentDim ?? themeColors.accent]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.registerArtistBtnGradient}
                                >
                                    <Text style={styles.registerArtistBtnText}>{t('screens.profile.registerArtistButton', 'Register Artist')} →</Text>
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
                        <Text style={styles.statLabel}>{t('screens.library.downloads', 'Downloads')}</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statVal}>
                            {favoriteCount !== null ? favoriteCount : '—'}
                        </Text>
                        <Text style={styles.statLabel}>{t('labels.likes', 'Likes')}</Text>
                    </View>
                </View>

                {/* ── Menu items ───────────────────────────────────── */}
                <View style={styles.menuCard}>
                    {menuItems.map((item, i) => (
                        <Pressable
                            key={i}
                            style={({ pressed }) => [
                                styles.menuRow,
                                pressed && { backgroundColor: themeColors.glass04 },
                            ]}
                            onPress={item.onPress}
                        >
                            <LinearGradient
                                colors={[themeColors.surface, themeColors.surfaceLow]}
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
                        onPress={() => { setMenuOpen(false); navigation.navigate('Settings'); }}
                    >
                        <Text style={styles.dropText}>⚙️ Cài đặt</Text>
                    </Pressable>
                    <View style={styles.dropDivider} />
                    <Pressable
                        style={styles.dropItem}
                        onPress={() => { setMenuOpen(false); setLogoutOpen(true); }}
                    >
                        <Text style={styles.dropText}>{t('screens.profile.logout', 'Logout')}</Text>
                    </Pressable>
                    <View style={styles.dropDivider} />
                    <Pressable
                        style={styles.dropItem}
                        onPress={() => { setMenuOpen(false); setDeleteOpen(true); }}
                    >
                        <Text style={[styles.dropText, { color: themeColors.error }]}>{t('screens.profile.deleteAccount', 'Delete account')}</Text>
                    </Pressable>
                </View>
            )}

            {/* Edit profile modal */}
            {editOpen && (
                <View style={styles.modalOverlay}>
                    <View style={styles.editModal}>
                        <Text style={styles.modalTitle}>{t('screens.profile.editProfile', 'Edit profile')}</Text>
                        <Text style={styles.modalFieldLabel}>{t('screens.profile.displayNameLabel', 'Display name')}</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={fullName}
                            onChangeText={setFullName}
                            placeholder={t('screens.profile.displayNamePlaceholder', 'Enter display name')}
                            placeholderTextColor={themeColors.glass25}
                        />
                        <View style={styles.modalActions}>
                            <Pressable style={styles.cancelBtn} onPress={() => setEditOpen(false)}>
                                <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
                            </Pressable>
                            <Pressable style={styles.saveBtn} onPress={onSaveProfile}>
                                {saving
                                    ? <ActivityIndicator color={themeColors.white} size="small" />
                                    : <Text style={styles.saveBtnText}>{t('common.save')}</Text>
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
                    style={{ flex: 1, backgroundColor: themeColors.scrim }}
                    onPress={() => setDownloadsOpen(false)}
                />
                <View style={styles.dlSheet}>
                    <View style={styles.dlHandle} />
                    <Text style={styles.dlTitle}>
                        {t('screens.library.downloads', 'Downloads')} · {downloadedSongs.length} {t('screens.profile.songsSuffix', 'songs')}
                    </Text>
                    {downloadedSongs.length === 0 ? (
                        <View style={styles.dlEmpty}>
                            <Text style={{ fontSize: 40, marginBottom: 10 }}>⬇️</Text>
                            <Text style={styles.dlEmptyText}>Chưa có bài hát nào được tải</Text>
                            <Text style={styles.dlEmptyHint}>
                                {t('screens.profile.downloadHint', 'Tap ⬇️ on songs to download for offline listening')}
                            </Text>
                        </View>
                    ) : (
                        <>
                            <Text style={styles.dlStorage}>
                                {t('screens.profile.storageUsed', 'Storage used')}: {formatStorage(storageUsed)}
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
                title={t('screens.profile.deleteAccountConfirmTitle', 'Delete account?')}
                message={t('screens.profile.deleteAccountConfirmMessage', 'This action cannot be undone.')}
                confirmText={t('screens.profile.deleteAccount', 'Delete account')}
                destructive
                onCancel={() => setDeleteOpen(false)}
                onConfirm={onDeleteAccount}
            />
            <ConfirmModal
                visible={logoutOpen}
                title={t('screens.profile.logoutConfirmTitle', 'Confirm logout')}
                message={t('screens.profile.logoutConfirmMessage', 'Are you sure you want to logout?')}
                confirmText={t('screens.profile.logout', 'Logout')}
                onCancel={() => setLogoutOpen(false)}
                onConfirm={async () => { setLogoutOpen(false); await logout(); }}
            />
        </View>
    );
};

const createStyles = (c: ColorScheme) => StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },

    hero: { paddingHorizontal: 20, paddingBottom: 32, alignItems: 'center' },
    topBar: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    topBarTitle: { color: c.text, fontSize: 20, fontWeight: '700' },
    gearBtn:     { padding: 8 },
    gearIcon:    { fontSize: 22 },

    avatarWrap: { position: 'relative', marginBottom: 16 },
    avatar: {
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: c.surface,
    },
    avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
    avatarEmoji: { fontSize: 44 },
    avatarEditBadge: {
        position: 'absolute', bottom: 0, right: 0,
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: c.accent,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: c.bg,
    },

    name:  { color: c.text, fontSize: 22, fontWeight: '800', marginBottom: 4 },
    email: { color: c.glass40, fontSize: 13, marginBottom: 18 },

    editBtn: {
        paddingHorizontal: 22, paddingVertical: 10,
        borderRadius: 999, borderWidth: 1,
        borderColor: c.glass20, backgroundColor: c.glass07,
    },
    editBtnText: { color: c.text, fontWeight: '600', fontSize: 14 },

    // Section wrapper
    sectionWrapper: { marginHorizontal: 20, marginTop: 20 },
    sectionHeading: {
        color: c.text, fontSize: 16, fontWeight: '700', marginBottom: 10,
    },

    // Artist card
    artistCard: {
        backgroundColor: c.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: c.glass10,
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
        backgroundColor: c.accentFill20,
        borderWidth: 1, borderColor: c.accentBorder25,
        alignItems: 'center', justifyContent: 'center',
    },
    artistInfo:      { flex: 1 },
    artistStageName: { color: c.text, fontSize: 16, fontWeight: '700' },
    artistStatus:    { fontSize: 12, marginTop: 2 },
    artistArrow:     { color: c.glass25, fontSize: 22 },
    artistBio:       { color: c.glass50, fontSize: 13, lineHeight: 19 },
    artistViewHint:  { color: c.accent, fontSize: 12 },

    artistNoProfileTitle: {
        color: c.text, fontSize: 15, fontWeight: '700', marginBottom: 6,
    },
    artistNoProfileDesc: {
        color: c.glass50, fontSize: 13, lineHeight: 20,
    },
    registerArtistBtn: { borderRadius: 999, overflow: 'hidden', marginTop: 8 },
    registerArtistBtnGradient: {
        minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 999,
    },
    registerArtistBtnText: { color: c.white, fontWeight: '700', fontSize: 14 },

    // Stats
    statsRow: {
        flexDirection: 'row',
        marginHorizontal: 20,
        marginTop: 20,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.border,
    },
    statItem:  { flex: 1, alignItems: 'center', paddingVertical: 16 },
    statVal:   { color: c.text, fontSize: 20, fontWeight: '800' },
    statLabel: { color: c.muted, fontSize: 11, marginTop: 2 },

    // Menu
    menuCard: {
        marginHorizontal: 20, marginTop: 16,
        borderRadius: 16, overflow: 'hidden',
        backgroundColor: c.surface,
        borderWidth: 1, borderColor: c.border,
    },
    menuRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
    menuIconWrap: {
        width: 36, height: 36, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center',
        marginRight: 14, overflow: 'hidden',
    },
    menuLabel: { color: c.text, fontSize: 15, fontWeight: '500' },
    menuSub:   { color: c.muted, fontSize: 11, marginTop: 1 },
    menuArrow: { color: c.muted, fontSize: 22 },

    // Dropdown
    dropMenu: {
        position: 'absolute', right: 20,
        backgroundColor: c.surface,
        borderWidth: 1, borderColor: c.border,
        borderRadius: 12, zIndex: 50,
        overflow: 'hidden', minWidth: 160,
    },
    dropItem:    { paddingHorizontal: 16, paddingVertical: 14 },
    dropText:    { color: c.text, fontWeight: '600' },
    dropDivider: { height: 1, backgroundColor: c.divider },

    // Edit modal
    modalOverlay: {
        position: 'absolute', inset: 0,
        backgroundColor: c.scrim,
        alignItems: 'center', justifyContent: 'center', padding: 24,
    },
    editModal: {
        width: '100%', backgroundColor: c.surface,
        borderRadius: 20, padding: 20,
        borderWidth: 1, borderColor: c.border,
    },
    modalTitle: { color: c.text, fontSize: 18, fontWeight: '800', marginBottom: 16 },
    modalFieldLabel: {
        color: c.textSecondary, fontSize: 11, fontWeight: '700',
        letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8,
    },
    modalInput: {
        backgroundColor: c.glass07, borderWidth: 1,
        borderColor: c.glass12, borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 12,
        color: c.text, fontSize: 15, marginBottom: 16,
    },
    modalActions:  { flexDirection: 'row', gap: 10 },
    cancelBtn: {
        flex: 1, minHeight: 44, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: c.border,
    },
    cancelBtnText: { color: c.textSecondary, fontWeight: '600' },
    saveBtn: {
        flex: 1, minHeight: 44, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: c.accent,
    },
    saveBtnText: { color: c.white, fontWeight: '700' },

    // Downloads sheet
    dlSheet: {
        backgroundColor: c.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: 36,
        borderWidth: 1,
        borderBottomWidth: 0,
        borderColor: c.border,
    },
    dlHandle: {
        width: 40, height: 4, borderRadius: 2,
        backgroundColor: c.glass20,
        alignSelf: 'center', marginBottom: 16,
    },
    dlTitle:     { color: c.text, fontSize: 18, fontWeight: '800', marginBottom: 4 },
    dlStorage:   { color: c.muted, fontSize: 12, marginBottom: 12 },
    dlEmpty:     { alignItems: 'center', paddingVertical: 32 },
    dlEmptyText: { color: c.textSecondary, fontSize: 16, fontWeight: '600', marginBottom: 6 },
    dlEmptyHint: { color: c.muted, fontSize: 13, textAlign: 'center' },
    dlRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 10, gap: 12,
        borderBottomWidth: 1, borderBottomColor: c.divider,
    },
    dlThumb: {
        width: 44, height: 44, borderRadius: 8,
        backgroundColor: c.surfaceLow,
        alignItems: 'center', justifyContent: 'center',
    },
    dlSongTitle:  { color: c.text, fontSize: 14, fontWeight: '600' },
    dlSongArtist: { color: c.muted, fontSize: 12, marginTop: 2 },
    dlSize:       { color: c.muted, fontSize: 11 },
    dlDeleteBtn: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: c.glass08,
        borderWidth: 1,
        borderColor: c.glass12,
    },
    dlDeleteText: { color: c.error, fontSize: 12, fontWeight: '700' },
    dlCloseBtn: {
        backgroundColor: c.accent,
        borderRadius: 999,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 16,
    },
    dlCloseBtnText: { color: c.white, fontWeight: '700' },
});
