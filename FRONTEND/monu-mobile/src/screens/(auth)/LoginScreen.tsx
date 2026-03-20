import React, { useMemo, useState } from 'react';
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
import { ColorScheme, useThemeColors } from '../../config/colors';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LocalizationContext';
import { RootStackParamList } from '../../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export const LoginScreen = () => {
  const navigation = useNavigation<Nav>();
  const { login } = useAuth();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const themeColors = useThemeColors();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const doEmailLogin = async () => {
    try {
      setLoading(true);
      await login(email.trim(), password);
    } catch (e: any) {
      Alert.alert(t('auth.login'), e?.message || t('errors.somethingWentWrong'));
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
              colors={[themeColors.gradIndigo, themeColors.bg]}
              style={[styles.gradientTop, { paddingTop: insets.top + 12 }]}
          >
            <BackButton onPress={() => navigation.goBack()} />
            <View style={styles.logoRow}>
              <View style={styles.logoRing}>
                <Text style={{ fontSize: 32 }}>🎵</Text>
              </View>
            </View>
            <Text style={styles.title}>{t('auth.login')}</Text>
            <Text style={styles.subtitle}>{t('auth.welcomeBack')}</Text>
          </LinearGradient>

          <View style={[styles.form, { paddingBottom: insets.bottom + 32 }]}>
            <Text style={styles.fieldLabel}>{t('auth.email')}</Text>
            <TextInput
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="you@example.com"
                placeholderTextColor={themeColors.glass25}
                style={styles.input}
                value={email}
                onChangeText={setEmail}
            />

            <Text style={styles.fieldLabel}>{t('auth.password')}</Text>
            <View style={styles.pwWrap}>
              <TextInput
                  secureTextEntry={!showPw}
                  placeholder="••••••••"
                  placeholderTextColor={themeColors.glass25}
                  style={styles.pwInput}
                  value={password}
                  onChangeText={setPassword}
              />
              <Pressable onPress={() => setShowPw(!showPw)}>
                <MaterialIcons
                    name={showPw ? 'visibility-off' : 'visibility'}
                    size={20}
                  color={themeColors.glass50}
                    style={{ transform: [{ translateX: -5 }] }}
                />
              </Pressable>
            </View>

            <Pressable onPress={() => navigation.navigate('ForgotPassword')} style={styles.forgotRow}>
              <Text style={styles.forgotText}>{t('auth.forgotPassword')}</Text>
            </Pressable>

            <Pressable
                style={({ pressed }) => [styles.loginBtn, (loading || pressed) && { opacity: 0.8 }]}
                onPress={doEmailLogin}
                disabled={loading}
            >
              <LinearGradient
                  colors={[themeColors.accent, themeColors.accentAlt]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.loginBtnGradient}
              >
                <Text style={styles.loginText}>{loading ? t('screens.login.loading') : t('auth.login')}</Text>
              </LinearGradient>
            </Pressable>

            <Pressable
                style={styles.registerRow}
                onPress={() => navigation.navigate('RegisterOptions')}
            >
              <Text style={styles.registerText}>
                {t('auth.dontHaveAccount')}{'  '}
                <Text style={styles.registerLink}>{t('auth.signup')}</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
  );
};

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  gradientTop: { paddingHorizontal: 24, paddingBottom: 36 },
  logoRow: { alignItems: 'center', marginTop: 20, marginBottom: 20 },
  logoRing: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.glass06,
    borderWidth: 1.5,
    borderColor: colors.accentBorder40,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { color: colors.white, fontSize: 30, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  subtitle: { color: colors.glass45, fontSize: 15, textAlign: 'center' },
  form: { paddingHorizontal: 24, paddingTop: 8 },
  fieldLabel: {
    color: colors.glass40,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: colors.glass06,
    borderWidth: 1,
    borderColor: colors.glass10,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    color: colors.white,
    fontSize: 15,
  },
  pwWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass06,
    borderWidth: 1,
    borderColor: colors.glass10,
    borderRadius: 14,
  },
  pwInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 15, color: colors.white, fontSize: 15 },
  eyeBtn: { paddingHorizontal: 14 },
  forgotRow: { alignSelf: 'flex-end', marginTop: 10, marginBottom: 6 },
  forgotText: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  loginBtn: { borderRadius: 999, overflow: 'hidden', marginTop: 20 },
  loginBtnGradient: { minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  loginText: { color: colors.white, fontWeight: '800', fontSize: 16 },
  registerRow: { alignItems: 'center', paddingTop: 22 },
  registerText: { color: colors.glass40, fontSize: 14 },
  registerLink: { color: colors.accent, fontWeight: '700' },
});