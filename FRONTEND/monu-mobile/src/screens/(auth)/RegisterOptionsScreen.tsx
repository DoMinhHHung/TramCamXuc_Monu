import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { BackButton } from '../../components/BackButton';
import { SocialButton } from '../../components/SocialButton';
import { COLORS } from '../../config/colors';
import { useAuth } from '../../context/AuthContext';
import { RootStackParamList } from '../../navigation/AppNavigator';

WebBrowser.maybeCompleteAuthSession();
const GATEWAY_URL = 'https://phazelsound.oopsgolden.id.vn';

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
          `${GATEWAY_URL}/auth/oauth/${provider.toLowerCase()}`,
          'monumobile://oauth',
      );
      if (result.type !== 'success') return;
      const parsed = Linking.parse((result as { url: string }).url);
      const params = parsed.queryParams;
      if (params?.error) { Alert.alert('Đăng ký thất bại', 'Xác thực OAuth không thành công'); return; }
      const accessToken = params?.accessToken as string | undefined;
      const refreshToken = params?.refreshToken as string | undefined;
      if (!accessToken || !refreshToken) { Alert.alert('Lỗi', 'Không nhận được token từ server'); return; }
        `${GATEWAY_URL}/auth/oauth/${provider.toLowerCase()}`,
        'monumobile://oauth',
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
            <Text style={styles.heroEmoji}>🎤</Text>
            <Text style={styles.title}>Tạo tài khoản{'\n'}Monu</Text>
            <Text style={styles.subtitle}>Bắt đầu trải nghiệm âm nhạc theo cách của riêng bạn</Text>
          </View>
        </LinearGradient>

        <View style={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
          <Pressable
              style={({ pressed }) => [styles.emailBtn, pressed && { opacity: 0.85 }]}
              onPress={() => navigation.navigate('Register')}
          >
            <LinearGradient
                colors={[COLORS.accent, COLORS.accentAlt]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.emailBtnGradient}
            >
              <Text style={styles.emailBtnIcon}>✉</Text>
              <Text style={styles.emailText}>Tiếp tục bằng Email</Text>
            </LinearGradient>
          </Pressable>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>hoặc</Text>
            <View style={styles.dividerLine} />
          </View>

          <SocialButton provider="google" onPress={() => doSocialLogin('GOOGLE')} disabled={loading} />
          <SocialButton provider="facebook" onPress={() => doSocialLogin('FACEBOOK')} disabled={loading} />

          <Pressable style={styles.footer} onPress={() => navigation.navigate('LoginOptions')}>
            <Text style={styles.footerText}>
              Bạn đã có tài khoản?{'  '}
              <Text style={styles.footerLink}>Đăng nhập</Text>
            </Text>
          </Pressable>
        </View>
      </View>
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <BackButton onPress={() => navigation.navigate('Welcome')} />

        <View style={styles.content}>
          <Text style={styles.title}>Tạo tài khoản Monu</Text>
          <Text style={styles.subtitle}>Bắt đầu trải nghiệm âm nhạc theo cách của riêng bạn</Text>

          <Pressable style={styles.emailBtn} onPress={() => navigation.navigate('Register')}>
            <Text style={styles.emailText}>Tiếp tục bằng Email</Text>
          </Pressable>

          <SocialButton provider="google" onPress={() => doSocialLogin('GOOGLE')} disabled={loading} />
          <SocialButton provider="facebook" onPress={() => doSocialLogin('FACEBOOK')} disabled={loading} />
        </View>

        <Pressable style={styles.footer} onPress={() => navigation.navigate('LoginOptions')}>
          <Text style={styles.footerText}>
            Bạn đã có tài khoản? <Text style={styles.footerLink}>Đăng nhập</Text>
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  gradientTop: { paddingHorizontal: 24, paddingBottom: 32 },

  heroText: { marginTop: 20 },
  heroEmoji: { fontSize: 36, marginBottom: 12 },
  title: { color: COLORS.white, fontSize: 34, fontWeight: '800', lineHeight: 42, marginBottom: 10 },
  subtitle: { color: 'COLORS.glass50', fontSize: 15, lineHeight: 22 },

  content: { flex: 1, paddingHorizontal: 24, paddingTop: 8, justifyContent: 'center' },

  emailBtn: { borderRadius: 999, overflow: 'hidden', marginBottom: 14 },
  emailBtnGradient: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 999,
  },
  emailBtnIcon: { color: COLORS.white, fontSize: 18 },
  emailText: { color: COLORS.white, fontSize: 16, fontWeight: '800' },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'COLORS.glass10' },
  dividerText: { color: 'COLORS.glass30', fontSize: 13, marginHorizontal: 12 },

  footer: { alignItems: 'center', paddingTop: 24 },
  footerText: { color: 'COLORS.glass45', fontSize: 14 },
  footerLink: { color: COLORS.accent, fontWeight: '700' },
});
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1, paddingHorizontal: 24, paddingBottom: 24 },
  content: { flex: 1, justifyContent: 'center' },
  title: { color: COLORS.text, fontSize: 28, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: COLORS.muted, fontSize: 15, lineHeight: 22, marginBottom: 28 },
  emailBtn: {
    width: '100%',
    minHeight: 54,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    marginBottom: 2,
  },
  emailText: { color: COLORS.bg, fontSize: 15, fontWeight: '800' },
  footer: { alignItems: 'center', paddingVertical: 10 },
  footerText: { color: COLORS.muted, fontSize: 14 },
  footerLink: { color: COLORS.accent, fontWeight: '700' },
});
