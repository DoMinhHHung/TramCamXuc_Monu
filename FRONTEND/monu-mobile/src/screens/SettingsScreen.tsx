import React, { useMemo } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    StyleSheet,
    Switch,
    useColorScheme,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { ColorScheme, useThemeColors } from '../config/colors';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../context/LocalizationContext';
import { THEMES, ThemeName } from '../config/themes';
import { BackButton } from '../components/BackButton';

const LANGUAGE_OPTIONS = [
    { code: 'vi', labelKey: 'screens.settings.languages.vi', flag: '🇻🇳' },
    { code: 'en', labelKey: 'screens.settings.languages.en', flag: '🇺🇸' },
];

export const SettingsScreen = () => {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { theme, setTheme, followSystem } = useTheme();
    const { language, setLanguage, t } = useTranslation();
    const themeColors = useThemeColors();
    const styles = useMemo(() => createStyles(themeColors), [themeColors]);
    const deviceColorScheme = useColorScheme();

    const THEME_OPTIONS: { id: ThemeName; label: string; emoji: string }[] = useMemo(() => [
        { id: 'dark', label: t('themes.dark'), emoji: '🌙' },
        { id: 'light', label: t('themes.light'), emoji: '☀️' },
        { id: 'classic', label: t('themes.classic'), emoji: '✨' },
    ], [t]);

    const resolveTheme = (themeId: ThemeName) => THEMES[themeId] ?? THEMES.dark;
    const activeTheme = resolveTheme(theme);

    return (
        <View style={styles.root}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
            >
                {/* Header */}
                <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                    <BackButton onPress={() => navigation.goBack()} />
                    <Text style={styles.headerTitle}>{t('screens.settings.title') || 'Cài đặt'}</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Theme Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        {t('screens.settings.themeSection') || 'Chủ đề'}
                    </Text>

                    {/* Theme Options */}
                    <View style={styles.optionsContainer}>
                        {THEME_OPTIONS.map((themeOption) => (
                            <Pressable
                                key={themeOption.id}
                                style={[
                                    styles.themeOption,
                                    theme === themeOption.id && styles.themeOptionActive,
                                ]}
                                onPress={() => setTheme(themeOption.id)}
                            >
                                <View
                                    style={[
                                        styles.themePreviewBox,
                                        {
                                            backgroundColor: resolveTheme(themeOption.id).surface,
                                            borderColor: resolveTheme(themeOption.id).accent,
                                        },
                                    ]}
                                >
                                    <Text style={styles.themeEmoji}>{themeOption.emoji}</Text>
                                </View>
                                <Text style={styles.themeLabel}>{themeOption.label}</Text>
                                {theme === themeOption.id && (
                                    <View style={styles.checkmark}>
                                        <MaterialIcons
                                            name="check-circle"
                                            color={themeColors.accent}
                                            size={20}
                                        />
                                    </View>
                                )}
                            </Pressable>
                        ))}
                    </View>

                    {/* Follow System Toggle */}
                    <View style={styles.toggleRow}>
                        <View>
                            <Text style={styles.toggleLabel}>
                                {t('screens.settings.followSystem') || 'Theo dõi cài đặt hệ thống'}
                            </Text>
                            <Text style={styles.toggleDesc}>
                                {t('screens.settings.followSystemDesc') ||
                                    `Hiện tại là ${deviceColorScheme === 'dark' ? 'tối' : 'sáng'}`}
                            </Text>
                        </View>
                        <Switch
                            value={followSystem}
                            onValueChange={(val) => {
                                if (val) {
                                    setTheme('system');
                                } else {
                                    setTheme(theme);
                                }
                            }}
                            trackColor={{
                                false: themeColors.glass15,
                                true: themeColors.accentBorder40,
                            }}
                            thumbColor={followSystem ? themeColors.accent : themeColors.glass25}
                        />
                    </View>
                </View>

                {/* Language Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        {t('screens.settings.languageSection') || 'Ngôn ngữ'}
                    </Text>

                    <View style={styles.optionsContainer}>
                        {LANGUAGE_OPTIONS.map((lang) => (
                            <Pressable
                                key={lang.code}
                                style={[
                                    styles.languageOption,
                                    language === lang.code && styles.languageOptionActive,
                                ]}
                                onPress={() => setLanguage(lang.code as 'vi' | 'en')}
                            >
                                <Text style={styles.flagEmoji}>{lang.flag}</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.languageLabel}>{t(lang.labelKey)}</Text>
                                    <Text style={styles.languageCode}>({lang.code})</Text>
                                </View>
                                {language === lang.code && (
                                    <MaterialIcons
                                        name="check-circle"
                                        color={themeColors.accent}
                                        size={24}
                                    />
                                )}
                            </Pressable>
                        ))}
                    </View>
                </View>

                {/* About Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        {t('screens.settings.aboutSection') || 'Về ứng dụng'}
                    </Text>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>
                            {t('screens.settings.version') || 'Phiên bản'}
                        </Text>
                        <Text style={styles.infoValue}>1.0.0</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>
                            {t('screens.settings.appName') || 'Ứng dụng'}
                        </Text>
                        <Text style={styles.infoValue}>Monu Music</Text>
                    </View>
                </View>

                {/* Current Settings Display */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        {t('screens.settings.currentSettings') || 'Cài đặt hiện tại'}
                    </Text>

                    <View
                        style={[
                            styles.settingsPreview,
                            {
                                backgroundColor: activeTheme.surface,
                                borderColor: activeTheme.accent,
                            },
                        ]}
                    >
                        <View style={styles.previewRow}>
                            <Text style={styles.previewLabel}>
                                {t('screens.settings.theme') || 'Chủ đề'}:
                            </Text>
                            <Text
                                style={[
                                    styles.previewValue,
                                    { color: activeTheme.accent },
                                ]}
                            >
                                {THEME_OPTIONS.find((t) => t.id === theme)?.label}
                            </Text>
                        </View>

                        <View style={styles.previewRow}>
                            <Text style={styles.previewLabel}>
                                {t('screens.settings.language') || 'Ngôn ngữ'}:
                            </Text>
                            <Text
                                style={[
                                    styles.previewValue,
                                    { color: activeTheme.accent },
                                ]}
                            >
                                {LANGUAGE_OPTIONS.find((l) => l.code === language)
                                    ? t(LANGUAGE_OPTIONS.find((l) => l.code === language)!.labelKey)
                                    : ''}
                            </Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

const createStyles = (colors: ColorScheme) => StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: colors.bg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingBottom: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.white,
        textAlign: 'center',
        flex: 1,
    },
    section: {
        paddingHorizontal: 16,
        marginBottom: 28,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    optionsContainer: {
        gap: 12,
    },
    themeOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: colors.surface,
        borderWidth: 2,
        borderColor: colors.glass15,
    },
    themeOptionActive: {
        borderColor: colors.accent,
        backgroundColor: colors.surface,
    },
    themePreviewBox: {
        width: 50,
        height: 50,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        marginRight: 12,
    },
    themeEmoji: {
        fontSize: 24,
    },
    themeLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.white,
        flex: 1,
    },
    checkmark: {
        marginLeft: 'auto',
    },
    languageOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: colors.surface,
        borderWidth: 2,
        borderColor: colors.glass15,
    },
    languageOptionActive: {
        borderColor: colors.accent,
        backgroundColor: colors.surface,
    },
    flagEmoji: {
        fontSize: 28,
        marginRight: 12,
    },
    languageLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.white,
    },
    languageCode: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.glass15,
        marginTop: 12,
    },
    toggleLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.white,
        marginBottom: 2,
    },
    toggleDesc: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 4,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.glass15,
        marginBottom: 10,
    },
    infoLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.textSecondary,
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.white,
    },
    settingsPreview: {
        paddingVertical: 16,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 2,
    },
    previewRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    previewLabel: {
        fontSize: 13,
        fontWeight: '500',
        color: colors.textSecondary,
    },
    previewValue: {
        fontSize: 13,
        fontWeight: '700',
    },
});
