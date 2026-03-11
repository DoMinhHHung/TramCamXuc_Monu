import React, { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ConfirmModal } from '../../components/ConfirmModal';
import { COLORS } from '../../config/colors';
import { useAuth } from '../../context/AuthContext';
import { deleteMyProfile, updateMyProfile, uploadAvatar } from '../../services/auth';

export const ProfileScreen = () => {
  const { authSession, refreshProfile, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState(authSession?.profile?.fullName ?? '');

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Quyền truy cập bị từ chối', 'Vui lòng cấp quyền để chọn ảnh đại diện.');
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

  const onLogout = async () => {
    setLogoutOpen(false);
    await logout();
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View />
        <Pressable onPress={() => setMenuOpen((prev) => !prev)}>
          <Text style={styles.gear}>⚙️</Text>
        </Pressable>
      </View>

      <Pressable onPress={pickAvatar} style={styles.avatarWrap}>
        {authSession?.profile?.avatarUrl ? (
          <Image source={{ uri: authSession.profile.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarEmoji}>👤</Text>
          </View>
        )}
      </Pressable>

      <Text style={styles.name}>{authSession?.profile?.fullName ?? authSession?.profile?.email ?? 'Phazel User'}</Text>

      <Pressable style={styles.editButton} onPress={() => setEditOpen(true)}>
        <Text style={styles.editText}>Edit Profile</Text>
      </Pressable>

      {menuOpen && (
        <View style={styles.menu}>
          <Pressable style={styles.menuItem} onPress={() => setLogoutOpen(true)}>
            <Text style={styles.menuText}>Đăng xuất</Text>
          </Pressable>
          <Pressable style={styles.menuItem} onPress={() => setDeleteOpen(true)}>
            <Text style={[styles.menuText, styles.deleteText]}>Xóa tài khoản</Text>
          </Pressable>
        </View>
      )}

      {editOpen && (
        <View style={styles.editModal}>
          <Text style={styles.modalTitle}>Chỉnh sửa hồ sơ</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Nhập tên hiển thị"
            placeholderTextColor={COLORS.muted}
          />
          <View style={styles.modalActions}>
            <Pressable style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setEditOpen(false)}>
              <Text style={styles.modalCancelText}>Hủy</Text>
            </Pressable>
            <Pressable style={[styles.modalBtn, styles.saveBtn]} onPress={onSaveProfile}>
              {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.modalSaveText}>Lưu</Text>}
            </Pressable>
          </View>
        </View>
      )}

      <ConfirmModal
        visible={deleteOpen}
        title="Are you sure?"
        message="This action is irreversible"
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
        onConfirm={onLogout}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 20 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gear: { fontSize: 22 },
  avatarWrap: { marginTop: 30, alignSelf: 'center' },
  avatar: { width: 112, height: 112, borderRadius: 56, backgroundColor: COLORS.surface },
  avatarPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  avatarEmoji: { fontSize: 48 },
  name: { marginTop: 16, textAlign: 'center', color: COLORS.text, fontSize: 24, fontWeight: '700' },
  editButton: {
    marginTop: 14,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
  },
  editText: { color: COLORS.text, fontWeight: '600' },
  menu: {
    position: 'absolute',
    right: 20,
    top: 50,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    zIndex: 20,
  },
  menuItem: { paddingHorizontal: 14, paddingVertical: 12 },
  menuText: { color: COLORS.text, fontWeight: '600' },
  deleteText: { color: COLORS.error },
  editModal: {
    marginTop: 30,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },
  modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700', marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text,
    backgroundColor: COLORS.bg,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  modalBtn: { flex: 1, minHeight: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border },
  saveBtn: { backgroundColor: COLORS.accentDim },
  modalCancelText: { color: COLORS.text, fontWeight: '600' },
  modalSaveText: { color: COLORS.white, fontWeight: '700' },
});
