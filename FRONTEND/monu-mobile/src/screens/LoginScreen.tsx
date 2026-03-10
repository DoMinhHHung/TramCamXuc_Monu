import * as Google from 'expo-auth-session/providers/google';
import * as Facebook from 'expo-auth-session/providers/facebook';
import * as WebBrowser from 'expo-web-browser';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { env } from '../config/env';
import { SocialButton } from '../components/SocialButton';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../navigation/types';

WebBrowser.maybeCompleteAuthSession();

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export const LoginScreen = ({ navigation, route }: Props) => {
  const { login, loginByGoogleToken, loginByFacebookToken } = useAuth();

  const [email, setEmail] = useState(route.params?.presetEmail ?? '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Google Auth
  const [googleRequest, googleResponse, googlePromptAsync] = Google.useIdTokenAuthRequest({
    clientId: env.googleClientId
  });

  // Facebook Auth
  const [fbRequest, fbResponse, fbPromptAsync] = Facebook.useAuthRequest({
    clientId: env.facebookClientId
  });

  // Xử lý kết quả Google
  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const { id_token } = googleResponse.params;
      setLoading(true);
      loginByGoogleToken(id_token)
        .catch(() => Alert.alert('Google Login thất bại', 'Vui lòng thử lại.'))
        .finally(() => setLoading(false));
    }
  }, [googleResponse, loginByGoogleToken]);

  // Xử lý kết quả Facebook
  useEffect(() => {
    if (fbResponse?.type === 'success') {
      const { access_token } = fbResponse.params;
      setLoading(true);
      loginByFacebookToken(access_token)
        .catch(() => Alert.alert('Facebook Login thất bại', 'Vui lòng thử lại.'))
        .finally(() => setLoading(false));
    }
  }, [fbResponse, loginByFacebookToken]);

  const doEmailLogin = async () => {
    try {
      setLoading(true);
      await login(email, password);
    } catch (error: any) {
      console.error('[Login Error]', error);
      Alert.alert('Đăng nhập thất bại', error?.message || 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Monu Mobile</Text>
      <Text style={styles.subtitle}>Đăng nhập để tiếp tục</Text>

      <TextInput autoCapitalize="none" placeholder="Email" style={styles.input} value={email} onChangeText={setEmail} />
      <TextInput secureTextEntry placeholder="Mật khẩu" style={styles.input} value={password} onChangeText={setPassword} />

      <Pressable style={styles.loginButton} onPress={doEmailLogin} disabled={loading}>
        <Text style={styles.loginText}>{loading ? 'Đang xử lý...' : 'Đăng nhập'}</Text>
      </Pressable>

      <SocialButton
        label="Đăng nhập với Google"
        variant="google"
        onPress={() => googlePromptAsync()}
        disabled={!googleRequest || loading}
      />
      <SocialButton
        label="Đăng nhập với Facebook"
        variant="facebook"
        onPress={() => fbPromptAsync()}
        disabled={!fbRequest || loading}
      />

      <Pressable onPress={() => navigation.navigate('Register')}>
        <Text style={styles.link}>Tạo tài khoản mới</Text>
      </Pressable>
      <Pressable onPress={() => navigation.navigate('ForgotPassword')}>
        <Text style={styles.link}>Quên mật khẩu?</Text>
      </Pressable>
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
  },
  link: {
    textAlign: 'center',
    color: '#2563eb',
    fontWeight: '600',
    marginTop: 8
  }
});
