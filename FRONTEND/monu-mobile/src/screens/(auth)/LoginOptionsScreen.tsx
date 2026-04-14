import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

import { BackButton } from '../../components/BackButton';
import { SocialButton } from '../../components/SocialButton';
import { ColorScheme, useThemeColors } from '../../config/colors';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LocalizationContext';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { env } from '../../config/env';
import { moderateScale, scale, verticalScale } from '../../utils/responsive';

WebBrowser.maybeCompleteAuthSession();
const GATEWAY_URL = env.apiBaseUrl;

type Nav = NativeStackNavigationProp<RootStackParamList, 'LoginOptions'>;

export const LoginOptionsScreen = () => {
    const navigation = useNavigation<Nav>();
    const { loginDirect } = useAuth();
    const { t } = useTranslation();
    const themeColors = useThemeColors();
    const styles = createStyles(themeColors);
    const [loading, setLoading] = useState(false);
    const insets = useSafeAreaInsets();

    const doSocialLogin = async (provider: 'GOOGLE' | 'FACEBOOK') => {
        setLoading(true);
        try {
            const result = await WebBrowser.openAuthSessionAsync(
                `${GATEWAY_URL}/auth/oauth/${provider.toLowerCase()}`,
                'monumobile://oauth'
            );

            if (result.type !== 'success') return;

            const parsed = Linking.parse((result as { url: string }).url);
            const params = parsed.queryParams;

            if (params?.error) {
                Alert.alert(t('auth.login', 'Login'), t('screens.authOptions.oauthFailed', 'OAuth authentication failed'));
                return;
            }

            const accessToken = params?.accessToken as string | undefined;
            const refreshToken = params?.refreshToken as string | undefined;

            if (!accessToken || !refreshToken) {
                Alert.alert(t('common.error'), t('screens.authOptions.missingToken', 'No token received from server'));
                return;
            }

            await loginDirect(accessToken, refreshToken);
        } catch (error: any) {
            Alert.alert(t('common.error'), error?.message || t('screens.authOptions.socialLoginFailed', 'Social login failed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.root}>
            <StatusBar style="light" />

            {/* Background Decor */}
            <View style={styles.bgMeshWrapper}>
                <View style={[styles.gradTopHero, { backgroundColor: themeColors.gradPurple + '30' }]} />
                <View style={[styles.gradBottomSide, { backgroundColor: themeColors.accent + '15' }]} />
            </View>

            <View style={[styles.headerBox, { paddingTop: insets.top + verticalScale(12) }]}>
                <BackButton onPress={() => navigation.navigate('Welcome')} />
            </View>

            <View style={[styles.content, { paddingBottom: insets.bottom + verticalScale(32) }]}>
                {/* Hero Minimal */}
                <View style={styles.heroWrap}>
                    <Text style={styles.title}>{t('auth.welcomeBack', 'Chào mừng\ntrở lại')}</Text>
                    <Text style={styles.subtitle}>
                        {t('screens.authOptions.loginSubtitle', 'Tiếp tục với phương thức đăng nhập bạn chọn')}
                    </Text>
                </View>

                {/* Form Buttons */}
                <View style={styles.actionBox}>
                    <Pressable
                        style={({ pressed }) => [styles.emailBtn, pressed && { opacity: 0.9 }]}
                        onPress={() => navigation.navigate('Login')}
                    >
                        <LinearGradient
                            colors={[themeColors.accent, themeColors.accentAlt]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.emailBtnGradient}
                        >
                            <Text style={styles.emailText}>{t('screens.authOptions.continueWithEmail_Login', 'Đăng nhập với Email')}</Text>
                        </LinearGradient>
                    </Pressable>

                    <View style={styles.socialRow}>
                        <View style={{ flex: 1 }}>
                            <SocialButton
                                provider="google"
                                onPress={() => doSocialLogin('GOOGLE')}
                                disabled={loading}
                                styleOverrides={styles.socialBtnBase}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <SocialButton
                                provider="facebook"
                                onPress={() => doSocialLogin('FACEBOOK')}
                                disabled={loading}
                                styleOverrides={styles.socialBtnBase}
                            />
                        </View>
                    </View>

                    <Pressable
                        style={styles.footer}
                        onPress={() => navigation.navigate('RegisterOptions')}
                    >
                        <Text style={styles.footerText}>
                            {t('auth.dontHaveAccount', "Chưa có tài khoản?")}
                        </Text>
                        <Text style={styles.footerLink}>{t('auth.signup', ' Đăng ký ngay')}</Text>
                    </Pressable>
                </View>
            </View>
        </View>
    );
};

const createStyles = (colors: ColorScheme) => StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    bgMeshWrapper: { ...StyleSheet.absoluteFillObject, opacity: 0.7, zIndex: 0 },
    gradTopHero: { position: 'absolute', top: 0, left: 0, right: 0, height: verticalScale(400) },
    gradBottomSide: {
        position: 'absolute',
        top: scale(100),
        right: -scale(100),
        width: scale(300),
        height: scale(300),
        borderRadius: scale(150),
    },
    headerBox: { paddingHorizontal: scale(20), zIndex: 10 },
    content: { flex: 1, paddingHorizontal: scale(24), justifyContent: 'space-between', zIndex: 10 },
    heroWrap: { marginTop: verticalScale(40) },
    title: {
        color: colors.white,
        fontSize: moderateScale(42),
        fontWeight: '900',
        letterSpacing: -1,
        lineHeight: moderateScale(50),
        marginBottom: verticalScale(12),
    },
    subtitle: { color: colors.glass65, fontSize: moderateScale(16), fontWeight: '500', maxWidth: scale(240) },
    actionBox: { width: '100%' },
    emailBtn: { borderRadius: 999, overflow: 'hidden', marginBottom: verticalScale(16), shadowColor: colors.accent, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20 },
    emailBtnGradient: { minHeight: verticalScale(56), alignItems: 'center', justifyContent: 'center' },
    emailText: { color: colors.white, fontSize: moderateScale(16), fontWeight: '800' },
    socialRow: { flexDirection: 'row', gap: scale(12) },
    socialBtnBase: {
        backgroundColor: colors.glass04,
        borderColor: colors.glass10,
        height: verticalScale(56),
    },
    footer: { alignItems: 'center', marginTop: verticalScale(32), paddingVertical: verticalScale(16) },
    footerText: { color: colors.glass40, fontSize: moderateScale(14) },
    footerLink: { color: colors.accent, fontWeight: '700', fontSize: moderateScale(15), marginTop: verticalScale(4) },
});