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
import { moderateScale, scale, verticalScale } from '../../utils/responsive';

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
            Alert.alert(t('common.error'), t('screens.authVerifyOtp.missingOtp', 'Vui lòng nhập đủ mã OTP.'));
            return;
        }
        setLoading(true);
        try {
            await verifyOtp({ email, otp: code });
            Alert.alert(t('common.success'), t('screens.authVerifyOtp.verifiedSuccess', 'Xác thực thành công'), [
                { text: t('auth.login'), onPress: () => navigation.navigate('Login') },
            ]);
        } catch (e: any) {
            Alert.alert(t('screens.authVerifyOtp.verifyFailed', 'Xác thực thất bại'), e?.message || t('screens.authVerifyOtp.invalidOtp', 'Mã OTP không hợp lệ.'));
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
            Alert.alert(t('screens.authVerifyOtp.resentTitle', 'Đã gửi lại'), `${t('screens.authVerifyOtp.resentToPrefix', 'Mã mới đã gửi đến')} ${email}`);
        } catch (e: any) {
            Alert.alert(t('common.error'), e?.message || t('screens.authVerifyOtp.resendFailed', 'Gửi lại mã thất bại.'));
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

                {/* Background Decor */}
                <View style={styles.bgMeshWrapper}>
                    <View style={[styles.gradTopHero, { backgroundColor: themeColors.gradIndigo + '15' }]} />
                </View>

                <View style={[styles.headerBox, { paddingTop: insets.top + verticalScale(12) }]}>
                    <BackButton onPress={() => navigation.goBack()} />
                </View>

                <View style={[styles.contentWrap, { paddingBottom: insets.bottom + verticalScale(32) }]}>
                    <View style={styles.heroWrap}>
                        <Text style={styles.title}>{t('auth.verifyOtp', 'Xác thực\nOTP')}</Text>
                        <Text style={styles.subtitle}>
                            {t('screens.authVerifyOtp.sentTo', 'Vui lòng nhập mã bảo mật 6 số vừa được gửi đến:\n')}
                        </Text>
                        <Text style={styles.emailHighlight}>{email}</Text>
                    </View>

                    <View style={styles.formBox}>
                        <View style={styles.otpRow}>
                            {otp.map((digit, index) => (
                                <TextInput
                                    key={index}
                                    ref={(ref) => { inputs.current[index] = ref; }}
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
                                    selectionColor={themeColors.accent}
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
                                    {loading ? t('screens.authVerifyOtp.verifying', 'Đang xác thực...') : t('screens.authVerifyOtp.verify', 'Xác nhận')}
                                </Text>
                            </LinearGradient>
                        </Pressable>

                        <View style={styles.resendRow}>
                            <Text style={styles.resendPrefix}>{t('screens.authVerifyOtp.notReceived', 'Chưa nhận được mã?')} </Text>
                            <Pressable onPress={handleResend} disabled={countdown > 0 || resending}>
                                <Text style={[
                                    styles.resendBtn,
                                    (countdown > 0 || resending) && styles.resendDisabled
                                ]}>
                                    {countdown > 0
                                        ? `${t('screens.authVerifyOtp.resendAfterPrefix', 'Gửi lại sau')} ${countdown}s`
                                        : resending
                                            ? t('screens.authVerifyOtp.resending', 'Đang gửi...')
                                            : t('screens.authVerifyOtp.resend', 'Gửi lại')}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
    );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    bgMeshWrapper: { ...StyleSheet.absoluteFillObject, opacity: 0.7, zIndex: 0 },
    gradTopHero: { position: 'absolute', top: -scale(100), left: -scale(100), width: scale(400), height: scale(400), borderRadius: scale(200) },
    headerBox: { paddingHorizontal: scale(20), zIndex: 10 },
    contentWrap: { flex: 1, paddingHorizontal: scale(24), justifyContent: 'space-between', zIndex: 10 },
    heroWrap: { marginTop: verticalScale(40) },
    title: {
        color: colors.white,
        fontSize: moderateScale(42),
        fontWeight: '900',
        letterSpacing: -1,
        lineHeight: moderateScale(50),
        marginBottom: verticalScale(12),
    },
    subtitle: { color: colors.glass65, fontSize: moderateScale(16), fontWeight: '500', maxWidth: scale(300), lineHeight: moderateScale(24) },
    emailHighlight: { color: colors.accent, fontSize: moderateScale(16), fontWeight: '700', marginTop: verticalScale(4) },
    formBox: { width: '100%', paddingBottom: verticalScale(20), alignItems: 'center' },
    otpRow: { flexDirection: 'row', justifyContent: 'center', gap: scale(8), width: '100%', marginBottom: verticalScale(32) },
    cell: {
        width: scale(48),
        height: verticalScale(56),
        borderRadius: scale(14),
        borderBottomWidth: 2,
        borderColor: colors.glass15,
        backgroundColor: colors.glass04,
        fontSize: moderateScale(24),
        fontWeight: '800',
        color: colors.white,
        textAlign: 'center',
    },
    cellFilled: { borderColor: colors.accent, backgroundColor: colors.accent + '15' },
    btn: { borderRadius: 999, overflow: 'hidden', width: '100%', marginBottom: verticalScale(24), shadowColor: colors.accent, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20 },
    btnGradient: { minHeight: verticalScale(56), alignItems: 'center', justifyContent: 'center' },
    btnText: { color: colors.white, fontWeight: '800', fontSize: moderateScale(16) },
    resendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    resendPrefix: { color: colors.glass40, fontSize: moderateScale(14) },
    resendBtn: { color: colors.accent, fontSize: moderateScale(14), fontWeight: '700' },
    resendDisabled: { color: colors.glass30 },
});