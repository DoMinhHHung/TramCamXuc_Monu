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
import { AnimatedDecorIcon } from '../../components/AnimatedDecorIcon';
import { moderateScale, scale, SCREEN, verticalScale } from '../../utils/responsive';

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
            style={[styles.heroGradient, { paddingTop: insets.top + verticalScale(20) }]}
        >
          <View style={styles.ringOuter} />
          <View style={styles.ringInner} />

          <View style={styles.centerContent}>
            <View style={styles.logoWrap}>
              <AnimatedDecorIcon intensity="medium">
                <Text style={styles.logoIcon}>🎧</Text>
              </AnimatedDecorIcon>
            </View>
            <Text style={styles.brand}>Monu</Text>
            <Text style={styles.tagline}>
              {t('screens.welcome.tagline')}
            </Text>
          </View>

          <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + verticalScale(20) }]}>
            <View style={styles.pillRow}>
              {['🎵', '🎸', '🎹', '🎤'].map((e, i) => (
                  <View key={i} style={styles.pill}>
                    <AnimatedDecorIcon intensity="soft">
                      <Text style={styles.pillEmoji}>{e}</Text>
                    </AnimatedDecorIcon>
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
  heroGradient: { flex: 1, paddingHorizontal: scale(24) },
  ringOuter: {
    position: 'absolute',
    width: scale(260),
    height: scale(260),
    borderRadius: scale(130),
    borderWidth: 1,
    borderColor: colors.accentBorder12,
    top: -scale(90),
    right: -scale(90),
  },
  ringInner: {
    position: 'absolute',
    width: scale(180),
    height: scale(180),
    borderRadius: scale(90),
    borderWidth: 1,
    borderColor: colors.accentBorder25,
    top: -scale(45),
    right: -scale(45),
  },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logoWrap: {
    width: scale(108),
    height: scale(108),
    borderRadius: scale(54),
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(24),
    shadowColor: colors.accentDeep,
    shadowOffset: { width: 0, height: verticalScale(8) },
    shadowOpacity: 0.4,
    shadowRadius: scale(20),
  },
  logoIcon: { fontSize: moderateScale(52) },
  brand: {
    fontSize: moderateScale(SCREEN.isSmallDevice ? 40 : 48),
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 1.5,
    marginBottom: verticalScale(16),
  },
  tagline: {
    fontSize: moderateScale(16),
    color: colors.glass65,
    textAlign: 'center',
    lineHeight: verticalScale(24),
    marginBottom: verticalScale(32),
  },
  bottomSheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: scale(28),
    borderTopRightRadius: scale(28),
    paddingHorizontal: scale(24),
    paddingTop: verticalScale(28),
  },
  pillRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: scale(10),
    marginBottom: verticalScale(20),
  },
  pill: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: colors.glass06,
    borderWidth: 1,
    borderColor: colors.glass10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillEmoji: { fontSize: moderateScale(22) },
  ctaLabel: {
    color: colors.glass40,
    fontSize: moderateScale(12),
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: verticalScale(14),
  },
  primaryBtn: { borderRadius: 999, overflow: 'hidden', marginBottom: verticalScale(14) },
  btnGradient: { minHeight: verticalScale(56), alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: colors.white, fontSize: moderateScale(17), fontWeight: '800' },
  secondaryBtn: {
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.glass20,
    minHeight: verticalScale(56),
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { color: colors.white, fontSize: moderateScale(17), fontWeight: '700' },
  legalNote: {
    color: colors.glass30,
    fontSize: moderateScale(11),
    textAlign: 'center',
    marginTop: verticalScale(20),
    lineHeight: verticalScale(16),
  },
});
