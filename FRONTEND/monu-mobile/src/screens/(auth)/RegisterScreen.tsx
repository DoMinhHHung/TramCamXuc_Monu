import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
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
        if (err) {
            Alert.alert('Thông tin không hợp lệ', err);
            return;
        }
        setLoading(true);
        try {
            await registerUser({
                email: email.trim(),
                password,
                fullName: fullName.trim(),
                dob,
                ...(gender ? { gender } : {}),
            });
            navigation.navigate('VerifyOtp', { email: email.trim() });
        } catch (e: any) {
            Alert.alert('Lỗi', e?.message || 'Đăng ký thất bại, vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    const pwStrength = !password
        ? null
        : /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password)
            ? { label: 'Mạnh 💪', color: COLORS.success, width: '100%' }
            : password.length >= 6
                ? { label: 'Trung bình', color: COLORS.warningMid, width: '60%' }
                : { label: 'Yếu', color: COLORS.error, width: '30%' };

    return (
        <KeyboardAvoidingView
            style={styles.root}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <StatusBar style="light" />
            <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                <LinearGradient
                    colors={[COLORS.gradIndigo, COLORS.bg]}
                    style={[styles.gradientTop, { paddingTop: insets.top + 12 }]}
                >
                    <BackButton onPress={() => navigation.goBack()} />

                    <View style={styles.heroText}>
                        <Text style={styles.heroEmoji}>✨</Text>
                        <Text style={styles.title}>Tạo tài khoản</Text>
                        <Text style={styles.subtitle}>Hãy bắt đầu hành trình âm nhạc của bạn</Text>
                    </View>
                </LinearGradient>

                <View style={[styles.form, { paddingBottom: insets.bottom + 32 }]}>
                    <Text style={styles.fieldLabel}>Họ và tên</Text>
                    <TextInput
                        style={styles.input}
                        value={fullName}
                        onChangeText={setFullName}
                        placeholder="Nguyễn Văn A"
                        placeholderTextColor={COLORS.glass25}
                        autoCapitalize="words"
                    />

                    <Text style={styles.fieldLabel}>Email</Text>
                    <TextInput
                        style={styles.input}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="you@example.com"
                        placeholderTextColor={COLORS.glass25}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />

                    <Text style={styles.fieldLabel}>Mật khẩu</Text>
                    <View style={styles.pwWrap}>
                        <TextInput
                            secureTextEntry={!showPw}
                            style={styles.pwInput}
                            value={password}
                            onChangeText={setPassword}
                            placeholder="••••••••"
                            placeholderTextColor={COLORS.glass25}
                        />
                        <Pressable onPress={() => setShowPw(!showPw)} style={styles.eyeBtn}>
                            <Text style={{ fontSize: 18 }}>{showPw ? '🙈' : '👁️'}</Text>
                        </Pressable>
                    </View>

                    {pwStrength && (
                        <View style={styles.strengthWrap}>
                            <View style={styles.strengthBar}>
                                <View
                                    style={[
                                        styles.strengthFill,
                                        { backgroundColor: pwStrength.color, width: pwStrength.width },
                                    ]}
                                />
                            </View>
                            <Text style={[styles.strengthLabel, { color: pwStrength.color }]}>
                                {pwStrength.label}
                            </Text>
                        </View>
                    )}

                    <Text style={styles.fieldLabel}>Ngày sinh (DD/MM/YYYY)</Text>
                    <TextInput
                        style={styles.input}
                        value={dobDisplay}
                        onChangeText={handleDobChange}
                        placeholder="DD/MM/YYYY"
                        placeholderTextColor={COLORS.glass25}
                        keyboardType="numeric"
                        maxLength={10}
                    />

                    <Text style={styles.fieldLabel}>Giới tính</Text>
                    <View style={styles.genderRow}>
                        {(['MALE', 'FEMALE', 'OTHER'] as Gender[]).map(g => (
                            <Pressable
                                key={g}
                                style={[
                                    styles.genderBtn,
                                    gender === g && styles.genderBtnActive,
                                ]}
                                onPress={() => setGender(g)}
                            >
                                <Text
                                    style={[
                                        styles.genderText,
                                        gender === g && styles.genderTextActive,
                                    ]}
                                >
                                    {g === 'MALE' ? 'Nam' : g === 'FEMALE' ? 'Nữ' : 'Khác'}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    <Pressable
                        style={({ pressed }) => [
                            styles.btn,
                            loading && { opacity: 0.6 },
                            pressed && { opacity: 0.8 },
                        ]}
                        onPress={handleRegister}
                        disabled={loading}
                    >
                        <LinearGradient
                            colors={[COLORS.accent, COLORS.accentAlt]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.btnGradient}
                        >
                            <Text style={styles.btnText}>
                                {loading ? 'Đang đăng ký...' : 'Đăng ký'}
                            </Text>
                        </LinearGradient>
                    </Pressable>

                    <Pressable
                        style={styles.linkRow}
                        onPress={() => navigation.navigate('LoginOptions')}
                    >
                        <Text style={styles.linkText}>
                            Đã có tài khoản? <Text style={styles.linkAccent}>Đăng nhập</Text>
                        </Text>
                    </Pressable>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: COLORS.bg },
    gradientTop: { paddingHorizontal: 24, paddingBottom: 28 },
    heroText: { alignItems: 'center', marginTop: 20 },
    heroEmoji: { fontSize: 48, marginBottom: 16 },
    title: { color: COLORS.white, fontSize: 32, fontWeight: '800', marginBottom: 8 },
    subtitle: { color: COLORS.glass45, fontSize: 16, textAlign: 'center' },
    form: { paddingHorizontal: 24, paddingTop: 16 },
    fieldLabel: {
        color: COLORS.glass40,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        marginBottom: 8,
        marginTop: 16,
    },
    input: {
        backgroundColor: COLORS.glass06,
        borderWidth: 1,
        borderColor: COLORS.glass10,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 15,
        color: COLORS.white,
        fontSize: 15,
    },
    pwWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.glass06,
        borderWidth: 1,
        borderColor: COLORS.glass10,
        borderRadius: 14,
    },
    pwInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 15, color: COLORS.white, fontSize: 15 },
    eyeBtn: { paddingHorizontal: 14 },
    strengthWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
    strengthBar: { flex: 1, height: 4, backgroundColor: COLORS.glass10, borderRadius: 2 },
    strengthFill: { height: 4, borderRadius: 2 },
    strengthLabel: { fontSize: 13, fontWeight: '600' },
    genderRow: { flexDirection: 'row', gap: 12 },
    genderBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.glass12,
        backgroundColor: COLORS.glass04,
        alignItems: 'center',
    },
    genderBtnActive: {
        borderColor: COLORS.accent,
        backgroundColor: COLORS.accentFill20,
    },
    genderText: { fontSize: 14, fontWeight: '600', color: COLORS.glass45 },
    genderTextActive: { color: COLORS.accent },
    btn: { borderRadius: 999, overflow: 'hidden', marginTop: 32 },
    btnGradient: { minHeight: 60, alignItems: 'center', justifyContent: 'center' },
    btnText: { color: COLORS.white, fontWeight: '800', fontSize: 17 },
    linkRow: { alignItems: 'center', marginTop: 24 },
    linkText: { color: COLORS.glass40, fontSize: 15 },
    linkAccent: { color: COLORS.accent, fontWeight: '700' },
});