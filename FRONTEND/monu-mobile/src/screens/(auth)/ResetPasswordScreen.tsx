import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { resetPassword, resendOtp } from '../../services/auth';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { ColorScheme, useThemeColors } from '../../config/colors';
import { BackButton } from '../../components/BackButton';
import { useTranslation } from '../../context/LocalizationContext';

const OTP_LENGTH = 6;
const RESEND_SECS = 60;

type Nav = NativeStackNavigationProp<RootStackParamList, 'ResetPassword'>;
type Route = RouteProp<RootStackParamList, 'ResetPassword'>;

export default function ResetPasswordScreen() {
    const navigation = useNavigation<Nav>();
    const route = useRoute<Route>();
    const { email } = route.params;
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const themeColors = useThemeColors();
    const styles = useMemo(() => createStyles(themeColors), [themeColors]);

    const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
    const [newPassword, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [countdown, setCountdown] = useState(RESEND_SECS);
    const inputs = useRef<(TextInput | null)[]>(Array(OTP_LENGTH).fill(null));

    useEffect(() => {
        if (countdown <= 0) return;
        const t = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [countdown]);

    const handleCellChange = (text: string, index: number) => {
        if (text.length > 1) {
            const digits = text.replace(/\D/g, '').slice(0, OTP_LENGTH).split('');
            const next = Array(OTP_LENGTH).fill('');
            digits.forEach((d, i) => { next[i] = d; });
            setOtp(next);
            inputs.current[Math.min(digits.length, OTP_LENGTH - 1)]?.focus();
            return;
        }
        const digit = text.replace(/\D/g, '');
        const next = [...otp];
        next[index] = digit;
        setOtp(next);
        if (digit && index < OTP_LENGTH - 1) inputs.current[index + 1]?.focus();
    };

    const handleKeyPress = (key: string, index: number) => {
        if (key === 'Backspace' && !otp[index] && index > 0) {
            const next = [...otp];
            next[index - 1] = '';
            setOtp(next);
            inputs.current[index - 1]?.focus();
        }
    };

    const code = otp.join('');

    const validate = () => {
        if (code.length < OTP_LENGTH) return t('screens.authReset.otpRequired');
        if (!newPassword) return t('screens.authReset.newPasswordRequired');
        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(newPassword))
            return t('screens.authReset.passwordPolicy');
        if (newPassword !== confirmPw) return t('screens.authReset.passwordMismatch');
        return null;
    };

    const handleReset = async () => {
        const err = validate();
        if (err) {
            Alert.alert(t('common.error'), err);
            return;
        }
        setLoading(true);
        try {
            await resetPassword({ email, otp: code, newPassword });
            Alert.alert(t('common.success'), t('screens.authReset.resetSuccess'), [
                { text: t('auth.login'), onPress: () => navigation.navigate('Login') },
            ]);
        } catch (e: any) {
            Alert.alert(t('common.error'), e?.message || t('screens.authReset.resetFailed'));
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (countdown > 0) return;
        setResending(true);
        try {
            await resendOtp(email);
            setCountdown(RESEND_SECS);
            Alert.alert(t('screens.authReset.resentTitle'), `${t('screens.authReset.resentToPrefix')} ${email}`);
        } catch (e: any) {
            Alert.alert(t('common.error'), e?.message || t('screens.authReset.resendFailed'));
        } finally {
            setResending(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.root}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <StatusBar style="light" />

            <LinearGradient
                colors={[themeColors.gradIndigo, themeColors.bg]}
                style={[styles.gradientTop, { paddingTop: insets.top + 12 }]}
            >
                <BackButton onPress={() => navigation.goBack()} />

                <View style={styles.iconWrap}>
                    <Text style={{ fontSize: 40 }}>🔄</Text>
                </View>

                <Text style={styles.title}>{t('auth.resetPassword')}</Text>
                <Text style={styles.subtitle}>
                    {t('screens.authReset.subtitle')} <Text style={{ color: themeColors.accent }}>{email}</Text>
                </Text>
            </LinearGradient>

            <View style={[styles.form, { paddingBottom: insets.bottom + 32 }]}>
                <Text style={styles.fieldLabel}>{t('auth.verifyOtp')}</Text>
                <View style={styles.otpRow}>
                    {otp.map((digit, index) => (
                        <TextInput
                            key={index}
                            ref={ref => (inputs.current[index] = ref)}
                            style={[
                                styles.cell,
                                digit && styles.cellFilled,
                            ]}
                            value={digit}
                            onChangeText={text => handleCellChange(text, index)}
                            onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                            keyboardType="number-pad"
                            maxLength={1}
                            autoFocus={index === 0}
                            textAlign="center"
                        />
                    ))}
                </View>

                <Pressable
                    style={styles.resendRow}
                    onPress={handleResend}
                    disabled={countdown > 0 || resending}
                >
                    <Text style={[
                        styles.resendText,
                        (countdown > 0 || resending) && styles.resendDisabled
                    ]}>
                        {countdown > 0
                            ? `${t('screens.authReset.resendAfterPrefix')} ${countdown}s`
                            : resending
                                ? t('screens.authReset.resending')
                                : t('screens.authReset.resendOtp')}
                    </Text>
                </Pressable>

                <Text style={styles.fieldLabel}>{t('screens.authReset.newPassword')}</Text>
                <View style={styles.pwWrap}>
                    <TextInput
                        secureTextEntry={!showPw}
                        style={styles.input}
                        value={newPassword}
                        onChangeText={setNewPw}
                        placeholder="••••••••"
                        placeholderTextColor={themeColors.glass25}
                    />
                    <Pressable onPress={() => setShowPw(!showPw)} style={styles.eyeBtn}>
                        <Text style={{ fontSize: 18 }}>{showPw ? '🙈' : '👁️'}</Text>
                    </Pressable>
                </View>

                <Text style={styles.fieldLabel}>{t('auth.confirmPassword')}</Text>
                <TextInput
                    secureTextEntry
                    style={styles.input}
                    value={confirmPw}
                    onChangeText={setConfirmPw}
                    placeholder="••••••••"
                    placeholderTextColor={themeColors.glass25}
                />

                <Pressable
                    style={({ pressed }) => [
                        styles.btn,
                        (loading || pressed) && { opacity: 0.8 },
                    ]}
                    onPress={handleReset}
                    disabled={loading}
                >
                    <LinearGradient
                        colors={[themeColors.accent, themeColors.accentAlt]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.btnGradient}
                    >
                        <Text style={styles.btnText}>
                            {loading ? t('screens.authReset.resetting') : t('auth.resetPassword')}
                        </Text>
                    </LinearGradient>
                </Pressable>
            </View>
        </KeyboardAvoidingView>
    );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    gradientTop: { paddingHorizontal: 24, paddingBottom: 32, alignItems: 'center' },
    iconWrap: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: colors.glass07,
        borderWidth: 1.5,
        borderColor: colors.accentBorder40,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
        marginBottom: 18,
    },
    title: { color: colors.white, fontSize: 28, fontWeight: '800', marginBottom: 8 },
    subtitle: { color: colors.glass50, fontSize: 15, textAlign: 'center', lineHeight: 22 },
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
    otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    cell: {
        width: 48,
        height: 56,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: colors.glass12,
        backgroundColor: colors.glass05,
        fontSize: 22,
        fontWeight: '800',
        color: colors.white,
        textAlign: 'center',
    },
    cellFilled: { borderColor: colors.accent, backgroundColor: colors.accentFill20 },
    resendRow: { alignSelf: 'flex-end', marginBottom: 24 },
    resendText: { color: colors.accent, fontSize: 14, fontWeight: '600' },
    resendDisabled: { color: colors.glass30 },
    input: {
        backgroundColor: colors.glass06,
        borderWidth: 1,
        borderColor: colors.glass10,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 15,
        color: colors.white,
        fontSize: 15,
    },
    pwWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.glass06,
        borderWidth: 1,
        borderColor: colors.glass10,
        borderRadius: 14,
    },
    eyeBtn: { paddingHorizontal: 14 },
    btn: { borderRadius: 999, overflow: 'hidden', marginTop: 32 },
    btnGradient: { minHeight: 60, alignItems: 'center', justifyContent: 'center' },
    btnText: { color: colors.white, fontWeight: '800', fontSize: 17 },
});