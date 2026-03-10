import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { env } from '../config/env';
import { SocialButton } from '../components/SocialButton';
import { useAuth } from '../context/AuthContext';

WebBrowser.maybeCompleteAuthSession();

const extractCode = (url: string) => {
  const parsed = Linking.parse(url);
  const code = parsed.queryParams?.code;
  return typeof code === 'string' ? code : null;
};

export const LoginScreen = () => {
  const { login, loginByGoogleCode, loginByFacebookCode } = useAuth();
  const redirectUri = useMemo(() => Linking.createURL('oauth'), []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const doEmailLogin = async () => {
    try {
      setLoading(true);
      await login(email, password);
    } catch (error) {
      Alert.alert('Đăng nhập thất bại', 'Vui lòng kiểm tra lại tài khoản hoặc backend.');
    } finally {
      setLoading(false);
    }
  };

  const doGoogleLogin = async () => {
    try {
      setLoading(true);
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${env.googleClientId}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&response_type=code&scope=${encodeURIComponent('openid email profile')}&prompt=consent`;

      const response = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
      if (response.type !== 'success') {
        return;
      }

      const code = extractCode(response.url);
      if (!code) {
        Alert.alert('Google Login', 'Không lấy được authorization code từ Google.');
        return;
      }

      await loginByGoogleCode(code, redirectUri);
    } catch (error) {
      Alert.alert('Google Login thất bại', 'Vui lòng kiểm tra cấu hình OAuth ở backend/mobile.');
    } finally {
      setLoading(false);
    }
  };

  const doFacebookLogin = async () => {
    try {
      setLoading(true);
      const authUrl = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${env.facebookClientId}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&response_type=code&scope=${encodeURIComponent('email public_profile')}`;

      const response = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
      if (response.type !== 'success') {
        return;
      }

      const code = extractCode(response.url);
      if (!code) {
        Alert.alert('Facebook Login', 'Không lấy được authorization code từ Facebook.');
        return;
      }

      await loginByFacebookCode(code, redirectUri);
    } catch (error) {
      Alert.alert('Facebook Login thất bại', 'Vui lòng kiểm tra cấu hình OAuth ở backend/mobile.');
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

      <SocialButton label="Đăng nhập với Google" variant="google" onPress={doGoogleLogin} />
      <SocialButton label="Đăng nhập với Facebook" variant="facebook" onPress={doFacebookLogin} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f9fafb'
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 24,
    textAlign: 'center'
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12
  },
  loginButton: {
    borderRadius: 10,
    paddingVertical: 12,
    backgroundColor: '#111827',
    alignItems: 'center',
    marginBottom: 8
  },
  loginText: {
    color: '#fff',
    fontWeight: '700'
  }
});
