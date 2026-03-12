import React, { useState } from 'react';
import {
    Alert, KeyboardAvoidingView, Platform, Pressable,
    ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { registerUser } from '../../services/auth';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { COLORS } from '../../config/colors';
import { BackButton } from '../../components/BackButton';

type Gender = 'MALE' | 'FEMALE' | 'OTHER';
type Nav = NativeStackNavigationProp<RootStackParamList, 'Register'>;

export default function RegisterScreen() {
    const navigation = useNavigation<Nav>();
    const insets = useSafeAreaInsets();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [dob, setDob] = useState('');
    const [dobDisplay, setDobDisplay] = useState('');
    const [gender, setGender] = useState<Gender | null>(null);
    const [loading, setLoading] = useState(false);

    const handleDobChange = (text: string) => {
        const digits = text.replace(/\D/g, '').slice(0, 8);
        let formatted = digits;
        if (digits.length > 4) formatted = digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4);
        else if (digits.length > 2) formatted = digits.slice(0, 2) + '/' + digits.slice(2);
        setDobDisplay(formatted);
        if (digits.length === 8) setDob(`${digits.slice(4)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`);
        else setDob('');
    };

    const validate = () => {
        if (!fullName.trim()) return 'Vui lòng nhập họ tên.';
        if (!email.trim()) return 'Vui lòng nhập email.';
        if (!password) return 'Vui lòng nhập mật khẩu.';
        if (!dob) return 'Vui lòng nhập ngày sinh đúng định dạng (DD/MM/YYYY).';
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

    const pwStrength = !password ? null
        : /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password) ? { label: 'Mạnh 💪', color: COLORS.success, w: '100%' as const }
            : password.length >= 6 ? { label: 'Trung bình', color: COLORS.warningMid, w: '60%' as const }
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
                    colors={[COLORS.gradNavy, COLORS.bg]}
                    style={[styles.gradientTop, { paddingTop: insets.top + 12 }]}
                >
                    <BackButton onPress={() => navigation.goBack()} />
                    <View style={styles.heroText}>
                        <Text style={styles.heroEmoji}>🎵</Text>
                        <Text style={styles.title}>Tạo tài khoản</Text>
                        <Text style={styles.subtitle}>Gia nhập cộng đồng âm nhạc</Text>
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: COLORS.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                <BackButton onPress={() => navigation.goBack()} />
                <View style={styles.header}>
                    <View style={[styles.logoRing, { borderColor: COLORS.accent, backgroundColor: COLORS.surface }]}>
                        <Text style={{ fontSize: 32 }}>🎵</Text>
                    </View>
                </LinearGradient>

                <View style={[styles.form, { paddingBottom: insets.bottom + 32 }]}>
                    <Field label="Họ và tên" value={fullName} onChangeText={setFullName} placeholder="Nguyễn Văn A" />
                    <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboard="email-address" autoCapitalize="none" />

                    {/* Password field with strength */}
                    <Text style={styles.fieldLabel}>Mật khẩu</Text>
                    <View style={styles.pwWrap}>
                        <TextInput
                            style={styles.pwInput}
                            value={password}
                            onChangeText={setPassword}
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

                    <Field label="Ngày sinh" value={dobDisplay} onChangeText={handleDobChange} placeholder="DD/MM/YYYY" keyboard="number-pad" autoCapitalize="none" />

                    {/* Gender */}
                    <Text style={styles.fieldLabel}>Giới tính (tuỳ chọn)</Text>
                    <View style={styles.genderRow}>
                        {(['MALE', 'FEMALE', 'OTHER'] as Gender[]).map(g => (
                            <Pressable
                                key={g}
                                style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
                                onPress={() => setGender(p => p === g ? null : g)}
                            >
                                <Text style={[styles.genderText, gender === g && styles.genderTextActive]}>
                                    {g === 'MALE' ? '♂ Nam' : g === 'FEMALE' ? '♀ Nữ' : '◎ Khác'}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    <Pressable
                        style={({ pressed }) => [styles.btn, (loading || pressed) && { opacity: 0.8 }]}
                        onPress={handleRegister}
                        disabled={loading}
                    >
                        <LinearGradient
                            colors={[COLORS.accent, COLORS.accentAlt]}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            style={styles.btnGradient}
                        >
                            <Text style={styles.btnText}>{loading ? 'Đang xử lý...' : 'Đăng ký'}</Text>
                        </LinearGradient>
                    </Pressable>

                    <Pressable onPress={() => navigation.navigate('LoginOptions')} style={styles.linkRow}>
                        <Text style={styles.linkText}>
                            Đã có tài khoản?{'  '}
                            <Text style={styles.linkAccent}>Đăng nhập</Text>
                        </Text>
                    </Pressable>
                </View>
                <Pressable onPress={() => navigation.navigate('LoginOptions')} style={styles.linkRow}>
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
        <View style={{ marginBottom: 4 }}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="COLORS.glass25"
                secureTextEntry={secure}
                keyboardType={keyboard}
                autoCapitalize={autoCapitalize ?? 'words'}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: COLORS.bg },

    gradientTop: { paddingHorizontal: 24, paddingBottom: 28 },
    heroText: { marginTop: 20 },
    heroEmoji: { fontSize: 32, marginBottom: 10 },
    title: { color: COLORS.white, fontSize: 30, fontWeight: '800', marginBottom: 6 },
    subtitle: { color: 'COLORS.glass45', fontSize: 15 },

    form: { paddingHorizontal: 24, paddingTop: 4 },

    fieldLabel: {
        color: 'COLORS.glass40',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        marginBottom: 8,
        marginTop: 16,
    },
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

    genderRow: { flexDirection: 'row', gap: 8 },
    genderBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'COLORS.glass12',
        backgroundColor: 'COLORS.glass04',
        alignItems: 'center',
    },
    genderBtnActive: {
        borderColor: COLORS.accent,
        backgroundColor: 'COLORS.accentFill20',
    },
    genderText: { fontSize: 13, fontWeight: '600', color: 'COLORS.glass45' },
    genderTextActive: { color: COLORS.accent },

    btn: { borderRadius: 999, overflow: 'hidden', marginTop: 24 },
    btnGradient: { minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
    btnText: { color: COLORS.white, fontWeight: '800', fontSize: 16 },

    linkRow: { alignItems: 'center', paddingTop: 20 },
    linkText: { color: 'COLORS.glass40', fontSize: 14 },
    linkAccent: { color: COLORS.accent, fontWeight: '700' },
    scroll:    { flexGrow: 1, padding: 24, paddingTop: 24 },
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