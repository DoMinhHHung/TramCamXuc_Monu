import React, { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { verifyOtp, resendOtp } from '../../services/auth';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { COLORS } from '../../config/colors';
import { BackButton } from '../../components/BackButton';

const OTP_LENGTH = 6;
const RESEND_SECS = 60;

type Nav   = NativeStackNavigationProp<RootStackParamList, 'VerifyOtp'>;
type Route = RouteProp<RootStackParamList, 'VerifyOtp'>;

export default function VerifyOtpScreen() {
    const navigation = useNavigation<Nav>();
    const route = useRoute<Route>();
    const { email } = route.params;

    const [otp, setOtp]               = useState<string[]>(Array(OTP_LENGTH).fill(''));
    const [loading, setLoading]       = useState(false);
    const [resending, setResending]   = useState(false);
    const [countdown, setCountdown]   = useState(RESEND_SECS);
    const inputs = useRef<(TextInput | null)[]>(Array(OTP_LENGTH).fill(null));

    useEffect(() => {
        if (countdown <= 0) return;
        const t = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [countdown]);

    const handleCellChange = (text: string, index: number) => {
        // Handle paste
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

    const handleVerify = async () => {
        if (code.length < OTP_LENGTH) { Alert.alert('Thiếu mã OTP', 'Vui lòng nhập đủ 6 chữ số.'); return; }
        setLoading(true);
        try {
            await verifyOtp({ email, otp: code });
            Alert.alert('Thành công! 🎉', 'Tài khoản đã được xác thực. Hãy đăng nhập.', [
                { text: 'Đăng nhập', onPress: () => navigation.navigate('Login') },
            ]);
        } catch (e: any) {
            Alert.alert('Xác thực thất bại', e?.message || 'Mã OTP không đúng hoặc đã hết hạn.');
        } finally { setLoading(false); }
    };

    const handleResend = async () => {
        if (countdown > 0) return;
        setResending(true);
        try {
            await resendOtp(email);
            setCountdown(RESEND_SECS);
            Alert.alert('Đã gửi lại', `Mã OTP mới đã được gửi đến ${email}`);
        } catch (e: any) {
            Alert.alert('Lỗi', e?.message || 'Không gửi được OTP, thử lại sau.');
        } finally { setResending(false); }
    };

    return (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: COLORS.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.container}>
                <BackButton onPress={() => navigation.goBack()} />
                <View style={[styles.iconWrap, { backgroundColor: COLORS.surface, borderColor: COLORS.accentDim }]}>
                    <Text style={{ fontSize: 36 }}>📬</Text>
                </View>
                <Text style={[styles.heading, { color: COLORS.text }]}>Xác thực email</Text>
                <Text style={{ fontSize: 14, color: COLORS.muted, textAlign: 'center', lineHeight: 22, marginBottom: 36 }}>
                    Mã OTP 6 chữ số đã được gửi đến{'\n'}
                    <Text style={{ color: COLORS.accent, fontWeight: '700' }}>{email}</Text>
                </Text>

                <View style={styles.otpRow}>
                    {otp.map((digit, i) => (
                        <TextInput
                            key={i}
                            ref={r => { inputs.current[i] = r; }}
                            style={[styles.cell, { borderColor: digit ? COLORS.accent : COLORS.border, backgroundColor: digit ? '#1E1630' : COLORS.surface, color: COLORS.text }]}
                            value={digit}
                            onChangeText={t => handleCellChange(t, i)}
                            onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
                            keyboardType="number-pad"
                            maxLength={OTP_LENGTH}
                            textAlign="center"
                            selectionColor={COLORS.accent}
                            placeholder="·"
                            placeholderTextColor={COLORS.border}
                        />
                    ))}
                </View>

                <Pressable style={[styles.btn, { backgroundColor: COLORS.accentDim }, loading && { opacity: 0.5 }]} onPress={handleVerify} disabled={loading}>
                    <Text style={styles.btnText}>{loading ? 'Đang xác thực...' : 'Xác thực'}</Text>
                </Pressable>

                <View style={{ flexDirection: 'row', marginTop: 24, alignItems: 'center' }}>
                    <Text style={{ color: COLORS.muted, fontSize: 14 }}>Không nhận được mã? </Text>
                    <Pressable onPress={handleResend} disabled={countdown > 0 || resending}>
                        <Text style={{ color: countdown > 0 ? COLORS.muted : COLORS.accent, fontSize: 14, fontWeight: '700' }}>
                            {countdown > 0 ? `Gửi lại sau ${countdown}s` : resending ? 'Đang gửi...' : 'Gửi lại'}
                        </Text>
                    </Pressable>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 24, paddingTop: 60, alignItems: 'center' },
    
    iconWrap:  { width: 80, height: 80, borderRadius: 40, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    heading:   { fontSize: 24, fontWeight: '800', marginBottom: 10, letterSpacing: -0.4 },
    otpRow:    { flexDirection: 'row', gap: 10, marginBottom: 32 },
    cell:      { width: 46, height: 58, borderRadius: 12, borderWidth: 1.5, fontSize: 22, fontWeight: '700' },
    btn:       { width: '100%', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
    btnText:   { color: '#fff', fontWeight: '800', fontSize: 15 },
});