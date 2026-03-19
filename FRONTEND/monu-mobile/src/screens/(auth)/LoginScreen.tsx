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
  gradientTop: { paddingHorizontal: 24, paddingBottom: 40 },
  logoRow: { alignItems: 'center', marginTop: 24, marginBottom: 28 },
  logoRing: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: COLORS.accentFill20,
    borderWidth: 2,
    borderColor: COLORS.accentBorder40,
    alignItems: 'center', justifyContent: 'center',
    elevation: 8,
    shadowColor: COLORS.accentDeep,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  title: { color: COLORS.white, fontSize: 34, fontWeight: '800', textAlign: 'center', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { color: COLORS.glass50, fontSize: 16, textAlign: 'center', lineHeight: 22 },
  form: { paddingHorizontal: 24, paddingTop: 12 },
  fieldLabel: {
    color: COLORS.glass50,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 20,
  },
  input: {
    backgroundColor: COLORS.surfaceLow,
    borderWidth: 1,
    borderColor: COLORS.glass15,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '500',
  },
  pwWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLow,
    borderWidth: 1,
    borderColor: COLORS.glass15,
    borderRadius: 14,
    paddingRight: 12,
  },
  pwInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 15, color: COLORS.white, fontSize: 16, fontWeight: '500' },
  eyeBtn: { paddingHorizontal: 12 },
  forgotRow: { alignSelf: 'flex-end', marginTop: 12, marginBottom: 8 },
  forgotText: { color: COLORS.accent, fontSize: 14, fontWeight: '600' },
  loginBtn: { borderRadius: 999, overflow: 'hidden', marginTop: 28, elevation: 6, shadowColor: COLORS.accentDeep, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 },
  loginBtnGradient: { minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  loginText: { color: COLORS.white, fontWeight: '800', fontSize: 17, letterSpacing: -0.3 },
  registerRow: { alignItems: 'center', paddingTop: 28 },
  registerText: { color: COLORS.glass50, fontSize: 15, fontWeight: '500' },
  registerLink: { color: COLORS.accent, fontWeight: '700' },
});
