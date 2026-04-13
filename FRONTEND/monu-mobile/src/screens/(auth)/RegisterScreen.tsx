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
import { ColorScheme, useThemeColors } from '../../config/colors';
import { MaterialIcons } from '@expo/vector-icons';
import { BackButton } from '../../components/BackButton';
import { useTranslation } from '../../context/LocalizationContext';
import { moderateScale, scale, verticalScale } from '../../utils/responsive';

type Gender = 'MALE' | 'FEMALE' | 'OTHER';
type Nav = NativeStackNavigationProp<RootStackParamList, 'Register'>;

export default function RegisterScreen() {
    const navigation = useNavigation<Nav>();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const colors = useThemeColors();
    const styles = createStyles(colors);
    
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rePassword, setRePassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [showRePw, setShowRePw] = useState(false);
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
        if (!rePassword) return t('screens.authRegister.validation.rePassword', 'Please re-enter your password.');
        if (password !== rePassword) return t('screens.authRegister.validation.passwordMatch', 'Passwords do not match.');
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

    // Password strength indicator
    const pwStrength = !password
        ? null
        : /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password)
            ? { label: t('screens.authRegister.passwordStrength.strong'), color: colors.success, width: '100%' as const }
            : password.length >= 6
                ? { label: t('screens.authRegister.passwordStrength.medium'), color: colors.warningMid, width: '60%' as const }
                : { label: t('screens.authRegister.passwordStrength.weak'), color: colors.error, width: '30%' as const };

    return (
        <KeyboardAvoidingView
            style={styles.root}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
            <StatusBar style="light" />

            {/* Background Decor */}
            <View style={styles.bgMeshWrapper}>
                <View style={[styles.gradTopHero, { backgroundColor: colors.gradIndigo + '15' }]} />
            </View>

            <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
                <View style={[styles.headerBox, { paddingTop: insets.top + verticalScale(12) }]}>
                    <BackButton onPress={() => navigation.goBack()} />
                </View>

                {/* Hero Minimal */}
                <View style={styles.heroWrap}>
                    <Text style={styles.title}>{t('auth.createAccount', 'Đăng ký\ntài khoản')}</Text>
                    <Text style={styles.subtitle}>{t('screens.authRegister.subtitle', 'Bắt đầu hành trình âm nhạc của bạn')}</Text>
                </View>

                <View style={[styles.form, { paddingBottom: insets.bottom + 32 }]}>
                    <Text style={styles.fieldLabel}>{t('auth.name', 'Họ và tên')}</Text>
                    <TextInput
                        style={styles.input}
                        value={fullName}
                        onChangeText={setFullName}
                        placeholder={t('screens.authRegister.fullNamePlaceholder', 'Nhập họ và tên')}
                        placeholderTextColor={colors.glass40}
                        autoCapitalize="words"
                        selectionColor={colors.accent}
                    />

                    <View style={styles.spacer} />

                    <Text style={styles.fieldLabel}>{t('auth.email', 'Email')}</Text>
                    <TextInput
                        style={styles.input}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="Nhập email của bạn"
                        placeholderTextColor={colors.glass40}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        selectionColor={colors.accent}
                    />

                    <View style={styles.spacer} />

                    <Text style={styles.fieldLabel}>{t('auth.password', 'Mật khẩu')}</Text>
                    <View style={styles.pwWrap}>
                        <TextInput
                            secureTextEntry={!showPw}
                            style={styles.pwInput}
                            value={password}
                            onChangeText={setPassword}
                            placeholder="Tối thiểu 8 ký tự..."
                            placeholderTextColor={colors.glass40}
                            selectionColor={colors.accent}
                        />
                        <Pressable onPress={() => setShowPw(!showPw)} style={styles.eyeBtn}>
                            <MaterialIcons
                                name={showPw ? 'visibility-off' : 'visibility'}
                                size={scale(20)}
                                color={colors.glass50}
                            />
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

                    <View style={styles.spacer} />

                    <Text style={styles.fieldLabel}>{t('screens.authRegister.rePasswordLabel', 'Nhập lại mật khẩu')}</Text>
                    <View style={styles.pwWrap}>
                        <TextInput
                            secureTextEntry={!showRePw}
                            style={styles.pwInput}
                            value={rePassword}
                            onChangeText={setRePassword}
                            placeholder="Xác nhận mật khẩu"
                            placeholderTextColor={colors.glass40}
                            selectionColor={colors.accent}
                        />
                        <Pressable onPress={() => setShowRePw(!showRePw)} style={styles.eyeBtn}>
                            <MaterialIcons
                                name={showRePw ? 'visibility-off' : 'visibility'}
                                size={scale(20)}
                                color={colors.glass50}
                            />
                        </Pressable>
                    </View>

                    <View style={styles.spacer} />

                    <Text style={styles.fieldLabel}>{t('screens.authRegister.dobLabel', 'Ngày sinh (DD/MM/YYYY)')}</Text>
                    <TextInput
                        style={styles.input}
                        value={dobDisplay}
                        onChangeText={handleDobChange}
                        placeholder="DD/MM/YYYY"
                        placeholderTextColor={colors.glass40}
                        keyboardType="numeric"
                        maxLength={10}
                        selectionColor={colors.accent}
                    />

                    <View style={styles.spacer} />

                    <Text style={styles.fieldLabel}>{t('screens.authRegister.genderLabel', 'Giới tính')}</Text>
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
                                    {g === 'MALE' ? t('screens.authRegister.gender.male', 'Nam') : g === 'FEMALE' ? t('screens.authRegister.gender.female', 'Nữ') : t('screens.authRegister.gender.other', 'Khác')}
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
                            colors={[colors.accent, colors.accentAlt]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.btnGradient}
                        >
                            <Text style={styles.btnText}>
                                {loading ? t('screens.authRegister.registering', 'Đang xử lý...') : t('auth.register', 'Đăng ký')}
                            </Text>
                        </LinearGradient>
                    </Pressable>

                    <Pressable
                        style={styles.linkRow}
                        onPress={() => navigation.navigate('LoginOptions')}
                    >
                        <Text style={styles.linkText}>
                            {t('auth.alreadyHaveAccount', 'Đã có tài khoản?')}
                        </Text>
                        <Text style={styles.linkAccent}>{t('auth.login', ' Đăng nhập')}</Text>
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
        marginBottom: verticalScale(8),
    },
    subtitle: { color: colors.glass65, fontSize: moderateScale(16), fontWeight: '500' },
    form: { paddingHorizontal: scale(24), flex: 1, zIndex: 10 },
    fieldLabel: {
        color: colors.glass50,
        fontSize: moderateScale(13),
        fontWeight: '600',
        marginBottom: verticalScale(8),
    },
    input: {
        backgroundColor: 'transparent',
        borderBottomWidth: 1,
        borderBottomColor: colors.glass20,
        color: colors.white,
        fontSize: moderateScale(16),
        paddingVertical: verticalScale(12),
        paddingHorizontal: 0,
    },
    spacer: { height: verticalScale(24) },
    pwWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: colors.glass20,
    },
    pwInput: {
        flex: 1,
        backgroundColor: 'transparent',
        color: colors.white,
        fontSize: moderateScale(16),
        paddingVertical: verticalScale(12),
        paddingHorizontal: 0,
    },
    eyeBtn: { padding: scale(8), marginRight: -scale(8) },
    strengthWrap: { flexDirection: 'row', alignItems: 'center', gap: scale(12), marginTop: verticalScale(12) },
    strengthBar: { flex: 1, height: verticalScale(3), backgroundColor: colors.glass10, borderRadius: 2 },
    strengthFill: { height: verticalScale(3), borderRadius: 2 },
    strengthLabel: { fontSize: moderateScale(12), fontWeight: '600' },
    genderRow: { flexDirection: 'row', gap: scale(12) },
    genderBtn: {
        flex: 1,
        paddingVertical: verticalScale(14),
        borderRadius: scale(12),
        borderWidth: 1,
        borderColor: colors.glass20,
        backgroundColor: colors.glass04,
        alignItems: 'center',
    },
    genderBtnActive: {
        borderColor: colors.accent,
        backgroundColor: colors.accent + '15',
    },
    genderText: { fontSize: moderateScale(14), fontWeight: '600', color: colors.glass65 },
    genderTextActive: { color: colors.accent },
    btn: { borderRadius: 999, overflow: 'hidden', marginTop: verticalScale(36), shadowColor: colors.accent, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20 },
    btnGradient: { minHeight: verticalScale(56), alignItems: 'center', justifyContent: 'center' },
    btnText: { color: colors.white, fontWeight: '800', fontSize: moderateScale(16) },
    linkRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginTop: verticalScale(32), paddingVertical: verticalScale(16) },
    linkText: { color: colors.glass40, fontSize: moderateScale(14) },
    linkAccent: { color: colors.accent, fontWeight: '700', fontSize: moderateScale(15) },
});