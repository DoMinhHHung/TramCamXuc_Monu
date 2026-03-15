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
import { COLORS } from '../../config/colors';
import { useAuth } from '../../context/AuthContext';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { buildOAuthUrl } from '../../components/LinkComponent';

WebBrowser.maybeCompleteAuthSession();

type Nav = NativeStackNavigationProp<RootStackParamList, 'RegisterOptions'>;

export const RegisterOptionsScreen = () => {
  const navigation = useNavigation<Nav>();
  const { loginDirect } = useAuth();
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  const doSocialLogin = async (provider: 'GOOGLE' | 'FACEBOOK') => {
    setLoading(true);
    try {
      const result = await WebBrowser.openAuthSessionAsync(
          buildOAuthUrl(provider.toLowerCase() as 'google' | 'facebook'),
          'monumobile://oauth'
      );

      if (result.type !== 'success') return;

      const parsed = Linking.parse((result as { url: string }).url);
      const params = parsed.queryParams;

      if (params?.error) {
        Alert.alert('Đăng ký thất bại', 'Xác thực OAuth không thành công');
        return;
      }

      const accessToken = params?.accessToken as string | undefined;
      const refreshToken = params?.refreshToken as string | undefined;

      if (!accessToken || !refreshToken) {
        Alert.alert('Lỗi', 'Không nhận được token từ server');
        return;
      }

      await loginDirect(accessToken, refreshToken);
    } catch (error: any) {
      Alert.alert('Lỗi', error?.message || 'Đăng ký social thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
      <View style={styles.root}>
        <StatusBar style="light" />

        <LinearGradient
            colors={[COLORS.gradNavy, COLORS.bg]}
            style={[styles.gradientTop, { paddingTop: insets.top + 12 }]}
        >
          <BackButton onPress={() => navigation.navigate('Welcome')} />

          <View style={styles.heroText}>
            <Text style={styles.heroEmoji}>🎧</Text>
            <Text style={styles.title}>Tạo tài khoản Monu</Text>
            <Text style={styles.subtitle}>
              Bắt đầu trải nghiệm âm nhạc theo cách của riêng bạn
            </Text>
          </View>
        </LinearGradient>

        <View style={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
          <Pressable
              style={styles.emailBtn}
              onPress={() => navigation.navigate('Register')}
          >
            <LinearGradient
                colors={[COLORS.accent, COLORS.accentAlt]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.emailBtnGradient}
            >
              <Text style={styles.emailText}>Tiếp tục bằng Email</Text>
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
              Bạn đã có tài khoản?{' '}
              <Text style={styles.footerLink}>Đăng nhập</Text>
            </Text>
          </Pressable>
        </View>
      </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  gradientTop: { paddingHorizontal: 24, paddingBottom: 32 },
  heroText: { alignItems: 'center', marginTop: 40 },
  heroEmoji: { fontSize: 48, marginBottom: 16 },
  title: { color: COLORS.white, fontSize: 34, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: COLORS.glass50, fontSize: 16, textAlign: 'center', lineHeight: 24 },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  emailBtn: { borderRadius: 999, overflow: 'hidden', marginBottom: 16 },
  emailBtnGradient: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailText: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
  footer: { alignItems: 'center', marginTop: 32 },
  footerText: { color: COLORS.glass45, fontSize: 15 },
  footerLink: { color: COLORS.accent, fontWeight: '700' },
});