import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { SocialButton } from '../components/SocialButton';
import { env } from '../config/env';
import { useAuth } from '../context/AuthContext';
import { SocialProvider } from '../types/auth';

WebBrowser.maybeCompleteAuthSession();

const parseAccessToken = (url: string): string | null => {
  try {
    const [cleanUrl, hash] = url.split('#');

    if (hash) {
      const hashParams = new URLSearchParams(hash);
      const tokenFromHash = hashParams.get('access_token');
      if (tokenFromHash) {
        return tokenFromHash;
      }
    }

    const parsed = Linking.parse(cleanUrl);
    const queryToken = parsed.queryParams?.access_token;
    return typeof queryToken === 'string' ? queryToken : null;
  } catch {
    return null;
  }
};

const buildAuthUrl = (provider: SocialProvider, redirectUri: string) => {
  if (provider === 'GOOGLE') {
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${env.googleClientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=token&scope=${encodeURIComponent('openid email profile')}&include_granted_scopes=true&prompt=consent`;
  }

  return `https://www.facebook.com/v20.0/dialog/oauth?client_id=${env.facebookClientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=token&scope=${encodeURIComponent('email public_profile')}`;
};

export const LoginScreen = () => {
  const { login, loginWithSocialToken } = useAuth();
  const redirectUri = useMemo(() => Linking.createURL('oauth'), []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const doEmailLogin = async () => {
    try {
      setLoading(true);
      await login(email.trim(), password);
    } catch {
      Alert.alert('Đăng nhập thất bại', 'Vui lòng kiểm tra lại tài khoản hoặc backend.');
    } finally {
      setLoading(false);
    }
  };

  const doSocialLogin = async (provider: SocialProvider) => {
    try {
      setLoading(true);
      const authUrl = buildAuthUrl(provider, redirectUri);
      const response = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

      if (response.type !== 'success') {
        return;
      }

      const accessToken = parseAccessToken(response.url);
      if (!accessToken) {
        Alert.alert(`${provider} Login`, 'Không lấy được access token từ OAuth provider.');
        return;
      }

      await loginWithSocialToken(provider, accessToken);
    } catch {
      Alert.alert(`${provider} Login thất bại`, 'Vui lòng kiểm tra cấu hình OAuth và backend /auth/social.');
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

      <SocialButton label="Đăng nhập với Google" variant="google" onPress={() => doSocialLogin('GOOGLE')} />
      <SocialButton label="Đăng nhập với Facebook" variant="facebook" onPress={() => doSocialLogin('FACEBOOK')} />
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
