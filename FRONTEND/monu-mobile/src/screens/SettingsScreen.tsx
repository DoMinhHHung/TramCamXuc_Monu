import React, { useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ThemeColors } from '../config/themes';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../context/LocalizationContext';
import { BackButton } from '../components/BackButton';
import type { RootStackParamList } from '../navigation/AppNavigator';

type SettingsNav = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

type HubTarget = 'PersonalSettings' | 'SystemSettings' | 'AccountSettings';

export const SettingsScreen = () => {
    const navigation = useNavigation<SettingsNav>();
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const { colors: themeColors } = useTheme();
    const styles = useMemo(() => createStyles(themeColors), [themeColors]);

    const hubs: {
        title: string;
        sub: string;
        icon: React.ReactNode;
        target: HubTarget;
    }[] = [
        {
            title: t('screens.settings.personalMenuTitle', 'Cá nhân'),
            sub: t('screens.settings.hubPersonalSub', 'Yêu thích, lịch sử, bài đăng, theo dõi…'),
            icon: <FontAwesome name="user-circle" color={themeColors.accent} size={22} />,
            target: 'PersonalSettings',
        },
        {
            title: t('screens.settings.systemSettingsTitle', 'Cài đặt hệ thống'),
            sub: t('screens.settings.hubSystemSub', 'Chủ đề, ngôn ngữ, thông tin ứng dụng'),
            icon: <MaterialIcons name="tune" color={themeColors.accentAlt} size={24} />,
            target: 'SystemSettings',
        },
        {
            title: t('screens.settings.account.title', 'Cài đặt tài khoản'),
            sub: t('screens.settings.hubAccountSub', 'Chỉnh sửa hồ sơ, avatar, xóa tài khoản'),
            icon: <MaterialIcons name="manage-accounts" color={themeColors.success} size={24} />,
            target: 'AccountSettings',
        },
    ];

    return (
        <View style={styles.root}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
            >
                <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                    <BackButton onPress={() => navigation.goBack()} />
                    <Text style={styles.headerTitle}>{t('screens.settings.title') || 'Cài đặt'}</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.list}>
                    {hubs.map((h) => (
                        <Pressable
                            key={h.target}
                            style={({ pressed }) => [styles.row, pressed && { opacity: 0.92 }]}
                            onPress={() => navigation.navigate(h.target)}
                        >
                            <View style={styles.iconWrap}>{h.icon}</View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.rowTitle}>{h.title}</Text>
                                <Text style={styles.rowSub}>{h.sub}</Text>
                            </View>
                            <MaterialIcons name="chevron-right" color={themeColors.muted} size={26} />
                        </Pressable>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingBottom: 20,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.white,
        textAlign: 'center',
        flex: 1,
    },
    list: { paddingHorizontal: 16, gap: 12 },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 16,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.glass15,
        gap: 14,
    },
    iconWrap: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: colors.glass07,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rowTitle: { fontSize: 17, fontWeight: '700', color: colors.white },
    rowSub: { fontSize: 12, color: colors.textSecondary, marginTop: 4, lineHeight: 17 },
});
