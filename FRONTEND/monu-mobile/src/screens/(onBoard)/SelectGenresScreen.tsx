import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable,
  ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '../../components/BackButton';
import { GenreChip } from '../../components/GenreChip';
import { ColorScheme, useThemeColors } from '../../config/colors';
import { ONBOARDING_EMOJIS } from '../../config/emojis';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LocalizationContext';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { getPopularGenres } from '../../services/favorites';
import { Genre } from '../../types/favorites';

type Nav = NativeStackNavigationProp<RootStackParamList, 'SelectGenres'>;

const MIN_GENRES = 1;
const MAX_GENRES = 5;

export const SelectGenresScreen = () => {
  const navigation = useNavigation<Nav>();
  const { refreshProfile, logout } = useAuth();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const themeColors = useThemeColors();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  const [loading, setLoading] = useState(true);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  useEffect(() => { void loadGenres(); }, []);

  const loadGenres = async () => {
    try {
      setLoading(true);
      setGenres(await getPopularGenres(20));
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.message || t('errors.loadingFailed'));
    } finally { setLoading(false); }
  };

  const handleBack = () => {
    Alert.alert(t('screens.onboarding.cancelSetupTitle'), t('screens.onboarding.cancelSetupMessage'), [
      { text: t('controls.no'), style: 'cancel' },
      {
        text: t('screens.profile.logout'),
        style: 'destructive',
        onPress: async () => {
          await logout();
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);
  };

  const toggleGenre = (id: string) => {
    if (selectedGenres.includes(id)) { setSelectedGenres(selectedGenres.filter(g => g !== id)); return; }
    if (selectedGenres.length >= MAX_GENRES) {
      Alert.alert(t('screens.onboarding.limitTitle'), t('screens.onboarding.maxGenres').replace('{max}', String(MAX_GENRES)));
      return;
    }
    setSelectedGenres([...selectedGenres, id]);
  };

  const handleContinue = () => {
    if (selectedGenres.length < MIN_GENRES) {
      Alert.alert(t('common.error'), t('screens.onboarding.minGenres').replace('{min}', String(MIN_GENRES)));
      return;
    }
    navigation.navigate('SelectArtists', { selectedGenreIds: selectedGenres });
  };

  const handleSkip = () => {
    Alert.alert(t('controls.skip'), t('screens.onboarding.skipGenresMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('controls.skip'), style: 'destructive', onPress: async () => { await refreshProfile(); } },
    ]);
  };

  const canContinue = selectedGenres.length >= MIN_GENRES;

  if (loading) {
    return (
        <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
          <ActivityIndicator size="large" color={themeColors.accent} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
    );
  }

  return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <ScrollView showsVerticalScrollIndicator={false}>
          <LinearGradient
              colors={[themeColors.gradNavy, themeColors.bg]}
              style={[styles.gradientTop, { paddingTop: insets.top + 12 }]}
          >
            <BackButton onPress={handleBack} />

            <View style={styles.stepRow}>
              <View style={[styles.stepDotActive]} />
              <View style={styles.stepDot} />
            </View>

            <Text style={styles.emoji}>{ONBOARDING_EMOJIS.welcome}</Text>
            <Text style={styles.title}>{t('onboarding.selectGenresTitle')}</Text>
            <Text style={styles.subtitle}>{t('onboarding.selectGenresSubtitle')}</Text>
          </LinearGradient>

          <View style={[styles.body, { paddingBottom: insets.bottom + 32 }]}>
            <View style={styles.countRow}>
              <Text style={styles.countLabel}>{t('onboarding.selectCount').replace('{min}', String(MIN_GENRES)).replace('{max}', String(MAX_GENRES))}</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{t('onboarding.selected').replace('{count}', String(selectedGenres.length)).replace('{max}', String(MAX_GENRES))}</Text>
              </View>
            </View>

            <View style={styles.genresWrap}>
              {genres.map(genre => (
                  <GenreChip
                      key={genre.id}
                      name={genre.name}
                      selected={selectedGenres.includes(genre.id)}
                      onPress={() => toggleGenre(genre.id)}
                      disabled={!selectedGenres.includes(genre.id) && selectedGenres.length >= MAX_GENRES}
                  />
              ))}
            </View>

            <Pressable
                style={({ pressed }) => [styles.primaryBtn, !canContinue && styles.btnDisabled, pressed && { opacity: 0.85 }]}
                onPress={handleContinue}
                disabled={!canContinue}
            >
              <LinearGradient
                  colors={canContinue ? [themeColors.accent, themeColors.accentAlt] : [themeColors.surfaceMid, themeColors.surfaceMid]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.btnGradient}
              >
                <Text style={styles.primaryBtnText}>{t('controls.next')} →</Text>
              </LinearGradient>
            </Pressable>

            <Pressable style={styles.skipBtn} onPress={handleSkip}>
              <Text style={styles.skipText}>{t('screens.onboarding.skipStep')}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
  );
};

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  loadingText: { color: colors.glass40, marginTop: 12 },

  gradientTop: { paddingHorizontal: 24, paddingBottom: 32 },

  stepRow: { flexDirection: 'row', gap: 8, marginTop: 20, marginBottom: 24 },
  stepDotActive: { width: 24, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.glass20 },

  emoji: { fontSize: 44, marginBottom: 14 },
  title: { color: colors.white, fontSize: 30, fontWeight: '800', lineHeight: 38, marginBottom: 10 },
  subtitle: { color: colors.glass50, fontSize: 15, lineHeight: 22 },

  body: { paddingHorizontal: 20, paddingTop: 24 },

  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  countLabel: { color: colors.white, fontSize: 16, fontWeight: '700' },
  countBadge: {
    backgroundColor: colors.accentFill25,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.accentBorder30,
  },
  countBadgeText: { color: colors.accent, fontWeight: '700', fontSize: 13 },

  genresWrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 28 },

  primaryBtn: { borderRadius: 999, overflow: 'hidden', marginBottom: 12 },
  btnDisabled: { opacity: 0.5 },
  btnGradient: { minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  primaryBtnText: { color: colors.white, fontWeight: '800', fontSize: 16 },

  skipBtn: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.glass10,
  },
  skipText: { color: colors.glass45, fontWeight: '600', fontSize: 15 },
});
