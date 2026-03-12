import React, { useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import { BackButton } from '../../components/BackButton';
import { COLORS } from '../../config/colors';
import { useAuth } from '../../context/AuthContext';
import { RootStackParamList } from '../../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export const LoginScreen = () => {
  const navigation = useNavigation<Nav>();
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
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
      <KeyboardAvoidingView
          style={styles.root}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <StatusBar style="light" />
        <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
        >
          <LinearGradient
              colors={[COLORS.gradIndigo, COLORS.bg]}
              style={[styles.gradientTop, { paddingTop: insets.top + 12 }]}
          >
            <BackButton onPress={() => navigation.goBack()} />
            <View style={styles.logoRow}>
              <View style={styles.logoRing}>
                <Text style={{ fontSize: 32 }}>🎵</Text>
              </View>
            </View>
            <Text style={styles.title}>Đăng nhập</Text>
            <Text style={styles.subtitle}>Chào mừng trở lại với Monu</Text>
          </LinearGradient>

          <View style={[styles.form, { paddingBottom: insets.bottom + 32 }]}>
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="you@example.com"
                placeholderTextColor={COLORS.glass25}
                style={styles.input}
                value={email}
                onChangeText={setEmail}
            />

            <Text style={styles.fieldLabel}>Mật khẩu</Text>
            <View style={styles.pwWrap}>
              <TextInput
                  secureTextEntry={!showPw}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.glass25}
                  style={styles.pwInput}
                  value={password}
                  onChangeText={setPassword}
              />
              <Pressable onPress={() => setShowPw(!showPw)}>
                <MaterialIcons
                    name={showPw ? 'visibility-off' : 'visibility'}
                    size={20}
                    color="#999"
                    style={{ transform: [{ translateX: -5 }] }}
                />
              </Pressable>
            </View>

            <Pressable onPress={() => navigation.navigate('ForgotPassword')} style={styles.forgotRow}>
              <Text style={styles.forgotText}>Quên mật khẩu?</Text>
            </Pressable>

            <Pressable
                style={({ pressed }) => [styles.loginBtn, (loading || pressed) && { opacity: 0.8 }]}
                onPress={doEmailLogin}
                disabled={loading}
            >
              <LinearGradient
                  colors={[COLORS.accent, COLORS.accentAlt]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.loginBtnGradient}
              >
                <Text style={styles.loginText}>{loading ? 'Đang đăng nhập...' : 'Đăng nhập'}</Text>
              </LinearGradient>
            </Pressable>

            <Pressable
                style={styles.registerRow}
                onPress={() => navigation.navigate('RegisterOptions')}
            >
              <Text style={styles.registerText}>
                Chưa có tài khoản?{'  '}
                <Text style={styles.registerLink}>Đăng ký ngay</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  gradientTop: { paddingHorizontal: 24, paddingBottom: 36 },
  logoRow: { alignItems: 'center', marginTop: 20, marginBottom: 20 },
  logoRing: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.glass06,
    borderWidth: 1.5,
    borderColor: COLORS.accentBorder40,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { color: COLORS.white, fontSize: 30, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  subtitle: { color: COLORS.glass45, fontSize: 15, textAlign: 'center' },
  form: { paddingHorizontal: 24, paddingTop: 8 },
  fieldLabel: {
    color: COLORS.glass40,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: COLORS.glass06,
    borderWidth: 1,
    borderColor: COLORS.glass10,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    color: COLORS.white,
    fontSize: 15,
  },
  pwWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.glass06,
    borderWidth: 1,
    borderColor: COLORS.glass10,
    borderRadius: 14,
  },
  pwInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 15, color: COLORS.white, fontSize: 15 },
  eyeBtn: { paddingHorizontal: 14 },
  forgotRow: { alignSelf: 'flex-end', marginTop: 10, marginBottom: 6 },
  forgotText: { color: COLORS.accent, fontSize: 13, fontWeight: '600' },
  loginBtn: { borderRadius: 999, overflow: 'hidden', marginTop: 20 },
  loginBtnGradient: { minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  loginText: { color: COLORS.white, fontWeight: '800', fontSize: 16 },
  registerRow: { alignItems: 'center', paddingTop: 22 },
  registerText: { color: COLORS.glass40, fontSize: 14 },
  registerLink: { color: COLORS.accent, fontWeight: '700' },
});