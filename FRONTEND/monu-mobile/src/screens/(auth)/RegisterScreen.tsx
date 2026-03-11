import React, { useState } from 'react';
import {
    Alert, KeyboardAvoidingView, Platform, Pressable,
    ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { registerUser } from '../../services/auth';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { COLORS } from '../../config/colors';

type Gender = 'MALE' | 'FEMALE' | 'OTHER';
type Nav = NativeStackNavigationProp<RootStackParamList, 'Register'>;

export default function RegisterScreen() {
    const navigation = useNavigation<Nav>();
    const [fullName, setFullName]     = useState('');
    const [email, setEmail]           = useState('');
    const [password, setPassword]     = useState('');
    const [dob, setDob]               = useState('');
    const [dobDisplay, setDobDisplay] = useState('');
    const [gender, setGender]         = useState<Gender | null>(null);
    const [loading, setLoading]       = useState(false);

    const handleDobChange = (text: string) => {
        const digits = text.replace(/\D/g, '').slice(0, 8);
        let formatted = digits;
        if (digits.length > 4) formatted = digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4);
        else if (digits.length > 2) formatted = digits.slice(0, 2) + '/' + digits.slice(2);
        setDobDisplay(formatted);
        if (digits.length === 8) {
            setDob(`${digits.slice(4)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`);
        } else { setDob(''); }
    };

    const validate = () => {
        if (!fullName.trim()) return 'Vui lòng nhập họ tên.';
        if (!email.trim())    return 'Vui lòng nhập email.';
        if (!password)        return 'Vui lòng nhập mật khẩu.';
        if (!dob)             return 'Vui lòng nhập ngày sinh đúng định dạng (DD/MM/YYYY).';
        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password))
            return 'Mật khẩu cần ≥ 8 ký tự, có chữ hoa, thường, số và ký tự đặc biệt.';
        return null;
    };

    const handleRegister = async () => {
        const err = validate();
        if (err) { Alert.alert('Thông tin không hợp lệ', err); return; }
        setLoading(true);
        try {
            await registerUser({ email: email.trim(), password, fullName: fullName.trim(), dob, ...(gender ? { gender } : {}) });
            navigation.navigate('VerifyOtp', { email: email.trim() });
        } catch (e: any) {
            Alert.alert('Lỗi', e?.message || 'Đăng ký thất bại, vui lòng thử lại.');
        } finally { setLoading(false); }
    };

    return (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: COLORS.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                <View style={styles.header}>
                    <View style={[styles.logoRing, { borderColor: COLORS.accent, backgroundColor: COLORS.surface }]}>
                        <Text style={{ fontSize: 32 }}>🎵</Text>
                    </View>
                    <Text style={[styles.heading, { color: COLORS.text }]}>Tạo tài khoản</Text>
                    <Text style={{ color: COLORS.muted, marginTop: 4 }}>Gia nhập cộng đồng âm nhạc</Text>
                </View>

                <Field label="Họ và tên"  value={fullName}    onChangeText={setFullName}    placeholder="Nguyễn Văn A" />
                <Field label="Email"       value={email}       onChangeText={setEmail}       placeholder="you@example.com" keyboard="email-address" autoCapitalize="none" />
                <Field label="Mật khẩu"   value={password}    onChangeText={setPassword}    placeholder="••••••••" secure />
                <Field label="Ngày sinh"  value={dobDisplay}  onChangeText={handleDobChange} placeholder="DD/MM/YYYY" keyboard="number-pad" autoCapitalize="none" />

                <Text style={styles.label}>Giới tính (tuỳ chọn)</Text>
                <View style={styles.genderRow}>
                    {(['MALE', 'FEMALE', 'OTHER'] as Gender[]).map(g => (
                        <Pressable key={g} style={[styles.genderBtn, { borderColor: COLORS.border, backgroundColor: COLORS.surface }, gender === g && { borderColor: COLORS.accent, backgroundColor: '#2D1B69' }]} onPress={() => setGender(p => p === g ? null : g)}>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: gender === g ? COLORS.accent : COLORS.muted }}>
                                {g === 'MALE' ? 'Nam' : g === 'FEMALE' ? 'Nữ' : 'Khác'}
                            </Text>
                        </Pressable>
                    ))}
                </View>

                <Pressable style={[styles.btn, { backgroundColor: COLORS.accentDim }, loading && { opacity: 0.5 }]} onPress={handleRegister} disabled={loading}>
                    <Text style={styles.btnText}>{loading ? 'Đang xử lý...' : 'Đăng ký'}</Text>
                </Pressable>

                <Pressable onPress={() => navigation.goBack()} style={styles.linkRow}>
                    <Text style={{ color: COLORS.muted, fontSize: 14 }}>
                        Đã có tài khoản? <Text style={{ color: COLORS.accent, fontWeight: '700' }}>Đăng nhập</Text>
                    </Text>
                </Pressable>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

function Field({ label, value, onChangeText, placeholder, secure, keyboard, autoCapitalize }: {
    label: string; value: string; onChangeText: (t: string) => void;
    placeholder?: string; secure?: boolean; keyboard?: any; autoCapitalize?: any;
}) {
    return (
        <View style={{ marginBottom: 14 }}>
            <Text style={styles.label}>{label}</Text>
            <TextInput style={styles.input} value={value} onChangeText={onChangeText} placeholder={placeholder}
                       placeholderTextColor={COLORS.muted} secureTextEntry={secure} keyboardType={keyboard}
                       autoCapitalize={autoCapitalize ?? 'words'} />
        </View>
    );
}

const styles = StyleSheet.create({
    scroll:    { flexGrow: 1, padding: 24, paddingTop: 60 },
    header:    { alignItems: 'center', marginBottom: 32 },
    logoRing:  { width: 72, height: 72, borderRadius: 36, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    heading:   { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
    label:     { fontSize: 12, fontWeight: '600', color: COLORS.muted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 },
    input:     { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: COLORS.text, fontSize: 15 },
    genderRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    genderBtn: { flex: 1, paddingVertical: 11, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
    btn:       { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
    btnText:   { color: '#fff', fontWeight: '800', fontSize: 15 },
    linkRow:   { alignItems: 'center', marginTop: 20 },
});