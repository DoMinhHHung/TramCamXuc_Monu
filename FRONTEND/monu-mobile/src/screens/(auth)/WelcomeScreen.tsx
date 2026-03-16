import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

import { COLORS } from '../../config/colors';
import { RootStackParamList } from '../../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Welcome'>;

export const WelcomeScreen = () => {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  return (
      <View style={styles.root}>
        <StatusBar style="light" />

        <LinearGradient
            colors={[COLORS.gradViolet, COLORS.gradPurple, COLORS.bg]}
            locations={[0, 0.45, 1]}
            style={[styles.heroGradient, { paddingTop: insets.top + 20 }]}
        >
          {/* Decorative rings - giữ nguyên nếu bạn có */}
          <View style={styles.ringOuter} />
          <View style={styles.ringInner} />

          <View style={styles.centerContent}>
            <View style={styles.logoWrap}>
              <Text style={styles.logoIcon}>🎧</Text>
            </View>
            <Text style={styles.brand}>Monu</Text>
            <Text style={styles.tagline}>
              Tận hưởng không gian riêng của bạn.{'\n'}Âm nhạc chữa lành cảm xúc.
            </Text>
          </View>

          <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.pillRow}>
              {['🎵', '🎸', '🎹', '🎤'].map((e, i) => (
                  <View key={i} style={styles.pill}>
                    <Text style={styles.pillEmoji}>{e}</Text>
                  </View>
              ))}
            </View>

            <Text style={styles.ctaLabel}>Bắt đầu ngay hôm nay</Text>

            <Pressable
                style={styles.primaryBtn}
                onPress={() => navigation.navigate('RegisterOptions')}
            >
              <LinearGradient
                  colors={[COLORS.accent, COLORS.accentAlt]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.btnGradient}
              >
                <Text style={styles.primaryText}>Đăng ký miễn phí</Text>
              </LinearGradient>
            </Pressable>

            <Pressable
                style={styles.secondaryBtn}
                onPress={() => navigation.navigate('LoginOptions')}
            >
              <Text style={styles.secondaryText}>Tôi đã có tài khoản</Text>
            </Pressable>

            <Text style={styles.legalNote}>
              Bằng cách tiếp tục, bạn đồng ý với Điều khoản sử dụng và Chính sách quyền riêng tư.
            </Text>
          </View>
        </LinearGradient>
      </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  heroGradient: { flex: 1, paddingHorizontal: 24 },
  ringOuter: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 1,
    borderColor: COLORS.accentBorder12,
    top: -100,
    right: -100,
  },
  ringInner: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: COLORS.accentBorder25,
    top: -50,
    right: -50,
  },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logoWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: COLORS.accentDeep,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
  logoIcon: { fontSize: 60 },
  brand: {
    fontSize: 48,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 2,
    marginBottom: 16,
  },
  tagline: {
    fontSize: 18,
    color: COLORS.glass65,
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 40,
  },
  bottomSheet: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  pillRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  pill: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.glass06,
    borderWidth: 1,
    borderColor: COLORS.glass10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillEmoji: { fontSize: 24 },
  ctaLabel: {
    color: COLORS.glass40,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  primaryBtn: { borderRadius: 999, overflow: 'hidden', marginBottom: 16 },
  btnGradient: { minHeight: 60, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: COLORS.white, fontSize: 18, fontWeight: '800' },
  secondaryBtn: {
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: COLORS.glass20,
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  legalNote: {
    color: COLORS.glass30,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 18,
  },
});