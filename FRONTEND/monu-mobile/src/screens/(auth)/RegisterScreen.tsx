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
import { useTranslation } from '../../context/LocalizationContext';

type Gender = 'MALE' | 'FEMALE' | 'OTHER';
type Nav = NativeStackNavigationProp<RootStackParamList, 'Register'>;

export default function RegisterScreen() {
    const navigation = useNavigation<Nav>();
    const { t } = useTranslation();
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
        if (!fullName.trim()) return t('screens.authRegister.validation.fullName', 'Please enter your full name.');
        if (!email.trim()) return t('screens.authRegister.validation.email', 'Please enter your email.');
        if (!password) return t('screens.authRegister.validation.password', 'Please enter your password.');
        if (!dob) return t('screens.authRegister.validation.dob', 'Please enter your date of birth in DD/MM/YYYY format.');
        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password))
            return t('screens.authRegister.validation.passwordPolicy', 'Password must be at least 8 characters with uppercase, lowercase, number, and special character.');
        return null;
    };

    const handleRegister = async () => {
        const err = validate();
        if (err) {
            Alert.alert(t('screens.authRegister.invalidInfoTitle', 'Invalid information'), err);
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
            Alert.alert(t('common.error'), e?.message || t('screens.authRegister.registerFailed', 'Registration failed, please try again.'));
        } finally {
            setLoading(false);
        }
    };

    const pwStrength = !password
        ? null
        : /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password)
            ? { label: t('screens.authRegister.passwordStrength.strong', 'Strong 💪'), color: COLORS.success, width: '100%' as const }
            : password.length >= 6
                ? { label: t('screens.authRegister.passwordStrength.medium', 'Medium'), color: COLORS.warningMid, width: '60%' as const }
                : { label: t('screens.authRegister.passwordStrength.weak', 'Weak'), color: COLORS.error, width: '30%' as const };

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
                        <Text style={styles.title}>{t('auth.createAccount')}</Text>
                        <Text style={styles.subtitle}>{t('screens.authRegister.subtitle', 'Start your music journey')}</Text>
                    </View>
                </LinearGradient>

                <View style={[styles.form, { paddingBottom: insets.bottom + 32 }]}>
                    <Text style={styles.fieldLabel}>{t('auth.name')}</Text>
                    <TextInput
                        style={styles.input}
                        value={fullName}
                        onChangeText={setFullName}
                        placeholder={t('screens.authRegister.fullNamePlaceholder', 'Your full name')}
                        placeholderTextColor={COLORS.glass25}
                        autoCapitalize="words"
                    />

                    <Text style={styles.fieldLabel}>{t('auth.email')}</Text>
                    <TextInput
                        style={styles.input}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="you@example.com"
                        placeholderTextColor={COLORS.glass25}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />

                    <Text style={styles.fieldLabel}>{t('auth.password')}</Text>
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

                    <Text style={styles.fieldLabel}>{t('screens.authRegister.dobLabel', 'Date of birth (DD/MM/YYYY)')}</Text>
                    <TextInput
                        style={styles.input}
                        value={dobDisplay}
                        onChangeText={handleDobChange}
                        placeholder="DD/MM/YYYY"
                        placeholderTextColor={COLORS.glass25}
                        keyboardType="numeric"
                        maxLength={10}
                    />

                    <Text style={styles.fieldLabel}>{t('screens.authRegister.genderLabel', 'Gender')}</Text>
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
                                    {g === 'MALE' ? t('screens.authRegister.gender.male', 'Male') : g === 'FEMALE' ? t('screens.authRegister.gender.female', 'Female') : t('screens.authRegister.gender.other', 'Other')}
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
                                {loading ? t('screens.authRegister.registering', 'Registering...') : t('auth.register')}
                            </Text>
                        </LinearGradient>
                    </Pressable>

                    <Pressable
                        style={styles.linkRow}
                        onPress={() => navigation.navigate('LoginOptions')}
                    >
                        <Text style={styles.linkText}>
                            {t('auth.alreadyHaveAccount')} <Text style={styles.linkAccent}>{t('auth.login')}</Text>
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