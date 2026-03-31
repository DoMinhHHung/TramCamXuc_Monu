import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { verifyOtp, resendOtp } from '../../services/auth';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { ColorScheme, useThemeColors } from '../../config/colors';
import { BackButton } from '../../components/BackButton';
import { useTranslation } from '../../context/LocalizationContext';

const OTP_LENGTH = 6;
const RESEND_SECS = 60;

type Nav = NativeStackNavigationProp<RootStackParamList, 'VerifyOtp'>;
type Route = RouteProp<RootStackParamList, 'VerifyOtp'>;

export default function VerifyOtpScreen() {
    const navigation = useNavigation<Nav>();
    const route = useRoute<Route>();
    const { email } = route.params;
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const themeColors = useThemeColors();
    const styles = useMemo(() => createStyles(themeColors), [themeColors]);

    const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
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
    const isComplete = code.length === OTP_LENGTH;

    const handleVerify = async () => {
        if (!isComplete) {
            Alert.alert(t('common.error'), t('screens.authVerifyOtp.missingOtp'));
            return;
        }
        setLoading(true);
        try {
            await verifyOtp({ email, otp: code });
            Alert.alert(t('common.success'), t('screens.authVerifyOtp.verifiedSuccess'), [
                { text: t('auth.login'), onPress: () => navigation.navigate('Login') },
            ]);
        } catch (e: any) {
            Alert.alert(t('screens.authVerifyOtp.verifyFailed'), e?.message || t('screens.authVerifyOtp.invalidOtp'));
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
            Alert.alert(t('screens.authVerifyOtp.resentTitle'), `${t('screens.authVerifyOtp.resentToPrefix')} ${email}`);
        } catch (e: any) {
            Alert.alert(t('common.error'), e?.message || t('screens.authVerifyOtp.resendFailed'));
        } finally {
            setResending(false);
        }
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <KeyboardAvoidingView
                style={styles.root}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <StatusBar style="light" />

                <LinearGradient
                    colors={[themeColors.gradIndigo, themeColors.bg]}
                    style={[styles.gradientTop, { paddingTop: insets.top + 12 }]}
                >

                    <View style={{ width: '100%', alignItems: 'flex-start', marginBottom: 0 }}>
                        <BackButton onPress={() => navigation.goBack()} />
                    </View>

                    <View style={{ width: '100%', alignItems: 'center', marginTop: 24, marginBottom: 20 }}>
                        <View style={styles.iconWrap}>
                            <Text style={{ fontSize: 40 }}>🔑</Text>
                        </View>
                    </View>

                    <Text style={styles.title}>{t('auth.verifyOtp')}</Text>
                    <Text style={styles.subtitle}>
                        {t('screens.authVerifyOtp.sentTo')} <Text style={{ color: themeColors.accent }}>{email}</Text>
                    </Text>
                </LinearGradient>

                <View style={[styles.content, { paddingBottom: insets.bottom + 32 }]}> 
                    <View style={styles.otpRow}>
                        {otp.map((digit, index) => (
                            <TextInput
                                key={index}
                                ref={ref => (inputs.current[index] = ref)}
                                style={[
                                    styles.cell,
                                    digit && styles.cellFilled,
                                    // Có thể thêm active nếu cần focus style
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
                        style={({ pressed }) => [
                            styles.btn,
                            (!isComplete || loading || pressed) && { opacity: 0.6 },
                        ]}
                        onPress={handleVerify}
                        disabled={!isComplete || loading}
                    >
                        <LinearGradient
                            colors={[themeColors.accent, themeColors.accentAlt]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.btnGradient}
                        >
                            <Text style={styles.btnText}>
                                {loading ? t('screens.authVerifyOtp.verifying') : t('screens.authVerifyOtp.verify')}
                            </Text>
                        </LinearGradient>
                    </Pressable>

                    <View style={styles.resendRow}>
                        <Text style={styles.resendPrefix}>{t('screens.authVerifyOtp.notReceived')} </Text>
                        <Pressable onPress={handleResend} disabled={countdown > 0 || resending}>
                            <Text style={[
                                styles.resendBtn,
                                (countdown > 0 || resending) && styles.resendDisabled
                            ]}>
                                {countdown > 0
                                    ? `${t('screens.authVerifyOtp.resendAfterPrefix')} ${countdown}s`
                                    : resending
                                        ? t('screens.authVerifyOtp.resending')
                                        : t('screens.authVerifyOtp.resend')}
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
    );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    gradientTop: { paddingHorizontal: 24, paddingBottom: 36 },
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
        marginBottom: 20,
    },
    title: { color: colors.white, fontSize: 28, fontWeight: '800', marginBottom: 10, textAlign: 'center' },
    subtitle: { color: colors.glass50, fontSize: 15, textAlign: 'center' },
    content: { paddingHorizontal: 24, paddingTop: 24, alignItems: 'center' },
    otpRow: { flexDirection: 'row', justifyContent: 'space-between', width: '80%', marginBottom: 32 },
    cell: {
        width: 50,
        height: 60,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: colors.glass12,
        backgroundColor: colors.glass05,
        fontSize: 24,
        fontWeight: '800',
        color: colors.white,
        textAlign: 'center',
    },
    cellFilled: { borderColor: colors.accent, backgroundColor: colors.accentFill20 },
    btn: { borderRadius: 999, overflow: 'hidden', width: '80%', marginBottom: 24 },
    btnGradient: { minHeight: 56, alignItems: 'center', justifyContent: 'center' },
    btnText: { color: colors.white, fontWeight: '800', fontSize: 16 },
    resendRow: { flexDirection: 'row', alignItems: 'center' },
    resendPrefix: { color: colors.glass40, fontSize: 14 },
    resendBtn: { color: colors.accent, fontSize: 14, fontWeight: '700' },
    resendDisabled: { color: colors.glass30 },
});