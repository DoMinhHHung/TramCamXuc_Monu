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
import { COLORS, ColorScheme, useThemeColors } from '../../config/colors';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LocalizationContext';
import { RootStackParamList } from '../../navigation/AppNavigator';

WebBrowser.maybeCompleteAuthSession();
const GATEWAY_URL = 'https://phazelsound.oopsgolden.id.vn';

type Nav = NativeStackNavigationProp<RootStackParamList, 'RegisterOptions'>;

export const RegisterOptionsScreen = () => {
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
        Alert.alert(t('auth.signup', 'Sign up'), t('screens.authOptions.oauthFailed', 'OAuth authentication failed'));
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
      Alert.alert(t('common.error'), error?.message || t('screens.authOptions.socialRegisterFailed', 'Social sign up failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
      <View style={styles.root}>
        <StatusBar style="light" />

        <LinearGradient
          colors={[themeColors.gradNavy, themeColors.bg]}
            style={[styles.gradientTop, { paddingTop: insets.top + 12 }]}
        >
          <BackButton onPress={() => navigation.navigate('Welcome')} />

          <View style={styles.heroText}>
            <Text style={styles.heroEmoji}>🎧</Text>
            <Text style={styles.title}>{t('screens.authOptions.registerTitle', 'Create your Monu account')}</Text>
            <Text style={styles.subtitle}>
              {t('screens.authOptions.registerSubtitle', 'Start your music journey your way')}
            </Text>
          </View>
        </LinearGradient>

        <View style={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
          <Pressable
              style={styles.emailBtn}
              onPress={() => navigation.navigate('Register')}
          >
            <LinearGradient
                colors={[themeColors.accent, themeColors.accentAlt]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.emailBtnGradient}
            >
              <Text style={styles.emailText}>{t('screens.authOptions.continueWithEmail', 'Continue with Email')}</Text>
            </LinearGradient>
          </Pressable>

          <SocialButton
              provider="google"
              onPress={() => doSocialLogin('GOOGLE')}
              disabled={loading}
          />
          <SocialButton
              provider="facebook"
              onPress={() => doSocialLogin('FACEBOOK')}
              disabled={loading}
          />

          <Pressable
              style={styles.footer}
              onPress={() => navigation.navigate('LoginOptions')}
          >
            <Text style={styles.footerText}>
              {t('auth.alreadyHaveAccount', 'Already have an account?')}{' '}
              <Text style={styles.footerLink}>{t('auth.login', 'Login')}</Text>
            </Text>
          </Pressable>
        </View>
      </View>
  );
};

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  gradientTop: { paddingHorizontal: 24, paddingBottom: 32 },
  heroText: { alignItems: 'center', marginTop: 40 },
  heroEmoji: { fontSize: 48, marginBottom: 16 },
  title: { color: colors.white, fontSize: 34, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: colors.glass50, fontSize: 16, textAlign: 'center', lineHeight: 24 },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  emailBtn: { borderRadius: 999, overflow: 'hidden', marginBottom: 16 },
  emailBtnGradient: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailText: { color: colors.white, fontSize: 16, fontWeight: '800' },
  footer: { alignItems: 'center', marginTop: 32 },
  footerText: { color: colors.glass45, fontSize: 15 },
  footerLink: { color: colors.accent, fontWeight: '700' },
});