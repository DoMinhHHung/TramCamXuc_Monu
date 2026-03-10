import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import React, { useState, useEffect } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { SocialButton } from '../components/SocialButton';
import { useAuth } from '../context/AuthContext';

WebBrowser.maybeCompleteAuthSession();

const GATEWAY_URL = 'https://phazelsound.oopsgolden.id.vn';

export const LoginScreen = () => {
  const { login, loginDirect } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    const handleDeepLink = async ({ url }: { url: string }) => {
      if (!url.startsWith('monumobile://oauth')) return;

      const parsed = Linking.parse(url);
      const params = parsed.queryParams;

      if (params?.error) {
        Alert.alert('Đăng nhập thất bại', 'Xác thực OAuth không thành công');
        setLoading(false);
        return;
      }

      const accessToken  = params?.accessToken as string;
      const refreshToken = params?.refreshToken as string;

      if (!accessToken || !refreshToken) {
        Alert.alert('Lỗi', 'Không nhận được token từ server');
        setLoading(false);
        return;
      }

      try {
        await loginDirect(accessToken, refreshToken);
      } catch (e: any) {
        Alert.alert('Lỗi', e?.response?.data?.message || 'Xử lý đăng nhập thất bại');
      } finally {
        setLoading(false);
      }
    };

    const sub = Linking.addEventListener('url', handleDeepLink);
    Linking.getInitialURL().then(url => { if (url) handleDeepLink({ url }); });
    return () => sub.remove();
  }, [loginDirect]);

  const doEmailLogin = async () => {
    try {
      setLoading(true);
      await login(email.trim(), password);
    } catch (e: any) {
      Alert.alert('Đăng nhập thất bại', e?.response?.data?.message || 'Kiểm tra lại email/mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  const doSocialLogin = async (provider: 'GOOGLE' | 'FACEBOOK') => {
    setLoading(true);
    try {
      // ✅ openAuthSessionAsync thay vì openBrowserAsync
      // iOS: dùng ASWebAuthenticationSession → cho phép redirect monumobile://
      // Android: dùng Chrome Custom Tab → cũng hoạt động tốt
      const result = await WebBrowser.openAuthSessionAsync(
          `${GATEWAY_URL}/auth/oauth/${provider.toLowerCase()}`,
          'monumobile://oauth'  // ← iOS cần biết scheme để đóng browser và trả về app
      );

      if (result.type === 'success') {
        // iOS: openAuthSessionAsync trả URL trực tiếp qua result.url
        // Android: deep link listener ở useEffect cũng bắt được
        const url = (result as any).url as string;
        if (!url) return;

        const parsed = Linking.parse(url);
        const params = parsed.queryParams;

        if (params?.error) {
          Alert.alert('Đăng nhập thất bại', 'Xác thực OAuth không thành công');
          return;
        }

        const accessToken  = params?.accessToken as string;
        const refreshToken = params?.refreshToken as string;

        if (accessToken && refreshToken) {
          await loginDirect(accessToken, refreshToken);
        }
      }
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
      <View style={styles.container}>
        <Text style={styles.title}>Monu Mobile</Text>
        <Text style={styles.subtitle}>Đăng nhập để tiếp tục</Text>

        <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Email"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
        />
        <TextInput
            secureTextEntry
            placeholder="Mật khẩu"
            style={styles.input}
            value={password}
            onChangeText={setPassword}
        />

        <Pressable style={styles.loginButton} onPress={doEmailLogin} disabled={loading}>
          <Text style={styles.loginText}>{loading ? 'Đang xử lý...' : 'Đăng nhập'}</Text>
        </Pressable>

        <SocialButton label="Đăng nhập với Google"   variant="google"   onPress={() => doSocialLogin('GOOGLE')}   />
        <SocialButton label="Đăng nhập với Facebook" variant="facebook" onPress={() => doSocialLogin('FACEBOOK')} />
      </View>
  );
};

const styles = StyleSheet.create({
  container:   { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f9fafb' },
  title:       { fontSize: 28, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  subtitle:    { fontSize: 16, color: '#6b7280', marginBottom: 24, textAlign: 'center' },
  input:       { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12 },
  loginButton: { borderRadius: 10, paddingVertical: 12, backgroundColor: '#111827', alignItems: 'center', marginBottom: 8 },
  loginText:   { color: '#fff', fontWeight: '700' },
});