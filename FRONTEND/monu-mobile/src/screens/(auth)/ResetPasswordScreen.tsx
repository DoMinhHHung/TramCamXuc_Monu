import React, { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { resetPassword, resendOtp } from '../../services/auth';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { COLORS } from '../../config/colors';

const OTP_LENGTH = 6;
const RESEND_SECS = 60;

type Nav   = NativeStackNavigationProp<RootStackParamList, 'ResetPassword'>;
type Route = RouteProp<RootStackParamList, 'ResetPassword'>;

export default function ResetPasswordScreen() {
    const navigation = useNavigation<Nav>();
    const route = useRoute<Route>();
    const { email } = route.params;

    const [otp, setOtp]             = useState<string[]>(Array(OTP_LENGTH).fill(''));
    const [newPassword, setNewPw]   = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [showPw, setShowPw]       = useState(false);
    const [loading, setLoading]     = useState(false);
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
        if (code.length < OTP_LENGTH)      return 'Vui lòng nhập đủ 6 chữ số OTP.';
        if (!newPassword)                   return 'Vui lòng nhập mật khẩu mới.';
        if (!pwRegex.test(newPassword))     return 'Mật khẩu cần ≥ 8 ký tự, chữ hoa, thường, số và ký tự đặc biệt.';
        if (newPassword !== confirmPw)      return 'Mật khẩu nhập lại không khớp.';
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
        : pwRegex.test(newPassword)  ? { label: 'Mạnh', color: COLORS.success }
            : newPassword.length >= 6    ? { label: 'Trung bình', color: '#FBBF24' }
                : { label: 'Yếu', color: COLORS.error };

    return (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: COLORS.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 60 }} keyboardShouldPersistTaps="handled">
                <Pressable onPress={() => navigation.goBack()} style={{ marginBottom: 32 }}>
                    <Text style={{ color: COLORS.accent, fontSize: 15, fontWeight: '600' }}>← Quay lại</Text>
                </Pressable>

                <View style={[styles.iconWrap, { backgroundColor: COLORS.surface, borderColor: COLORS.accentDim }]}>
                    <Text style={{ fontSize: 34 }}>🛡️</Text>
                </View>

                <Text style={[styles.heading, { color: COLORS.text }]}>Đặt lại mật khẩu</Text>
                <Text style={{ fontSize: 14, color: COLORS.muted, lineHeight: 22, marginBottom: 28 }}>
                    Nhập mã OTP đã gửi đến <Text style={{ color: COLORS.accent }}>{email}</Text> và mật khẩu mới.
                </Text>

                {/* OTP */}
                <Text style={styles.label}>Mã OTP</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                    {otp.map((digit, i) => (
                        <TextInput key={i} ref={r => { inputs.current[i] = r; }}
                                   style={[styles.cell, { borderColor: digit ? COLORS.accent : COLORS.border, backgroundColor: digit ? '#1E1630' : COLORS.surface, color: COLORS.text }]}
                                   value={digit} onChangeText={t => handleCellChange(t, i)}
                                   onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
                                   keyboardType="number-pad" maxLength={OTP_LENGTH} textAlign="center"
                                   selectionColor={COLORS.accent} placeholder="·" placeholderTextColor={COLORS.border} />
                    ))}
                </View>

                <Pressable onPress={handleResend} disabled={countdown > 0 || resending} style={{ alignSelf: 'flex-end', marginBottom: 20 }}>
                    <Text style={{ color: countdown > 0 ? COLORS.muted : COLORS.accent, fontSize: 13, fontWeight: '600' }}>
                        {countdown > 0 ? `Gửi lại OTP sau ${countdown}s` : resending ? 'Đang gửi...' : 'Gửi lại OTP'}
                    </Text>
                </Pressable>

                {/* New password */}
                <Text style={styles.label}>Mật khẩu mới</Text>
                <View style={[styles.pwWrap, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
                    <TextInput style={[styles.pwInput, { color: COLORS.text }]} value={newPassword} onChangeText={setNewPw}
                               placeholder="••••••••" placeholderTextColor={COLORS.muted} secureTextEntry={!showPw} autoCapitalize="none" />
                    <Pressable onPress={() => setShowPw(p => !p)} style={{ paddingHorizontal: 14 }}>
                        <Text style={{ fontSize: 18 }}>{showPw ? '🙈' : '👁️'}</Text>
                    </Pressable>
                </View>
                {pwStrength && <Text style={{ fontSize: 12, fontWeight: '600', marginBottom: 8, color: pwStrength.color }}>Độ mạnh: {pwStrength.label}</Text>}

                <Text style={[styles.label, { marginTop: 14 }]}>Xác nhận mật khẩu</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: COLORS.surface, borderColor: confirmPw && newPassword !== confirmPw ? COLORS.error : COLORS.border, color: COLORS.text }]}
                    value={confirmPw} onChangeText={setConfirmPw} placeholder="••••••••"
                    placeholderTextColor={COLORS.muted} secureTextEntry={!showPw} autoCapitalize="none" />
                {confirmPw && newPassword !== confirmPw && (
                    <Text style={{ fontSize: 12, color: COLORS.error, marginBottom: 8 }}>Mật khẩu không khớp</Text>
                )}

                <Pressable style={[styles.btn, { backgroundColor: COLORS.accentDim }, loading && { opacity: 0.5 }]} onPress={handleReset} disabled={loading}>
                    <Text style={styles.btnText}>{loading ? 'Đang đặt lại...' : 'Đặt lại mật khẩu'}</Text>
                </Pressable>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    iconWrap: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 20, alignSelf: 'center' },
    heading:  { fontSize: 24, fontWeight: '800', marginBottom: 10, letterSpacing: -0.4 },
    label:    { fontSize: 12, fontWeight: '600', color: COLORS.muted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
    cell:     { flex: 1, height: 54, borderRadius: 12, borderWidth: 1.5, fontSize: 20, fontWeight: '700' },
    input:    { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, marginBottom: 4 },
    pwWrap:   { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, marginBottom: 4 },
    pwInput:  { flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15 },
    btn:      { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 20 },
    btnText:  { color: '#fff', fontWeight: '800', fontSize: 15 },
});