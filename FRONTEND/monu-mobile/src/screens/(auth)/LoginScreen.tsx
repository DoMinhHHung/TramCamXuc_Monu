import React, { useMemo, useState } from 'react';
import {
    Alert, KeyboardAvoidingView, Platform, Pressable,
    ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import { BackButton } from '../../components/BackButton';
import { ColorScheme, useThemeColors } from '../../config/colors';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LocalizationContext';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { moderateScale, scale, verticalScale } from '../../utils/responsive';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export const LoginScreen = () => {
    const navigation = useNavigation<Nav>();
    const { login } = useAuth();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const themeColors = useThemeColors();
    const styles = useMemo(() => createStyles(themeColors), [themeColors]);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);

    const doEmailLogin = async () => {
        try {
            setLoading(true);
            await login(email.trim(), password);
        } catch (e: any) {
            Alert.alert(t('auth.login'), e?.message || t('errors.somethingWentWrong'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.root}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
            <StatusBar style="light" />

            {/* Background Decor */}
            <View style={styles.bgMeshWrapper}>
                <View style={[styles.gradTopHero, { backgroundColor: themeColors.gradIndigo + '15' }]} />
            </View>

            <ScrollView
                contentContainerStyle={{ flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.headerBox, { paddingTop: insets.top + verticalScale(12) }]}>
                    <BackButton onPress={() => navigation.goBack()} />
                </View>

                {/* Hero Minimal */}
                <View style={styles.heroWrap}>
                    <Text style={styles.title}>{t('auth.welcomeBack', 'Chào mừng\ntrở lại')}</Text>
                    <Text style={styles.subtitle}>{t('screens.authOptions.loginSubtitle', 'Đăng nhập vào tài khoản của bạn')}</Text>
                </View>

                <View style={[styles.form, { paddingBottom: insets.bottom + verticalScale(32) }]}>
                    <Text style={styles.fieldLabel}>{t('auth.email', 'Email')}</Text>
                    <TextInput
                        autoCapitalize="none"
                        keyboardType="email-address"
                        placeholder="Nhập email của bạn"
                        placeholderTextColor={themeColors.glass40}
                        style={styles.input}
                        value={email}
                        onChangeText={setEmail}
                        selectionColor={themeColors.accent}
                    />

                    <View style={styles.spacer} />

                    <Text style={styles.fieldLabel}>{t('auth.password', 'Mật khẩu')}</Text>
                    <View style={styles.pwWrap}>
                        <TextInput
                            secureTextEntry={!showPw}
                            placeholder="Nhập mật khẩu"
                            placeholderTextColor={themeColors.glass40}
                            style={styles.pwInput}
                            value={password}
                            onChangeText={setPassword}
                            selectionColor={themeColors.accent}
                        />
                        <Pressable onPress={() => setShowPw(!showPw)} style={styles.eyeBtn}>
                            <MaterialIcons
                                name={showPw ? 'visibility-off' : 'visibility'}
                                size={scale(20)}
                                color={themeColors.glass50}
                            />
                        </Pressable>
                    </View>

                    <Pressable onPress={() => navigation.navigate('ForgotPassword')} style={styles.forgotRow}>
                        <Text style={styles.forgotText}>{t('auth.forgotPassword', 'Quên mật khẩu?')}</Text>
                    </Pressable>

                    <Pressable
                        style={({ pressed }) => [styles.loginBtn, (loading || pressed) && { opacity: 0.8 }]}
                        onPress={doEmailLogin}
                        disabled={loading}
                    >
                        <LinearGradient
                            colors={[themeColors.accent, themeColors.accentAlt]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.loginBtnGradient}
                        >
                            <Text style={styles.loginText}>{loading ? t('screens.login.loading', 'Đang xử lý...') : t('auth.login', 'Đăng nhập')}</Text>
                        </LinearGradient>
                    </Pressable>

                    <Pressable
                        style={styles.registerRow}
                        onPress={() => navigation.navigate('RegisterOptions')}
                    >
                        <Text style={styles.registerText}>
                            {t('auth.dontHaveAccount', 'Chưa có tài khoản?')}
                        </Text>
                        <Text style={styles.registerLink}>{t('auth.signup', ' Đăng ký')}</Text>
                    </Pressable>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

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
    forgotRow: { alignSelf: 'flex-end', marginTop: verticalScale(16), marginBottom: verticalScale(32) },
    forgotText: { color: colors.glass65, fontSize: moderateScale(13), fontWeight: '600' },
    loginBtn: { borderRadius: 999, overflow: 'hidden', shadowColor: colors.accent, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20 },
    loginBtnGradient: { minHeight: verticalScale(56), alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
    loginText: { color: colors.white, fontWeight: '800', fontSize: moderateScale(16) },
    registerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginTop: verticalScale(32), paddingVertical: verticalScale(16) },
    registerText: { color: colors.glass40, fontSize: moderateScale(14) },
    registerLink: { color: colors.accent, fontWeight: '700', fontSize: moderateScale(15) },
});
