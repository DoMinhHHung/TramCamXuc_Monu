import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { forgotPassword } from '../../services/auth';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { COLORS } from '../../config/colors';
import { BackButton } from '../../components/BackButton';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen() {
    const navigation = useNavigation<Nav>();
    const insets = useSafeAreaInsets();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

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
        <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <StatusBar style="light" />

            <LinearGradient
                colors={[COLORS.gradIndigo, COLORS.bg]}
                style={[styles.gradientTop, { paddingTop: insets.top + 12 }]}
            >
                <BackButton onPress={() => navigation.goBack()} />

                <View style={styles.iconWrap}>
                    <Text style={{ fontSize: 40 }}>{sent ? '✅' : '🔑'}</Text>
                </View>

                <Text style={styles.title}>
                    {sent ? 'Đã gửi mã OTP!' : 'Quên mật khẩu?'}
                </Text>
                <Text style={styles.subtitle}>
                    {sent
                        ? `Kiểm tra hộp thư của bạn và nhập mã để đặt lại mật khẩu.`
                        : 'Nhập email để nhận mã OTP đặt lại mật khẩu.'}
                </Text>

                {sent && (
                    <View style={styles.emailHighlight}>
                        <Text style={styles.emailHighlightText}>{email}</Text>
                    </View>
                )}
            </LinearGradient>

            <View style={[styles.form, { paddingBottom: insets.bottom + 32 }]}>
                {!sent ? (
                    <>
                        <Text style={styles.fieldLabel}>Email</Text>
                        <TextInput
                            style={styles.input}
                            value={email}
                            onChangeText={setEmail}
                            placeholder="you@example.com"
                            placeholderTextColor="COLORS.glass25"
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />

                        <Pressable
                            style={({ pressed }) => [styles.btn, (loading || pressed) && { opacity: 0.8 }]}
                            onPress={handleSubmit}
                            disabled={loading}
                        >
                            <LinearGradient
                                colors={[COLORS.accent, COLORS.accentAlt]}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                style={styles.btnGradient}
                            >
                                <Text style={styles.btnText}>{loading ? 'Đang gửi...' : 'Gửi mã OTP'}</Text>
                            </LinearGradient>
                        </Pressable>
                    </>
                ) : (
                    <>
                        <Pressable
                            style={({ pressed }) => [styles.btn, pressed && { opacity: 0.8 }]}
                            onPress={() => navigation.navigate('ResetPassword', { email: email.trim() })}
                        >
                            <LinearGradient
                                colors={[COLORS.accent, COLORS.accentAlt]}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                style={styles.btnGradient}
                            >
                                <Text style={styles.btnText}>Nhập mã OTP →</Text>
                            </LinearGradient>
                        </Pressable>

                        <Pressable style={styles.secondaryBtn} onPress={() => setSent(false)}>
                            <Text style={styles.secondaryBtnText}>Dùng email khác</Text>
                        </Pressable>
                    </>
                )}
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: COLORS.bg },

    gradientTop: {
        paddingHorizontal: 24,
        paddingBottom: 36,
    },

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
        marginBottom: 20,
        alignSelf: 'center',
    },

    title: { color: COLORS.white, fontSize: 28, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
    subtitle: { color: 'COLORS.glass50', fontSize: 15, textAlign: 'center', lineHeight: 22 },

    emailHighlight: {
        marginTop: 14,
        alignSelf: 'center',
        backgroundColor: 'COLORS.accentFill20',
        borderRadius: 999,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: 'COLORS.accentBorder30',
    },
    emailHighlightText: { color: COLORS.accent, fontWeight: '700', fontSize: 14 },

    form: { paddingHorizontal: 24, paddingTop: 8 },

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
        marginBottom: 8,
    },

    btn: { borderRadius: 999, overflow: 'hidden', marginTop: 20 },
    btnGradient: { minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
    btnText: { color: COLORS.white, fontWeight: '800', fontSize: 16 },

    secondaryBtn: {
        minHeight: 52,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: 'COLORS.glass12',
    },
    secondaryBtnText: { color: 'COLORS.glass60', fontWeight: '600', fontSize: 15 },
});