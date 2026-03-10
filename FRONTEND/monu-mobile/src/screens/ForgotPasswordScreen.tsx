import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { forgotPassword } from '../services/auth';
import { RootStackParamList } from '../navigation/AppNavigator';
import { COLORS } from '../config/colors';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen() {
    const navigation = useNavigation<Nav>();
    const [email, setEmail]     = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent]       = useState(false);

    const handleSubmit = async () => {
        if (!email.trim()) { Alert.alert('Thiếu thông tin', 'Vui lòng nhập email.'); return; }
        setLoading(true);
        try {
            await forgotPassword(email.trim());
            setSent(true);
        } catch (e: any) {
            Alert.alert('Lỗi', e?.message || 'Không tìm thấy email này.');
        } finally { setLoading(false); }
    };

    return (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: COLORS.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.container}>
                <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={{ color: COLORS.accent, fontSize: 15, fontWeight: '600' }}>← Quay lại</Text>
                </Pressable>

                <View style={[styles.iconWrap, { backgroundColor: COLORS.surface, borderColor: COLORS.accentDim }]}>
                    <Text style={{ fontSize: 34 }}>{sent ? '✅' : '🔑'}</Text>
                </View>

                {!sent ? (
                    <>
                        <Text style={[styles.heading, { color: COLORS.text }]}>Quên mật khẩu?</Text>
                        <Text style={{ fontSize: 14, color: COLORS.muted, lineHeight: 22, marginBottom: 32 }}>
                            Nhập email của bạn. Chúng tôi sẽ gửi mã OTP để đặt lại mật khẩu.
                        </Text>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: COLORS.surface, borderColor: COLORS.border, color: COLORS.text }]}
                            value={email} onChangeText={setEmail} placeholder="you@example.com"
                            placeholderTextColor={COLORS.muted} keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
                        />
                        <Pressable style={[styles.btn, { backgroundColor: COLORS.accentDim }, loading && { opacity: 0.5 }]} onPress={handleSubmit} disabled={loading}>
                            <Text style={styles.btnText}>{loading ? 'Đang gửi...' : 'Gửi mã OTP'}</Text>
                        </Pressable>
                    </>
                ) : (
                    <>
                        <Text style={[styles.heading, { color: COLORS.text }]}>Đã gửi mã OTP!</Text>
                        <Text style={{ fontSize: 14, color: COLORS.muted, lineHeight: 22, marginBottom: 32 }}>
                            Kiểm tra hộp thư của{'\n'}
                            <Text style={{ color: COLORS.accent, fontWeight: '700' }}>{email}</Text>
                            {'\n'}và nhập mã để đặt lại mật khẩu.
                        </Text>
                        <Pressable style={[styles.btn, { backgroundColor: COLORS.accentDim }]}
                                   onPress={() => navigation.navigate('ResetPassword', { email: email.trim() })}>
                            <Text style={styles.btnText}>Nhập mã OTP →</Text>
                        </Pressable>
                        <Pressable style={{ paddingVertical: 16, alignItems: 'center', marginTop: 12 }} onPress={() => setSent(false)}>
                            <Text style={{ color: COLORS.muted, fontWeight: '600', fontSize: 14 }}>Dùng email khác</Text>
                        </Pressable>
                    </>
                )}
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 24, paddingTop: 60 },
    backBtn:   { marginBottom: 40 },
    iconWrap:  { width: 80, height: 80, borderRadius: 40, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 24, alignSelf: 'center' },
    heading:   { fontSize: 24, fontWeight: '800', marginBottom: 10, letterSpacing: -0.4 },
    label:     { fontSize: 12, fontWeight: '600', color: COLORS.muted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 },
    input:     { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, marginBottom: 20 },
    btn:       { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
    btnText:   { color: '#fff', fontWeight: '800', fontSize: 15 },
});