import React, { useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome, SimpleLineIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ColorScheme, useThemeColors } from '../../config/colors';
import { useTranslation } from '../../context/LocalizationContext';
import { BackButton } from '../../components/BackButton';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
import type { RootStackParamList } from '../../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'PersonalSettings'>;

export const PersonalSettingsScreen = () => {
    const navigation = useNavigation<Nav>();
    const insets = useSafeAreaInsets();
    const { padH } = useResponsiveLayout();
    const { t } = useTranslation();
    const themeColors = useThemeColors();
    const styles = useMemo(() => createStyles(themeColors), [themeColors]);

    const rows: { label: string; sub?: string; icon: React.ReactNode; onPress: () => void }[] = [
        {
            icon: <FontAwesome name="microphone" color={themeColors.accent} size={18} />,
            label: t('screens.settings.personal.favoriteArtists', 'Nghệ sĩ yêu thích'),
            sub: t('screens.settings.personal.favoriteArtistsSub', 'Chỉnh sửa trong mục yêu thích'),
            onPress: () => navigation.navigate('EditFavorites'),
        },
        {
            icon: <FontAwesome name="music" color={themeColors.accentAlt} size={18} />,
            label: t('screens.settings.personal.favoriteGenres', 'Thể loại yêu thích'),
            sub: t('screens.settings.personal.favoriteGenresSub', 'Chỉnh sửa trong mục yêu thích'),
            onPress: () => navigation.navigate('EditFavorites'),
        },
        {
            icon: <FontAwesome name="history" color={themeColors.accentAlt} size={18} />,
            label: t('screens.history.title', 'Listening history'),
            sub: t('screens.profile.listenedSongsSub', 'Songs you listened to'),
            onPress: () => navigation.navigate('History'),
        },
        {
            icon: <FontAwesome name="newspaper-o" color={themeColors.accent} size={18} />,
            label: t('screens.settings.personal.myPosts', 'Quản lý bài đăng'),
            sub: t('screens.settings.personal.myPostsSub', 'Bài đăng của tôi'),
            onPress: () => navigation.navigate('MyPosts'),
        },
        {
            icon: <SimpleLineIcons name="user-following" color={themeColors.success} size={18} />,
            label: t('artistProfile.following', 'Following'),
            onPress: () => navigation.navigate('Following'),
        },
        {
            icon: <Text style={{ fontSize: 16 }}>📊</Text>,
            label: t('screens.insights.title', 'Insights'),
            onPress: () => navigation.navigate('Insights'),
        },
    ];

    return (
        <View style={styles.root}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
            >
                <View style={[styles.header, { paddingTop: insets.top + 12, paddingHorizontal: padH }]}>
                    <BackButton onPress={() => navigation.goBack()} />
                    <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                        {t('screens.settings.personalMenuTitle', 'Cá nhân')}
                    </Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={[styles.card, { marginHorizontal: padH }]}>
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
                                <Text style={styles.label}>{item.label}</Text>
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
