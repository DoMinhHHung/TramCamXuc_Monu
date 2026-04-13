import React, { useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ColorScheme, useThemeColors } from '../../config/colors';
import { useTranslation } from '../../context/LocalizationContext';
import { BackButton } from '../../components/BackButton';
import type { RootStackParamList } from '../../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'AccountSettings'>;

export const AccountSettingsScreen = () => {
    const navigation = useNavigation<Nav>();
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const themeColors = useThemeColors();
    const styles = useMemo(() => createStyles(themeColors), [themeColors]);

    const rows: { label: string; sub?: string; icon: React.ReactNode; onPress: () => void; danger?: boolean }[] = [
        {
            icon: <FontAwesome name="edit" color={themeColors.accent} size={18} />,
            label: t('screens.profile.editProfile', 'Edit profile'),
            sub: t('screens.settings.account.editSub', 'Tên hiển thị'),
            onPress: () => navigation.navigate('EditProfile'),
        },
        {
            icon: <MaterialIcons name="photo-camera" color={themeColors.accentAlt} size={20} />,
            label: t('screens.settings.account.updateAvatar', 'Cập nhật Avatar'),
            sub: t('screens.settings.account.avatarSub', 'Ảnh đại diện tài khoản'),
            onPress: () => navigation.navigate('UpdateAvatar'),
        },
        {
            icon: <MaterialIcons name="person-off" color={themeColors.error} size={20} />,
            label: t('screens.profile.deleteAccount', 'Delete account'),
            danger: true,
            onPress: () => navigation.navigate('DeleteAccount'),
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
                    <Text style={styles.headerTitle}>
                        {t('screens.settings.account.title', 'Cài đặt tài khoản')}
                    </Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.card}>
                    {rows.map((item, i) => (
                        <Pressable
                            key={i}
                            style={({ pressed }) => [
                                styles.row,
                                i < rows.length - 1 && styles.rowBorder,
                                pressed && { backgroundColor: themeColors.glass06 },
                            ]}
                            onPress={item.onPress}
                        >
                            <View style={styles.iconWrap}>{item.icon}</View>
                            <View style={{ flex: 1 }}>
                                <Text
                                    style={[
                                        styles.label,
                                        item.danger && { color: themeColors.error },
                                    ]}
                                >
                                    {item.label}
                                </Text>
                                {item.sub ? <Text style={styles.sub}>{item.sub}</Text> : null}
                            </View>
                            <MaterialIcons name="chevron-right" color={themeColors.glass25} size={22} />
                        </Pressable>
                    ))}
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
        paddingBottom: 16,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: c.white,
        textAlign: 'center',
        flex: 1,
    },
    card: {
        marginHorizontal: 16,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.border,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 14,
        gap: 12,
    },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: c.divider },
    iconWrap: {
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: c.glass07,
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: { fontSize: 15, fontWeight: '600', color: c.white },
    sub: { fontSize: 11, color: c.muted, marginTop: 2 },
});
