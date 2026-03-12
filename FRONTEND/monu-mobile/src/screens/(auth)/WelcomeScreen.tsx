import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { COLORS } from '../../config/colors';
import { RootStackParamList } from '../../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Welcome'>;

export const WelcomeScreen = () => {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  return (
      <View style={styles.root}>
        <StatusBar style="light" />

        {/* Full-bleed gradient hero */}
        <LinearGradient
            colors={[COLORS.gradViolet, COLORS.gradPurple, COLORS.bg]}
            locations={[0, 0.45, 1]}
            style={[styles.heroGradient, { paddingTop: insets.top + 20 }]}
        >
          {/* Decorative rings */}
          <View style={styles.ringOuter} />
          <View style={styles.ringInner} />


  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <View style={styles.logoWrap}>
            <Text style={styles.logoIcon}>🎧</Text>
          </View>
          <Text style={styles.brand}>Monu</Text>
          <Text style={styles.tagline}>
            Tận hưởng không gian riêng của bạn.{'\n'}Âm nhạc chữa lành cảm xúc.
          </Text>
        </LinearGradient>

        {/* Bottom actions */}
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
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed]}
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
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.btnPressed]}
              onPress={() => navigation.navigate('LoginOptions')}
          >
            <Text style={styles.secondaryText}>Tôi đã có tài khoản</Text>
          </Pressable>

          <Text style={styles.legalNote}>Bằng cách tiếp tục, bạn đồng ý với Điều khoản sử dụng của chúng tôi</Text>
        </View>
      </View>
          <Text style={styles.tagline}>Tận hưởng không gian riêng của bạn. Âm nhạc chữa lành cảm xúc</Text>
        </View>

        <View style={styles.bottomActions}>
          <Pressable style={styles.primaryBtn} onPress={() => navigation.navigate('RegisterOptions')}>
            <Text style={styles.primaryText}>Đăng ký</Text>
          </Pressable>

          <Pressable style={styles.secondaryBtn} onPress={() => navigation.navigate('LoginOptions')}>
            <Text style={styles.secondaryText}>Đăng nhập</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  heroGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },

  ringOuter: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    borderWidth: 1,
    borderColor: 'COLORS.accentBorder12',
  },
  ringInner: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: 'COLORS.accentBorder25',
  },

  logoWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'COLORS.glass07',
    borderWidth: 1.5,
    borderColor: 'COLORS.accentBorder50',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 20,
  },
  logoIcon: { fontSize: 52 },

  brand: {
    fontSize: 42,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 1.5,
    marginBottom: 14,
  },
  tagline: {
    fontSize: 16,
    color: 'COLORS.glass65',
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 32,
  },

  bottomSheet: {
    backgroundColor: COLORS.bg,
    paddingHorizontal: 24,
    paddingTop: 28,
    borderTopWidth: 1,
    borderTopColor: 'COLORS.glass06',
  },

  pillRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  pill: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'COLORS.glass06',
    borderWidth: 1,
    borderColor: 'COLORS.glass10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillEmoji: { fontSize: 20 },

  ctaLabel: {
    color: 'COLORS.glass40',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 14,
  },

  primaryBtn: { borderRadius: 999, marginBottom: 12, overflow: 'hidden' },
  btnGradient: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  primaryText: { color: COLORS.white, fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },

  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 24, paddingBottom: 28 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logoWrap: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  logoIcon: { fontSize: 46 },
  brand: { fontSize: 32, fontWeight: '800', color: COLORS.text, marginBottom: 14, letterSpacing: 0.5 },
  tagline: {
    fontSize: 17,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 27,
    maxWidth: 330,
    paddingHorizontal: 6,
  },
  bottomActions: { gap: 14 },
  primaryBtn: {
    minHeight: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
  },
  primaryText: { color: COLORS.bg, fontSize: 16, fontWeight: '800' },
  secondaryBtn: {
    minHeight: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'COLORS.glass15',
    backgroundColor: 'COLORS.glass04',
    marginBottom: 16,
  },
  secondaryText: { color: 'COLORS.glass80', fontSize: 16, fontWeight: '600' },

  btnPressed: { opacity: 0.8 },

  legalNote: {
    color: 'COLORS.glass25',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
});
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  secondaryText: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
});
