import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

import { ColorScheme, useThemeColors } from '../../config/colors';
import { useTranslation } from '../../context/LocalizationContext';
import { RootStackParamList } from '../../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Welcome'>;

export const WelcomeScreen = () => {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const themeColors = useThemeColors();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  return (
      <View style={styles.root}>
        <StatusBar style="light" />

        <LinearGradient
            colors={[themeColors.gradViolet, themeColors.gradPurple, themeColors.bg]}
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
              {t('screens.welcome.tagline')}
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

            <Text style={styles.ctaLabel}>{t('screens.welcome.ctaToday')}</Text>

            <Pressable
                style={styles.primaryBtn}
                onPress={() => navigation.navigate('RegisterOptions')}
            >
              <LinearGradient
                  colors={[themeColors.accent, themeColors.accentAlt]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.btnGradient}
              >
                <Text style={styles.primaryText}>{t('screens.welcome.registerFree')}</Text>
              </LinearGradient>
            </Pressable>

            <Pressable
                style={styles.secondaryBtn}
                onPress={() => navigation.navigate('LoginOptions')}
            >
              <Text style={styles.secondaryText}>{t('screens.welcome.haveAccount')}</Text>
            </Pressable>

            <Text style={styles.legalNote}>
              {t('screens.welcome.legalNote')}
            </Text>
          </View>
        </LinearGradient>
      </View>
  );
};

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  heroGradient: { flex: 1, paddingHorizontal: 24 },
  ringOuter: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 1,
    borderColor: colors.accentBorder12,
    top: -100,
    right: -100,
  },
  ringInner: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: colors.accentBorder25,
    top: -50,
    right: -50,
  },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logoWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: colors.accentDeep,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
  logoIcon: { fontSize: 60 },
  brand: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 2,
    marginBottom: 16,
  },
  tagline: {
    fontSize: 18,
    color: colors.glass65,
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 40,
  },
  bottomSheet: {
    backgroundColor: colors.bg,
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
    backgroundColor: colors.glass06,
    borderWidth: 1,
    borderColor: colors.glass10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillEmoji: { fontSize: 24 },
  ctaLabel: {
    color: colors.glass40,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  primaryBtn: { borderRadius: 999, overflow: 'hidden', marginBottom: 16 },
  btnGradient: { minHeight: 60, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: colors.white, fontSize: 18, fontWeight: '800' },
  secondaryBtn: {
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.glass20,
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { color: colors.white, fontSize: 18, fontWeight: '700' },
  legalNote: {
    color: colors.glass30,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 18,
  },
});