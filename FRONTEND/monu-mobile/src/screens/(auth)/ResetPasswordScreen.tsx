import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View, ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import { resetPassword, resendOtp } from '../../services/auth';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { ColorScheme, useThemeColors } from '../../config/colors';
import { BackButton } from '../../components/BackButton';
import { useTranslation } from '../../context/LocalizationContext';
import { moderateScale, scale, verticalScale } from '../../utils/responsive';

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
    const [showConfirmPw, setShowConfirmPw] = useState(false);
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
        if (code.length < OTP_LENGTH) return t('screens.authReset.otpRequired', 'Vui lòng nhập đủ mã OTP.');
        if (!newPassword) return t('screens.authReset.newPasswordRequired', 'Vui lòng nhập mật khẩu mới.');
        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(newPassword))
            return t('screens.authReset.passwordPolicy', 'Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.');
        if (newPassword !== confirmPw) return t('screens.authReset.passwordMismatch', 'Mật khẩu không khớp.');
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
            Alert.alert(t('common.success'), t('screens.authReset.resetSuccess', 'Đặt lại mật khẩu thành công'), [
                { text: t('auth.login'), onPress: () => navigation.navigate('Login') },
            ]);
        } catch (e: any) {
            Alert.alert(t('common.error'), e?.message || t('screens.authReset.resetFailed', 'Đặt lại mật khẩu thất bại.'));
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
            Alert.alert(t('screens.authReset.resentTitle', 'Đã gửi lại'), `${t('screens.authReset.resentToPrefix', 'Mã mới đã gửi đến')} ${email}`);
        } catch (e: any) {
            Alert.alert(t('common.error'), e?.message || t('screens.authReset.resendFailed', 'Gửi lại mã thất bại.'));
        } finally {
            setResending(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.root}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
            <StatusBar style="light" />

            {/* Background Decor */}
            <View style={styles.bgMeshWrapper}>
                <View style={[styles.gradTopHero, { backgroundColor: themeColors.gradIndigo + '15' }]} />
            </View>

            <View style={[styles.headerBox, { paddingTop: insets.top + verticalScale(12) }]}>
                <BackButton onPress={() => navigation.goBack()} />
            </View>

            <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
                <View style={styles.heroWrap}>
                    <Text style={styles.title}>{t('auth.resetPassword', 'Cập nhật\nmật khẩu')}</Text>
                    <Text style={styles.subtitle}>
                        {t('screens.authReset.subtitle', 'Vui lòng xác nhận OTP bảo vệ tài khoản')}{'\n'}
                        <Text style={styles.emailHighlight}>{email}</Text>
                    </Text>
                </View>

                <View style={[styles.form, { paddingBottom: insets.bottom + verticalScale(32) }]}>
                    <Text style={styles.fieldLabel}>{t('auth.verifyOtp', 'Mã OTP')}</Text>
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
                        style={styles.resendRow}
                        onPress={handleResend}
                        disabled={countdown > 0 || resending}
                    >
                        <Text style={[
                            styles.resendText,
                            (countdown > 0 || resending) && styles.resendDisabled
                        ]}>
                            {countdown > 0
                                ? `${t('screens.authReset.resendAfterPrefix', 'Gửi lại sau')} ${countdown}s`
                                : resending
                                    ? t('screens.authReset.resending', 'Đang gửi...')
                                    : t('screens.authReset.resendOtp', 'Gửi lại OTP')}
                        </Text>
                    </Pressable>

                    <View style={styles.spacer} />

                    <Text style={styles.fieldLabel}>{t('screens.authReset.newPassword', 'Mật khẩu mới')}</Text>
                    <View style={styles.pwWrap}>
                        <TextInput
                            secureTextEntry={!showPw}
                            style={styles.input}
                            value={newPassword}
                            onChangeText={setNewPw}
                            placeholder="Mật khẩu mới"
                            placeholderTextColor={themeColors.glass40}
                            selectionColor={themeColors.accent}
                        />
                        <Pressable onPress={() => setShowPw(!showPw)} style={styles.eyeBtn}>
                            <MaterialIcons
                                name={showPw ? 'visibility-off' : 'visibility'}
                                size={scale(20)}
                                color={themeColors.glass50}
                            />
                        </Pressable>
                    </View>

                    <View style={styles.spacer} />

                    <Text style={styles.fieldLabel}>{t('auth.confirmPassword', 'Xác nhận lại mật khẩu')}</Text>
                    <View style={styles.pwWrap}>
                        <TextInput
                            secureTextEntry={!showConfirmPw}
                            style={styles.input}
                            value={confirmPw}
                            onChangeText={setConfirmPw}
                            placeholder="Xác nhận mật khẩu mới"
                            placeholderTextColor={themeColors.glass40}
                            selectionColor={themeColors.accent}
                        />
                        <Pressable onPress={() => setShowConfirmPw(!showConfirmPw)} style={styles.eyeBtn}>
                            <MaterialIcons
                                name={showConfirmPw ? 'visibility-off' : 'visibility'}
                                size={scale(20)}
                                color={themeColors.glass50}
                            />
                        </Pressable>
                    </View>

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
                                {loading ? t('screens.authReset.resetting', 'Đang cập nhật...') : t('auth.resetPassword', 'Lưu mật khẩu')}
                            </Text>
                        </LinearGradient>
                    </Pressable>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    bgMeshWrapper: { ...StyleSheet.absoluteFillObject, opacity: 0.7, zIndex: 0 },
    gradTopHero: { position: 'absolute', top: -scale(100), left: -scale(100), width: scale(400), height: scale(400), borderRadius: scale(200) },
    headerBox: { paddingHorizontal: scale(20), zIndex: 10 },
    heroWrap: { paddingHorizontal: scale(24), marginTop: verticalScale(20), marginBottom: verticalScale(32), zIndex: 10 },
    title: {
        color: colors.white,
        fontSize: moderateScale(42),
        fontWeight: '900',
        letterSpacing: -1,
        lineHeight: moderateScale(50),
        marginBottom: verticalScale(12),
    },
    subtitle: { color: colors.glass65, fontSize: moderateScale(16), fontWeight: '500', maxWidth: scale(300), lineHeight: moderateScale(24) },
    emailHighlight: { color: colors.accent, fontSize: moderateScale(16), fontWeight: '700' },
    form: { paddingHorizontal: scale(24), flex: 1, zIndex: 10 },
    fieldLabel: {
        color: colors.glass50,
        fontSize: moderateScale(13),
        fontWeight: '600',
        marginBottom: verticalScale(8),
    },
    spacer: { height: verticalScale(24) },
    otpRow: { flexDirection: 'row', justifyContent: 'space-between', gap: scale(6), marginBottom: verticalScale(12) },
    cell: {
        flex: 1,
        maxWidth: scale(48),
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
    resendRow: { alignSelf: 'flex-end', marginBottom: verticalScale(8) },
    resendText: { color: colors.accent, fontSize: moderateScale(14), fontWeight: '600' },
    resendDisabled: { color: colors.glass40 },
    input: {
        flex: 1,
        backgroundColor: 'transparent',
        color: colors.white,
        fontSize: moderateScale(16),
        paddingVertical: verticalScale(12),
        paddingHorizontal: 0,
    },
    pwWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: colors.glass20,
    },
    eyeBtn: { padding: scale(8), marginRight: -scale(8) },
    btn: { borderRadius: 999, overflow: 'hidden', marginTop: verticalScale(36), shadowColor: colors.accent, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20 },
    btnGradient: { minHeight: verticalScale(56), alignItems: 'center', justifyContent: 'center' },
    btnText: { color: colors.white, fontWeight: '800', fontSize: moderateScale(16) },
});