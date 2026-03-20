import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { forgotPassword } from '../../services/auth';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { ColorScheme, useThemeColors } from '../../config/colors';
import { BackButton } from '../../components/BackButton';
import { useTranslation } from '../../context/LocalizationContext';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen() {
    const navigation = useNavigation<Nav>();
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const themeColors = useThemeColors();
    const styles = useMemo(() => createStyles(themeColors), [themeColors]);
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async () => {
        if (!email.trim()) { Alert.alert(t('common.error'), t('screens.authForgot.emailRequired')); return; }
        setLoading(true);
        try {
            await forgotPassword(email.trim());
            setSent(true);
        } catch (e: any) {
            Alert.alert(t('common.error'), e?.message || t('screens.authForgot.notFound'));
        } finally { setLoading(false); }
    };

    return (
        <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <StatusBar style="light" />

            <LinearGradient
                colors={[themeColors.gradIndigo, themeColors.bg]}
                style={[styles.gradientTop, { paddingTop: insets.top + 12 }]}
            >
                <BackButton onPress={() => navigation.goBack()} />

                <View style={styles.iconWrap}>
                    <Text style={{ fontSize: 40 }}>{sent ? '✅' : '🔑'}</Text>
                </View>
            </LinearGradient>

            <View style={[styles.form, { paddingBottom: insets.bottom + 32 }]}>
                <Text style={styles.title}>
                    {sent ? t('screens.authForgot.sentTitle') : t('screens.authForgot.title')}
                </Text>
                <Text style={styles.subtitle}>
                    {sent
                        ? t('screens.authForgot.sentSubtitle')
                        : t('screens.authForgot.subtitle')}
                </Text>

                {sent && (
                    <View style={styles.emailHighlight}>
                        <Text style={styles.emailHighlightText}>{email}</Text>
                    </View>
                )}

                {!sent ? (
                    <>
                        <Text style={styles.fieldLabel}>{t('auth.email')}</Text>
                        <TextInput
                            style={styles.input}
                            value={email}
                            onChangeText={setEmail}
                            placeholder="you@example.com"
                            placeholderTextColor={themeColors.glass25}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />

                        <Pressable
                            style={({ pressed }) => [styles.btn, (loading || pressed) && { opacity: 0.8 }]}
                            onPress={handleSubmit}
                            disabled={loading}
                        >
                            <LinearGradient
                                colors={[themeColors.accent, themeColors.accentAlt]}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                style={styles.btnGradient}
                            >
                                <Text style={styles.btnText}>{loading ? t('screens.authForgot.sending') : t('screens.authForgot.sendOtp')}</Text>
                            </LinearGradient>
                        </Pressable>
                    </>
                ) : (
                    <>
                        <Pressable
                            style={({ pressed }) => [styles.btn, pressed && { opacity: 0.8 }]}
                            onPress={() => navigation.navigate('ResetPassword', { email: email.trim() })}
                        >
                            <LinearGradient
                                colors={[themeColors.accent, themeColors.accentAlt]}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                style={styles.btnGradient}
                            >
                                <Text style={styles.btnText}>{t('screens.authForgot.enterOtp')}</Text>
                            </LinearGradient>
                        </Pressable>

                        <Pressable style={styles.secondaryBtn} onPress={() => setSent(false)}>
                            <Text style={styles.secondaryBtnText}>{t('screens.authForgot.useDifferentEmail')}</Text>
                        </Pressable>
                    </>
                )}
            </View>
        </KeyboardAvoidingView>
    );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    gradientTop: { paddingHorizontal: 24, paddingBottom: 36 },
    iconWrap: {
        width: 88, height: 88, borderRadius: 44,
        backgroundColor: colors.glass07,
        borderWidth: 1.5,
        borderColor: colors.accentBorder40,
        alignItems: 'center', justifyContent: 'center',
        marginTop: 24, marginBottom: 20, alignSelf: 'center',
    },
    title: { color: colors.white, fontSize: 28, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
    subtitle: { color: colors.glass50, fontSize: 15, textAlign: 'center', lineHeight: 22 },
    emailHighlight: {
        marginTop: 14,
        alignSelf: 'center',
        backgroundColor: colors.accentFill20,
        borderRadius: 999,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: colors.accentBorder30,
    },
    emailHighlightText: { color: colors.accent, fontWeight: '700', fontSize: 14 },
    form: { paddingHorizontal: 24, paddingTop: 8 },
    fieldLabel: {
        color: colors.glass40,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        marginBottom: 8,
        marginTop: 16,
    },
    input: {
        backgroundColor: colors.glass06,
        borderWidth: 1,
        borderColor: colors.glass10,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 15,
        color: colors.white,
        fontSize: 15,
        marginBottom: 8,
    },
    btn: { borderRadius: 999, overflow: 'hidden', marginTop: 20 },
    btnGradient: { minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
    btnText: { color: colors.white, fontWeight: '800', fontSize: 16 },
    secondaryBtn: {
        minHeight: 52,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.glass12,
    },
    secondaryBtnText: { color: colors.glass60, fontWeight: '600', fontSize: 15 },
});