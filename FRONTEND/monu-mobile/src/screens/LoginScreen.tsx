import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import React, { useState, useEffect } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { SocialButton } from '../components/SocialButton';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../navigation/AppNavigator';

WebBrowser.maybeCompleteAuthSession();

const GATEWAY_URL = 'https://phazelsound.oopsgolden.id.vn';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export const LoginScreen = () => {
  const navigation = useNavigation<Nav>();
  const { login, loginDirect } = useAuth();
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleDeepLink = async ({ url }: { url: string }) => {
      if (!url.startsWith('monumobile://oauth')) return;
      const parsed = Linking.parse(url);
      const params = parsed.queryParams;
      if (params?.error) { Alert.alert('Đăng nhập thất bại', 'Xác thực OAuth không thành công'); setLoading(false); return; }
      const accessToken  = params?.accessToken as string;
      const refreshToken = params?.refreshToken as string;
      if (!accessToken || !refreshToken) { Alert.alert('Lỗi', 'Không nhận được token từ server'); setLoading(false); return; }
      try { await loginDirect(accessToken, refreshToken); }
      catch (e: any) { Alert.alert('Lỗi', e?.message || 'Xử lý đăng nhập thất bại'); }
      finally { setLoading(false); }
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
      Alert.alert('Đăng nhập thất bại', e?.message || 'Kiểm tra lại email/mật khẩu.');
    } finally { setLoading(false); }
  };

  const doSocialLogin = async (provider: 'GOOGLE' | 'FACEBOOK') => {
    setLoading(true);
    try {
      const result = await WebBrowser.openAuthSessionAsync(
          `${GATEWAY_URL}/auth/oauth/${provider.toLowerCase()}`,
          'monumobile://oauth'
      );
      if (result.type === 'success') {
        const url = (result as any).url as string;
        if (!url) return;
        const parsed = Linking.parse(url);
        const params = parsed.queryParams;
        if (params?.error) { Alert.alert('Đăng nhập thất bại', 'Xác thực OAuth không thành công'); return; }
        const accessToken  = params?.accessToken as string;
        const refreshToken = params?.refreshToken as string;
        if (accessToken && refreshToken) await loginDirect(accessToken, refreshToken);
      }
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Đăng nhập thất bại');
    } finally { setLoading(false); }
  };

  const C = { bg: '#0A090E', surface: '#13111A', border: '#2A2640', accent: '#C084FC', accentDim: '#7C3AED', text: '#F3F0FF', muted: '#7B7591' };

  return (
      <View style={[styles.container, { backgroundColor: C.bg }]}>
        {/* Logo */}
        <View style={[styles.logoRing, { borderColor: C.accent, backgroundColor: C.surface }]}>
          <Text style={{ fontSize: 36 }}>🎵</Text>
        </View>
        <Text style={[styles.title, { color: C.text }]}>Monu Mobile</Text>
        <Text style={[styles.subtitle, { color: C.muted }]}>Đăng nhập để tiếp tục</Text>

        <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Email"
            placeholderTextColor={C.muted}
            style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text }]}
            value={email}
            onChangeText={setEmail}
        />
        <TextInput
            secureTextEntry
            placeholder="Mật khẩu"
            placeholderTextColor={C.muted}
            style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text }]}
            value={password}
            onChangeText={setPassword}
        />

        {/* Forgot password */}
        <Pressable onPress={() => navigation.navigate('ForgotPassword')} style={styles.forgotRow}>
          <Text style={{ color: C.accent, fontSize: 13, fontWeight: '600' }}>Quên mật khẩu?</Text>
        </Pressable>

        <Pressable style={[styles.loginButton, { backgroundColor: C.accentDim }, loading && styles.disabled]} onPress={doEmailLogin} disabled={loading}>
          <Text style={styles.loginText}>{loading ? 'Đang xử lý...' : 'Đăng nhập'}</Text>
        </Pressable>

        <SocialButton label="Đăng nhập với Google"   variant="google"   onPress={() => doSocialLogin('GOOGLE')}   disabled={loading} />
        <SocialButton label="Đăng nhập với Facebook" variant="facebook" onPress={() => doSocialLogin('FACEBOOK')} disabled={loading} />

        {/* Register link */}
        <Pressable onPress={() => navigation.navigate('Register')} style={styles.registerRow}>
          <Text style={{ color: C.muted, fontSize: 14 }}>
            Chưa có tài khoản? <Text style={{ color: C.accent, fontWeight: '700' }}>Đăng ký</Text>
          </Text>
        </Pressable>
      </View>
  );
};

const styles = StyleSheet.create({
  container:    { flex: 1, justifyContent: 'center', padding: 24 },
  logoRing:     { width: 76, height: 76, borderRadius: 38, borderWidth: 2, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 16 },
  title:        { fontSize: 28, fontWeight: '800', marginBottom: 4, textAlign: 'center', letterSpacing: -0.5 },
  subtitle:     { fontSize: 15, marginBottom: 28, textAlign: 'center' },
  input:        { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 12, fontSize: 15 },
  forgotRow:    { alignSelf: 'flex-end', marginBottom: 16, marginTop: -4 },
  loginButton:  { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 8 },
  loginText:    { color: '#fff', fontWeight: '800', fontSize: 15 },
  disabled:     { opacity: 0.5 },
  registerRow:  { alignItems: 'center', marginTop: 24 },
});