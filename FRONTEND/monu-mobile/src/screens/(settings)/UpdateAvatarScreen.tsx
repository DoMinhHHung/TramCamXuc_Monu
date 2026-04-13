import React, { useMemo, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    StyleSheet,
    Image,
    ActivityIndicator,
    Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ColorScheme, useThemeColors } from '../../config/colors';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LocalizationContext';
import { uploadAvatar } from '../../services/auth';
import { BackButton } from '../../components/BackButton';
import type { RootStackParamList } from '../../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'UpdateAvatar'>;

export const UpdateAvatarScreen = () => {
    const navigation = useNavigation<Nav>();
    const insets = useSafeAreaInsets();
    const { authSession, refreshProfile } = useAuth();
    const { t } = useTranslation();
    const themeColors = useThemeColors();
    const styles = useMemo(() => createStyles(themeColors), [themeColors]);
    const [busy, setBusy] = useState(false);

    const pickAvatar = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert(
                t('screens.profile.permissionDeniedTitle', 'Permission denied'),
                t('screens.profile.permissionDeniedMessage', 'Please grant permission to select image.'),
            );
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
            setBusy(true);
            await uploadAvatar(result.assets[0].uri);
            await refreshProfile();
            Alert.alert(t('common.success'), t('screens.profile.avatarUpdated', 'Đã cập nhật ảnh đại diện.'), [
                { text: t('common.done'), onPress: () => navigation.goBack() },
            ]);
        } catch (error: any) {
            Alert.alert(
                t('common.error'),
                error?.message || t('screens.profile.updateAvatarFailed', 'Cannot update avatar.'),
            );
        } finally {
            setBusy(false);
        }
    };

    return (
        <View style={styles.root}>
            <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
                <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                    <BackButton onPress={() => navigation.goBack()} />
                    <Text style={styles.headerTitle}>
                        {t('screens.settings.account.updateAvatar', 'Cập nhật Avatar')}
                    </Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.card}>
                    <View style={styles.avatarWrap}>
                        {authSession?.profile?.avatarUrl ? (
                            <Image source={{ uri: authSession.profile.avatarUrl }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, styles.placeholder]}>
                                <Text style={styles.placeholderEmoji}>👤</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.hint}>
                        {t('screens.settings.account.avatarHint', 'Chọn ảnh mới từ thư viện. Ảnh sẽ được cắt vuông.')}
                    </Text>
                    <Pressable
                        style={({ pressed }) => [styles.btn, pressed && { opacity: 0.9 }]}
                        onPress={() => void pickAvatar()}
                        disabled={busy}
                    >
                        {busy ? (
                            <ActivityIndicator color={themeColors.white} />
                        ) : (
                            <Text style={styles.btnText}>
                                {t('screens.settings.account.choosePhoto', 'Chọn ảnh')}
                            </Text>
                        )}
                    </Pressable>
                </View>
            </ScrollView>
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
        color: c.white,
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
    avatarWrap: { marginBottom: 16 },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: c.surfaceLow,
    },
    placeholder: { alignItems: 'center', justifyContent: 'center' },
    placeholderEmoji: { fontSize: 48 },
    hint: {
        color: c.muted,
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
    },
    btn: {
        backgroundColor: c.accent,
        borderRadius: 999,
        paddingVertical: 14,
        paddingHorizontal: 28,
        minWidth: 200,
        alignItems: 'center',
    },
    btnText: { color: c.white, fontWeight: '700', fontSize: 16 },
});
