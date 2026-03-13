import React, { useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import {
    ActivityIndicator, Alert, Image, Pressable,
    ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmModal } from '../../components/ConfirmModal';
import { COLORS } from '../../config/colors';
import { useAuth } from '../../context/AuthContext';
import { deleteMyProfile, updateMyProfile, uploadAvatar } from '../../services/auth';
import { getMySubscription } from '../../services/payment';
import { apiClient } from '../../services/api';
import { BackButton } from '../../components/BackButton';
import { useNavigation } from '@react-navigation/native';

export const ProfileScreen = () => {
    const { authSession, refreshProfile, logout } = useAuth();
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const [menuOpen, setMenuOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [logoutOpen, setLogoutOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [fullName, setFullName] = useState(authSession?.profile?.fullName ?? '');
    const [canBecomeArtist, setCanBecomeArtist] = useState(false);

    const pickAvatar = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) { Alert.alert('Quyền truy cập bị từ chối', 'Vui lòng cấp quyền để chọn ảnh.'); return; }
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
        if (result.canceled || !result.assets?.[0]) return;
        try { setSaving(true); await uploadAvatar(result.assets[0].uri); await refreshProfile(); }
        catch (error: any) { Alert.alert('Lỗi', error?.message || 'Không thể cập nhật avatar.'); }
        finally { setSaving(false); }
    };

    const onSaveProfile = async () => {
        try { setSaving(true); await updateMyProfile({ fullName: fullName.trim() }); await refreshProfile(); setEditOpen(false); }
        catch (error: any) { Alert.alert('Lỗi', error?.message || 'Không thể cập nhật hồ sơ.'); }
        finally { setSaving(false); }
    };


    useEffect(() => {
        const loadSubscriptionFeature = async () => {
            try {
                const sub = await getMySubscription();
                setCanBecomeArtist(Boolean(sub?.plan?.features?.can_become_artist));
            } catch {
                setCanBecomeArtist(false);
            }
        };
        void loadSubscriptionFeature();
    }, []);

    const registerArtist = async () => {
        try {
            await apiClient.post('/artists/register', {
                stageName: authSession?.profile?.fullName || authSession?.profile?.email?.split('@')[0] || 'My Artist',
                bio: 'Artist from Monu',
            });
            Alert.alert('Thành công', 'Đã gửi đăng ký artist.');
        } catch (error: any) {
            Alert.alert('Lỗi', error?.message || 'Không thể đăng ký artist');
        }
    };

    const updateArtist = async () => {
        try {
            await apiClient.put('/artists/me', {
                stageName: authSession?.profile?.fullName || 'My Artist',
                bio: 'Updated from profile',
            });
            Alert.alert('Thành công', 'Đã cập nhật artist profile.');
        } catch (error: any) {
            Alert.alert('Lỗi', error?.message || 'Không thể cập nhật artist profile');
        }
    };

    const onDeleteAccount = async () => {
        try { setSaving(true); await deleteMyProfile(); setDeleteOpen(false); await logout(); }
        catch (error: any) { Alert.alert('Lỗi', error?.message || 'Không thể xóa tài khoản.'); }
        finally { setSaving(false); }
    };

    return (
        <View style={styles.root}>
            <StatusBar style="light" />
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Gradient hero */}
                <LinearGradient
                    colors={[COLORS.gradPurple, COLORS.gradIndigo, COLORS.bg]}
                    locations={[0, 0.5, 1]}
                    style={[styles.hero, { paddingTop: insets.top + 12 }]}
                >
                    {/* Top bar */}
                    <View style={styles.topBar}>
                        <BackButton onPress={() => navigation.goBack()}/>
                        <Text style={styles.topBarTitle}>Hồ sơ</Text>
                        <Pressable onPress={() => setMenuOpen(p => !p)} style={styles.gearBtn}>
                            <Text style={styles.gearIcon}>⚙️</Text>
                        </Pressable>
                    </View>

                    {/* Avatar */}
                    <Pressable onPress={pickAvatar} style={styles.avatarWrap}>
                        {authSession?.profile?.avatarUrl ? (
                            <Image source={{ uri: authSession.profile.avatarUrl }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                <Text style={styles.avatarEmoji}>👤</Text>
                            </View>
                        )}
                        <View style={styles.avatarEditBadge}>
                            <Text style={{ fontSize: 12 }}>✏️</Text>
                        </View>
                    </Pressable>

                    <Text style={styles.name}>{authSession?.profile?.fullName ?? authSession?.profile?.email ?? 'Phazel User'}</Text>
                    <Text style={styles.email}>{authSession?.profile?.email}</Text>

                    <Pressable style={styles.editBtn} onPress={() => setEditOpen(true)}>
                        <Text style={styles.editBtnText}>Chỉnh sửa hồ sơ</Text>
                    </Pressable>
                </LinearGradient>


                {canBecomeArtist && (
                    <View style={styles.artistCard}>
                        <Text style={styles.artistTitle}>Nâng cấp Artist đã bật</Text>
                        <View style={styles.artistActions}>
                            <Pressable style={styles.artistBtn} onPress={registerArtist}><Text style={styles.artistBtnText}>Đăng ký artist</Text></Pressable>
                            <Pressable style={styles.artistBtn} onPress={updateArtist}><Text style={styles.artistBtnText}>Sửa artist</Text></Pressable>
                            <Pressable style={styles.artistBtn} onPress={() => Alert.alert('Thông báo', 'Backend chưa có API xóa artist profile.') }><Text style={styles.artistBtnText}>Xóa artist</Text></Pressable>
                        </View>
                    </View>
                )}

                {/* Stats row */}
                <View style={styles.statsRow}>
                    {[{ label: 'Playlist', val: '12' }, { label: 'Nghe gần đây', val: '48' }, { label: 'Yêu thích', val: '203' }].map((s, i) => (
                        <View key={i} style={styles.statItem}>
                            <Text style={styles.statVal}>{s.val}</Text>
                            <Text style={styles.statLabel}>{s.label}</Text>
                        </View>
                    ))}
                </View>

                {/* Menu items */}
                <View style={styles.menuCard}>
                    {[
                        { icon: '🎵', label: 'Playlist của tôi' },
                        { icon: '❤️', label: 'Bài hát yêu thích' },
                        { icon: '⬇️', label: 'Đã tải xuống' },
                        { icon: '📊', label: 'Thống kê nghe nhạc' },
                    ].map((item, i) => (
                        <Pressable key={i} style={[styles.menuRow, i < 3 && styles.menuRowBorder]}>
                            <LinearGradient colors={[COLORS.surface, COLORS.surfaceLow]} style={styles.menuIconWrap}>
                                <Text>{item.icon}</Text>
                            </LinearGradient>
                            <Text style={styles.menuLabel}>{item.label}</Text>
                            <Text style={styles.menuArrow}>›</Text>
                        </Pressable>
                    ))}
                </View>

                <View style={{ height: insets.bottom + 20 }} />
            </ScrollView>

            {/* Dropdown menu (legacy) - kept for compat but now using card list above */}
            {menuOpen && (
                <View style={[styles.dropMenu, { top: insets.top + 54 }]}>
                    <Pressable style={styles.dropItem} onPress={() => { setMenuOpen(false); setLogoutOpen(true); }}>
                        <Text style={styles.dropText}>Đăng xuất</Text>
                    </Pressable>
                    <View style={styles.dropDivider} />
                    <Pressable style={styles.dropItem} onPress={() => { setMenuOpen(false); setDeleteOpen(true); }}>
                        <Text style={[styles.dropText, { color: COLORS.error }]}>Xóa tài khoản</Text>
                    </Pressable>
                </View>
            )}

            {/* Edit modal */}
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
                            placeholderTextColor="COLORS.glass25"
                        />
                        <View style={styles.modalActions}>
                            <Pressable style={styles.cancelBtn} onPress={() => setEditOpen(false)}>
                                <Text style={styles.cancelBtnText}>Hủy</Text>
                            </Pressable>
                            <Pressable style={styles.saveBtn} onPress={onSaveProfile}>
                                {saving ? <ActivityIndicator color={COLORS.white} size="small" /> : <Text style={styles.saveBtnText}>Lưu</Text>}
                            </Pressable>
                        </View>
                    </View>
                </View>
            )}

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
    topBar: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    topBarTitle: { color: COLORS.white, fontSize: 20, fontWeight: '700' },
    gearBtn: { padding: 8 },
    gearIcon: { fontSize: 22 },

    avatarWrap: { position: 'relative', marginBottom: 16 },
    avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.surface },
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
    email: { color: 'COLORS.glass40', fontSize: 13, marginBottom: 18 },

    editBtn: {
        paddingHorizontal: 22,
        paddingVertical: 10,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: 'COLORS.glass20',
        backgroundColor: 'COLORS.glass07',
    },
    editBtnText: { color: COLORS.white, fontWeight: '600', fontSize: 14 },

    artistCard: { marginHorizontal: 20, marginTop: 16, backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.glass10, padding: 12 },
    artistTitle: { color: COLORS.white, fontWeight: '800', marginBottom: 8 },
    artistActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    artistBtn: { backgroundColor: COLORS.accentFill20, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.accentBorder25 },
    artistBtnText: { color: COLORS.accent, fontWeight: '700', fontSize: 12 },

    statsRow: {
        flexDirection: 'row',
        marginHorizontal: 20,
        marginTop: 20,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: 'COLORS.glass04',
        borderWidth: 1,
        borderColor: 'COLORS.glass07',
    },
    statItem: { flex: 1, alignItems: 'center', paddingVertical: 16 },
    statVal: { color: COLORS.white, fontSize: 20, fontWeight: '800' },
    statLabel: { color: 'COLORS.glass35', fontSize: 11, marginTop: 2 },

    menuCard: {
        marginHorizontal: 20,
        marginTop: 16,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: 'COLORS.glass03',
        borderWidth: 1,
        borderColor: 'COLORS.glass07',
    },
    dangerCard: { marginBottom: 16 },
    menuRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
    menuRowBorder: { height: 1, backgroundColor: 'COLORS.glass06', marginHorizontal: 16 },
    menuIconWrap: {
        width: 36, height: 36, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center',
        marginRight: 14, overflow: 'hidden',
    },
    dangerIconWrap: { backgroundColor: 'COLORS.glass06' },
    deleteIconWrap: { backgroundColor: 'COLORS.errorDim' },
    menuLabel: { flex: 1, color: COLORS.white, fontSize: 15, fontWeight: '500' },
    menuArrow: { color: 'COLORS.glass20', fontSize: 22 },
    deleteText: { color: COLORS.error },

    dropMenu: {
        position: 'absolute',
        right: 20,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.glass10,
        borderRadius: 12,
        zIndex: 50,
        overflow: 'hidden',
        minWidth: 160,
    },
    dropItem: { paddingHorizontal: 16, paddingVertical: 14 },
    dropText: { color: COLORS.white, fontWeight: '600' },
    dropDivider: { height: 1, backgroundColor: 'COLORS.glass08' },

    modalOverlay: {
        position: 'absolute', inset: 0,
        backgroundColor: 'COLORS.scrim',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    editModal: {
        width: '100%',
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: COLORS.glass10,
    },
    modalTitle: { color: COLORS.white, fontSize: 18, fontWeight: '800', marginBottom: 16 },
    modalFieldLabel: {
        color: 'COLORS.glass40',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    modalInput: {
        backgroundColor: 'COLORS.glass07',
        borderWidth: 1,
        borderColor: 'COLORS.glass12',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        color: COLORS.white,
        fontSize: 15,
        marginBottom: 16,
    },
    modalActions: { flexDirection: 'row', gap: 10 },
    cancelBtn: {
        flex: 1, minHeight: 44, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: 'COLORS.glass15',
    },
    cancelBtnText: { color: 'COLORS.glass70', fontWeight: '600' },
    saveBtn: {
        flex: 1, minHeight: 44, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: COLORS.accent,
    },
    saveBtnText: { color: COLORS.white, fontWeight: '700' },
});