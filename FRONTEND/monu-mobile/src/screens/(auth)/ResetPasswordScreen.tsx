import React, { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { resetPassword, resendOtp } from '../../services/auth';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { COLORS } from '../../config/colors';
import { BackButton } from '../../components/BackButton';

const OTP_LENGTH = 6;
const RESEND_SECS = 60;

type Nav = NativeStackNavigationProp<RootStackParamList, 'ResetPassword'>;
type Route = RouteProp<RootStackParamList, 'ResetPassword'>;

export default function ResetPasswordScreen() {
    const navigation = useNavigation<Nav>();
    const route = useRoute<Route>();
    const { email } = route.params;
    const insets = useSafeAreaInsets();

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

    const pwRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    const code = otp.join('');

    const validate = () => {
        if (code.length < OTP_LENGTH) return 'Vui lòng nhập đủ 6 chữ số OTP.';
        if (!newPassword) return 'Vui lòng nhập mật khẩu mới.';
        if (!pwRegex.test(newPassword)) return 'Mật khẩu cần ≥ 8 ký tự, chữ hoa, thường, số và ký tự đặc biệt.';
        if (newPassword !== confirmPw) return 'Mật khẩu nhập lại không khớp.';
        return null;
    };

    const handleReset = async () => {
        const err = validate();
        if (err) { Alert.alert('Thông tin không hợp lệ', err); return; }
        setLoading(true);
        try {
            await resetPassword({ email, otp: code, newPassword });
            Alert.alert('Thành công! 🎉', 'Mật khẩu đã được đặt lại. Hãy đăng nhập lại.', [
                { text: 'Đăng nhập', onPress: () => navigation.navigate('Login') },
            ]);
        } catch (e: any) {
            Alert.alert('Thất bại', e?.message || 'Mã OTP không đúng hoặc đã hết hạn.');
        } finally { setLoading(false); }
    };

    const handleResend = async () => {
        if (countdown > 0) return;
        setResending(true);
        try { await resendOtp(email); setCountdown(RESEND_SECS); }
        catch { Alert.alert('Lỗi', 'Không gửi được OTP, thử lại sau.'); }
        finally { setResending(false); }
    };

    const pwStrength = !newPassword ? null
        : pwRegex.test(newPassword) ? { label: 'Mạnh 💪', color: COLORS.success, w: '100%' as const }
            : newPassword.length >= 6 ? { label: 'Trung bình', color: COLORS.warningMid, w: '60%' as const }
                : { label: 'Yếu', color: COLORS.error, w: '30%' as const };

    return (
        <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <StatusBar style="light" />
            <ScrollView
                contentContainerStyle={{ flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <LinearGradient
                    colors={[COLORS.gradIndigo, COLORS.bg]}
                    style={[styles.gradientTop, { paddingTop: insets.top + 12 }]}
                >
                    <BackButton onPress={() => navigation.goBack()} />
                    <View style={styles.iconWrap}>
                        <Text style={{ fontSize: 38 }}>🛡️</Text>
                    </View>
                    <Text style={styles.title}>Đặt lại mật khẩu</Text>
                    <Text style={styles.subtitle}>
                        Nhập mã OTP đã gửi đến{' '}
                        <Text style={{ color: COLORS.accent }}>{email}</Text>
                    </Text>
                </LinearGradient>

                <View style={[styles.form, { paddingBottom: insets.bottom + 32 }]}>
                    {/* OTP */}
                    <Text style={styles.fieldLabel}>Mã OTP</Text>
                    <View style={styles.otpRow}>
                        {otp.map((digit, i) => (
                            <TextInput
                                key={i}
                                ref={r => { inputs.current[i] = r; }}
                                style={[styles.cell, digit ? styles.cellFilled : {}]}
                                value={digit}
                                onChangeText={t => handleCellChange(t, i)}
                                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
                                keyboardType="number-pad"
                                maxLength={OTP_LENGTH}
                                textAlign="center"
                                selectionColor={COLORS.accent}
                                placeholder="·"
                                placeholderTextColor="COLORS.glass20"
                            />
                        ))}
                    </View>

                    <Pressable
                        onPress={handleResend}
                        disabled={countdown > 0 || resending}
                        style={styles.resendRow}
                    >
                        <Text style={[styles.resendText, countdown > 0 && styles.resendDisabled]}>
                            {countdown > 0 ? `Gửi lại OTP sau ${countdown}s` : resending ? 'Đang gửi...' : 'Gửi lại OTP'}
                        </Text>
                    </Pressable>

                    {/* New password */}
                    <Text style={styles.fieldLabel}>Mật khẩu mới</Text>
                    <View style={styles.pwWrap}>
                        <TextInput
                            style={styles.pwInput}
                            value={newPassword}
                            onChangeText={setNewPw}
                            placeholder="••••••••"
                            placeholderTextColor="COLORS.glass25"
                            secureTextEntry={!showPw}
                            autoCapitalize="none"
                        />
                        <Pressable onPress={() => setShowPw(p => !p)} style={styles.eyeBtn}>
                            <Text style={{ fontSize: 16 }}>{showPw ? '🙈' : '👁️'}</Text>
                        </Pressable>
                    </View>
                    {pwStrength && (
                        <View style={styles.strengthWrap}>
                            <View style={styles.strengthBar}>
                                <View style={[styles.strengthFill, { width: pwStrength.w, backgroundColor: pwStrength.color }]} />
                            </View>
                            <Text style={[styles.strengthLabel, { color: pwStrength.color }]}>{pwStrength.label}</Text>
                        </View>
                    )}

                    <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Xác nhận mật khẩu</Text>
                    <TextInput
                        style={[styles.input, confirmPw && newPassword !== confirmPw && styles.inputError]}
                        value={confirmPw}
                        onChangeText={setConfirmPw}
                        placeholder="••••••••"
                        placeholderTextColor="COLORS.glass25"
                        secureTextEntry={!showPw}
                        autoCapitalize="none"
                    />
                    {confirmPw && newPassword !== confirmPw && (
                        <Text style={styles.errorText}>Mật khẩu không khớp</Text>
                    )}

                    <Pressable
                        style={({ pressed }) => [styles.btn, (loading || pressed) && { opacity: 0.8 }]}
                        onPress={handleReset}
                        disabled={loading}
                    >
                        <LinearGradient
                            colors={[COLORS.accent, COLORS.accentAlt]}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            style={styles.btnGradient}
                        >
                            <Text style={styles.btnText}>{loading ? 'Đang đặt lại...' : 'Đặt lại mật khẩu'}</Text>
                        </LinearGradient>
                    </Pressable>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: COLORS.bg },

    gradientTop: { paddingHorizontal: 24, paddingBottom: 32, alignItems: 'center' },
    iconWrap: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: 'COLORS.glass07',
        borderWidth: 1.5,
        borderColor: 'COLORS.accentBorder40',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
        marginBottom: 18,
    },
    title: { color: COLORS.white, fontSize: 26, fontWeight: '800', marginBottom: 8 },
    subtitle: { color: 'COLORS.glass50', fontSize: 14, textAlign: 'center', lineHeight: 22 },

    form: { paddingHorizontal: 24, paddingTop: 4 },

    fieldLabel: {
        color: 'COLORS.glass40',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        marginBottom: 10,
        marginTop: 16,
    },

    otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    cell: {
        width: 48,
        height: 56,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: 'COLORS.glass12',
        backgroundColor: 'COLORS.glass05',
        fontSize: 22,
        fontWeight: '800',
        color: COLORS.white,
    },
    cellFilled: { borderColor: COLORS.accent, backgroundColor: 'COLORS.accentFill20' },

    resendRow: { alignSelf: 'flex-end', paddingVertical: 8 },
    resendText: { color: COLORS.accent, fontSize: 13, fontWeight: '600' },
    resendDisabled: { color: 'COLORS.glass30' },

    input: {
        backgroundColor: 'COLORS.glass06',
        borderWidth: 1,
        borderColor: 'COLORS.glass10',
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 15,
        color: COLORS.white,
        fontSize: 15,
    },
    inputError: { borderColor: COLORS.error },
    errorText: { color: COLORS.error, fontSize: 12, marginTop: 4 },

    pwWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'COLORS.glass06',
        borderWidth: 1,
        borderColor: 'COLORS.glass10',
        borderRadius: 14,
    },
    pwInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 15, color: COLORS.white, fontSize: 15 },
    eyeBtn: { paddingHorizontal: 14 },

    strengthWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
    strengthBar: { flex: 1, height: 3, backgroundColor: 'COLORS.glass10', borderRadius: 2 },
    strengthFill: { height: 3, borderRadius: 2 },
    strengthLabel: { fontSize: 12, fontWeight: '600' },

    btn: { borderRadius: 999, overflow: 'hidden', marginTop: 24 },
    btnGradient: { minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
    btnText: { color: COLORS.white, fontWeight: '800', fontSize: 16 },
});