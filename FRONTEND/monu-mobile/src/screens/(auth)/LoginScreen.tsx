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
import { moderateScale, scale, verticalScale } from '../../utils/responsive';

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
              style={[styles.gradientTop, { paddingTop: insets.top + verticalScale(12) }]}
          >
            <BackButton onPress={() => navigation.goBack()} />
            <View style={styles.logoRow}>
              <View style={styles.logoRing}>
                <Text style={{ fontSize: moderateScale(30) }}>🎵</Text>
              </View>
            </View>
            <Text style={styles.title}>{t('auth.login')}</Text>
            <Text style={styles.subtitle}>{t('auth.welcomeBack')}</Text>
          </LinearGradient>

          <View style={[styles.form, { paddingBottom: insets.bottom + verticalScale(28) }]}>
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
                    size={scale(20)}
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
  gradientTop: { paddingHorizontal: scale(24), paddingBottom: verticalScale(32) },
  logoRow: { alignItems: 'center', marginTop: verticalScale(18), marginBottom: verticalScale(18) },
  logoRing: {
    width: scale(74), height: scale(74), borderRadius: scale(37),
    backgroundColor: colors.glass06,
    borderWidth: 1.5,
    borderColor: colors.accentBorder40,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { color: colors.white, fontSize: moderateScale(28), fontWeight: '800', textAlign: 'center', marginBottom: verticalScale(6) },
  subtitle: { color: colors.glass45, fontSize: moderateScale(14), textAlign: 'center' },
  form: { paddingHorizontal: scale(24), paddingTop: verticalScale(8) },
  fieldLabel: {
    color: colors.glass40,
    fontSize: moderateScale(11),
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: verticalScale(8),
    marginTop: verticalScale(14),
  },
  input: {
    backgroundColor: colors.glass06,
    borderWidth: 1,
    borderColor: colors.glass10,
    borderRadius: scale(14),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(14),
    color: colors.white,
    fontSize: moderateScale(14),
  },
  pwWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass06,
    borderWidth: 1,
    borderColor: colors.glass10,
    borderRadius: scale(14),
  },
  pwInput: { flex: 1, paddingHorizontal: scale(16), paddingVertical: verticalScale(14), color: colors.white, fontSize: moderateScale(14) },
  eyeBtn: { paddingHorizontal: 14 },
  forgotRow: { alignSelf: 'flex-end', marginTop: verticalScale(10), marginBottom: verticalScale(6) },
  forgotText: { color: colors.accent, fontSize: moderateScale(12), fontWeight: '600' },
  loginBtn: { borderRadius: 999, overflow: 'hidden', marginTop: verticalScale(18) },
  loginBtnGradient: { minHeight: verticalScale(54), alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  loginText: { color: colors.white, fontWeight: '800', fontSize: moderateScale(15) },
  registerRow: { alignItems: 'center', paddingTop: verticalScale(20) },
  registerText: { color: colors.glass40, fontSize: moderateScale(13) },
  registerLink: { color: colors.accent, fontWeight: '700' },
});
