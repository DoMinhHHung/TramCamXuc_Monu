import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ColorScheme, useThemeColors } from '../../config/colors';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LocalizationContext';
import { deleteMyProfile } from '../../services/auth';
import { BackButton } from '../../components/BackButton';
import { ConfirmModal } from '../../components/ConfirmModal';
import type { RootStackParamList } from '../../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'DeleteAccount'>;

export const DeleteAccountScreen = () => {
    const navigation = useNavigation<Nav>();
    const insets = useSafeAreaInsets();
    const { logout } = useAuth();
    const { t } = useTranslation();
    const themeColors = useThemeColors();
    const styles = useMemo(() => createStyles(themeColors), [themeColors]);

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const onDelete = async () => {
        if (deleting) return;
        try {
            setDeleting(true);
            await deleteMyProfile();
            setConfirmOpen(false);
            await logout();
        } catch (error: any) {
            Alert.alert(
                t('common.error'),
                error?.message || t('screens.profile.deleteAccountFailed', 'Cannot delete account.'),
            );
        } finally {
            setDeleting(false);
        }
    };

    return (
        <View style={styles.root}>
            <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
                <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                    <BackButton onPress={() => navigation.goBack()} />
                    <Text style={styles.headerTitle}>{t('screens.profile.deleteAccount', 'Delete account')}</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.card}>
                    <Text style={styles.warnEmoji}>⚠️</Text>
                    <Text style={styles.title}>
                        {t('screens.settings.deleteAccount.lead', 'Thao tác này không thể hoàn tác')}
                    </Text>
                    <Text style={styles.body}>
                        {t(
                            'screens.settings.deleteAccount.body',
                            'Tài khoản, dữ liệu cá nhân và các nội dung liên quan sẽ bị xóa vĩnh viễn theo chính sách của ứng dụng.',
                        )}
                    </Text>
                    <Pressable
                        style={({ pressed }) => [styles.dangerBtn, pressed && { opacity: 0.9 }]}
                        onPress={() => setConfirmOpen(true)}
                    >
                        <Text style={styles.dangerBtnText}>
                            {t('screens.profile.deleteAccount', 'Delete account')}
                        </Text>
                    </Pressable>
                </View>
            </ScrollView>

            <ConfirmModal
                visible={confirmOpen}
                title={t('screens.profile.deleteAccountConfirmTitle', 'Delete account?')}
                message={t('screens.profile.deleteAccountConfirmMessage', 'This action cannot be undone.')}
                confirmText={t('screens.profile.deleteAccount', 'Delete account')}
                destructive
                onCancel={() => setConfirmOpen(false)}
                onConfirm={() => void onDelete()}
            />
        </View>
    );
};

const createStyles = (c: ColorScheme) => StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingBottom: 20,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: c.error,
        textAlign: 'center',
        flex: 1,
    },
    card: {
        marginHorizontal: 20,
        padding: 24,
        borderRadius: 16,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.border,
        alignItems: 'center',
    },
    warnEmoji: { fontSize: 40, marginBottom: 12 },
    title: {
        color: c.text,
        fontSize: 18,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 12,
    },
    body: {
        color: c.muted,
        fontSize: 14,
        lineHeight: 22,
        textAlign: 'center',
        marginBottom: 24,
    },
    dangerBtn: {
        backgroundColor: c.error,
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 24,
        width: '100%',
        alignItems: 'center',
    },
    dangerBtnText: { color: c.white, fontWeight: '800', fontSize: 16 },
});
