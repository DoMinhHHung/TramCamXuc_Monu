import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { forgotPassword } from '../../services/auth';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { ColorScheme, useThemeColors } from '../../config/colors';
import { BackButton } from '../../components/BackButton';
import { useTranslation } from '../../context/LocalizationContext';
import { moderateScale, scale, verticalScale } from '../../utils/responsive';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen() {
    const navigation = useNavigation<Nav>();
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const themeColors = useThemeColors();
    const styles = useMemo(() => createStyles(themeColors), [themeColors]);
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async () => {
        if (!email.trim()) { Alert.alert(t('common.error'), t('screens.authForgot.emailRequired', 'Vui lòng nhập email.')); return; }
        setLoading(true);
        try {
            await forgotPassword(email.trim());
            setSent(true);
        } catch (e: any) {
            Alert.alert(t('common.error'), e?.message || t('screens.authForgot.notFound', 'Không tìm thấy tài khoản.'));
        } finally { setLoading(false); }
    };

    return (
        <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <StatusBar style="light" />

            {/* Background Decor */}
            <View style={styles.bgMeshWrapper}>
                <View style={[styles.gradTopHero, { backgroundColor: themeColors.gradIndigo + '15' }]} />
            </View>

            <View style={[styles.headerBox, { paddingTop: insets.top + verticalScale(12) }]}>
                <BackButton onPress={() => navigation.goBack()} />
            </View>

            <View style={[styles.contentWrap, { paddingBottom: insets.bottom + verticalScale(32) }]}>
                <View style={styles.heroWrap}>
                    <Text style={styles.title}>
                        {sent ? t('screens.authForgot.sentTitle', 'Kiểm tra hộp thư') : t('screens.authForgot.title', 'Quên\nmật khẩu')}
                    </Text>
                    <Text style={styles.subtitle}>
                        {sent
                            ? t('screens.authForgot.sentSubtitle', 'Mã xác nhận đã được gửi đến:')
                            : t('screens.authForgot.subtitle', 'Nhập email liên kết với tài khoản của bạn để khôi phục mật khẩu.')}
                    </Text>

                    {sent && (
                        <View style={styles.emailHighlight}>
                            <Text style={styles.emailHighlightText}>{email}</Text>
                        </View>
                    )}
                </View>

                {/* Form Controls */}
                <View style={styles.formBox}>
                    {!sent ? (
                        <>
                            <Text style={styles.fieldLabel}>{t('auth.email', 'Email')}</Text>
                            <TextInput
                                style={styles.input}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="Nhập email của bạn"
                                placeholderTextColor={themeColors.glass40}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                selectionColor={themeColors.accent}
                            />

                            <Pressable
                                style={({ pressed }) => [styles.btn, (loading || pressed) && { opacity: 0.8 }]}
                                onPress={handleSubmit}
                                disabled={loading}
                            >
                                <LinearGradient
                                    colors={[themeColors.accent, themeColors.accentAlt]}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                    style={styles.btnGradient}
                                >
                                    <Text style={styles.btnText}>{loading ? t('screens.authForgot.sending', 'Đang gửi...') : t('screens.authForgot.sendOtp', 'Nhận mã xác nhận')}</Text>
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
                                    colors={[themeColors.accent, themeColors.accentAlt]}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                    style={styles.btnGradient}
                                >
                                    <Text style={styles.btnText}>{t('screens.authForgot.enterOtp', 'Tiếp tục')}</Text>
                                </LinearGradient>
                            </Pressable>

                            <Pressable style={styles.secondaryBtn} onPress={() => setSent(false)}>
                                <Text style={styles.secondaryBtnText}>{t('screens.authForgot.useDifferentEmail', 'Sử dụng email khác?')}</Text>
                            </Pressable>
                        </>
                    )}
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    bgMeshWrapper: { ...StyleSheet.absoluteFillObject, opacity: 0.7, zIndex: 0 },
    gradTopHero: { position: 'absolute', top: -scale(100), left: -scale(100), width: scale(400), height: scale(400), borderRadius: scale(200) },
    headerBox: { paddingHorizontal: scale(20), zIndex: 10 },
    contentWrap: { flex: 1, paddingHorizontal: scale(24), justifyContent: 'space-between', zIndex: 10 },
    heroWrap: { marginTop: verticalScale(40) },
    title: {
        color: colors.white,
        fontSize: moderateScale(42),
        fontWeight: '900',
        letterSpacing: -1,
        lineHeight: moderateScale(50),
        marginBottom: verticalScale(12),
    },
    subtitle: { color: colors.glass65, fontSize: moderateScale(16), fontWeight: '500', maxWidth: scale(280), lineHeight: moderateScale(24) },
    emailHighlight: {
        marginTop: verticalScale(16),
        alignSelf: 'flex-start',
        backgroundColor: colors.accent + '20',
        borderRadius: scale(8),
        paddingHorizontal: scale(16),
        paddingVertical: verticalScale(10),
        borderWidth: 1,
        borderColor: colors.accent + '30',
    },
    emailHighlightText: { color: colors.accent, fontWeight: '700', fontSize: moderateScale(15) },
    formBox: { width: '100%', paddingBottom: verticalScale(20) },
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
        marginBottom: verticalScale(32),
    },
    btn: { borderRadius: 999, overflow: 'hidden', shadowColor: colors.accent, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20 },
    btnGradient: { minHeight: verticalScale(56), alignItems: 'center', justifyContent: 'center' },
    btnText: { color: colors.white, fontWeight: '800', fontSize: moderateScale(16) },
    secondaryBtn: {
        minHeight: verticalScale(56),
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: verticalScale(16),
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.glass10,
        backgroundColor: colors.glass04,
    },
    secondaryBtnText: { color: colors.glass60, fontWeight: '600', fontSize: moderateScale(15) },
});