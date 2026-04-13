import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    StyleSheet,
    TextInput,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ColorScheme, useThemeColors } from '../../config/colors';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LocalizationContext';
import { updateMyProfile } from '../../services/auth';
import { BackButton } from '../../components/BackButton';
import type { RootStackParamList } from '../../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'EditProfile'>;

export const EditProfileScreen = () => {
    const navigation = useNavigation<Nav>();
    const insets = useSafeAreaInsets();
    const { authSession, refreshProfile } = useAuth();
    const { t } = useTranslation();
    const themeColors = useThemeColors();
    const styles = useMemo(() => createStyles(themeColors), [themeColors]);

    const [fullName, setFullName] = useState(authSession?.profile?.fullName ?? '');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setFullName(authSession?.profile?.fullName ?? '');
    }, [authSession?.profile?.fullName]);

    const onSave = async () => {
        try {
            setSaving(true);
            await updateMyProfile({ fullName: fullName.trim() });
            await refreshProfile();
            navigation.goBack();
        } catch (error: any) {
            Alert.alert(
                t('common.error'),
                error?.message || t('screens.profile.updateProfileFailed', 'Cannot update profile.'),
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={styles.root}>
            <ScrollView
                contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
                keyboardShouldPersistTaps="handled"
            >
                <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                    <BackButton onPress={() => navigation.goBack()} />
                    <Text style={styles.headerTitle}>{t('screens.profile.editProfile', 'Edit profile')}</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.card}>
                    <Text style={styles.fieldLabel}>{t('screens.profile.displayNameLabel', 'Display name')}</Text>
                    <TextInput
                        style={styles.input}
                        value={fullName}
                        onChangeText={setFullName}
                        placeholder={t('screens.profile.displayNamePlaceholder', 'Enter display name')}
                        placeholderTextColor={themeColors.glass25}
                    />
                    <Pressable
                        style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.9 }]}
                        onPress={() => void onSave()}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color={themeColors.white} />
                        ) : (
                            <Text style={styles.saveBtnText}>{t('common.save')}</Text>
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
        padding: 20,
        borderRadius: 16,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.border,
    },
    fieldLabel: {
        color: c.textSecondary,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    input: {
        backgroundColor: c.glass07,
        borderWidth: 1,
        borderColor: c.glass12,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        color: c.text,
        fontSize: 15,
        marginBottom: 20,
    },
    saveBtn: {
        backgroundColor: c.accent,
        borderRadius: 12,
        minHeight: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveBtnText: { color: c.white, fontWeight: '700', fontSize: 16 },
});
