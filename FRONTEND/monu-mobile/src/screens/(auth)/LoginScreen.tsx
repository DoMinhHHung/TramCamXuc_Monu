import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { BackButton } from '../../components/BackButton';
import { COLORS } from '../../config/colors';
import { useAuth } from '../../context/AuthContext';
import { RootStackParamList } from '../../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export const LoginScreen = () => {
  const navigation = useNavigation<Nav>();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const doEmailLogin = async () => {
    try {
      setLoading(true);
      await login(email.trim(), password);
    } catch (e: any) {
      Alert.alert('Đăng nhập thất bại', e?.message || 'Kiểm tra lại email/mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
      <BackButton onPress={() => navigation.goBack()} />

      <View style={styles.formWrap}>
        <View style={[styles.logoRing, { borderColor: COLORS.accent, backgroundColor: COLORS.surface }]}>
          <Text style={{ fontSize: 36 }}>🎵</Text>
        </View>
        <Text style={[styles.title, { color: COLORS.text }]}>Monu Mobile</Text>
        <Text style={[styles.subtitle, { color: COLORS.muted }]}>Đăng nhập để tiếp tục</Text>

        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Email"
          placeholderTextColor={COLORS.muted}
          style={[styles.input, { backgroundColor: COLORS.surface, borderColor: COLORS.border, color: COLORS.text }]}
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          secureTextEntry
          placeholder="Mật khẩu"
          placeholderTextColor={COLORS.muted}
          style={[styles.input, { backgroundColor: COLORS.surface, borderColor: COLORS.border, color: COLORS.text }]}
          value={password}
          onChangeText={setPassword}
        />

        <Pressable onPress={() => navigation.navigate('ForgotPassword')} style={styles.forgotRow}>
          <Text style={{ color: COLORS.accent, fontSize: 13, fontWeight: '600' }}>Quên mật khẩu?</Text>
        </Pressable>

        <Pressable
          style={[styles.loginButton, { backgroundColor: COLORS.accentDim }, loading && styles.disabled]}
          onPress={doEmailLogin}
          disabled={loading}
        >
          <Text style={styles.loginText}>{loading ? 'Đang xử lý...' : 'Đăng nhập'}</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 56 },
  formWrap: { flex: 1, justifyContent: 'center' },
  logoRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 4, textAlign: 'center', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, marginBottom: 28, textAlign: 'center' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 12, fontSize: 15 },
  forgotRow: { alignSelf: 'flex-end', marginBottom: 16, marginTop: -4 },
  loginButton: { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  loginText: { color: COLORS.white, fontWeight: '800', fontSize: 15 },
  disabled: { opacity: 0.5 },
});
