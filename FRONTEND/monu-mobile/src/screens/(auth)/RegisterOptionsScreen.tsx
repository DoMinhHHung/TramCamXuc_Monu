import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
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
