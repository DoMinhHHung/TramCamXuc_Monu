import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArtistCard } from '../../components/ArtistCard';
import { GenreChip } from '../../components/GenreChip';
import { RetryState } from '../../components/RetryState';
import { SectionSkeleton } from '../../components/SkeletonLoader';

import {
  getMyFavorites,
  getPopularArtists,
  getPopularGenres,
  updateMyFavorites,
} from '../../services/favorites';

import { Artist, Genre } from '../../types/favorites';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { ColorScheme, useThemeColors } from '../../config/colors';
import { useTranslation } from '../../context/LocalizationContext';

type Nav = NativeStackNavigationProp<RootStackParamList, 'EditFavorites'>;

const MIN_GENRES = 1;
const MAX_GENRES = 5;

const MIN_ARTISTS = 1;
const MAX_ARTISTS = 3;

export const EditFavoritesScreen = () => {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const themeColors = useThemeColors();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [genres, setGenres] = useState<Genre[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);

  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setLoadError(null);

      const [favoritesData, genresData, artistsData] = await Promise.all([
        getMyFavorites(),
        getPopularGenres(20),
        getPopularArtists(15),
      ]);

      setGenres(genresData);
      setArtists(artistsData);

      if (favoritesData.favoriteGenreIds)
        setSelectedGenres(favoritesData.favoriteGenreIds);

      if (favoritesData.favoriteArtistIds)
        setSelectedArtists(favoritesData.favoriteArtistIds);
    } catch (error: any) {
      setLoadError(error?.message || t('screens.editFavorites.loadError'));
      Alert.alert(t('common.error'), error?.message || t('screens.editFavorites.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const toggleGenre = (id: string) => {
    if (selectedGenres.includes(id)) {
      setSelectedGenres(selectedGenres.filter(g => g !== id));
      return;
    }

    if (selectedGenres.length >= MAX_GENRES) {
      Alert.alert(t('screens.editFavorites.limitTitle'), `${t('screens.editFavorites.maxGenresPrefix')} ${MAX_GENRES} ${t('screens.editFavorites.maxGenresSuffix')}`);
      return;
    }

    setSelectedGenres([...selectedGenres, id]);
  };

  const toggleArtist = (id: string) => {
    if (selectedArtists.includes(id)) {
      setSelectedArtists(selectedArtists.filter(a => a !== id));
      return;
    }

    if (selectedArtists.length >= MAX_ARTISTS) {
      Alert.alert(t('screens.editFavorites.limitTitle'), `${t('screens.editFavorites.maxArtistsPrefix')} ${MAX_ARTISTS} ${t('screens.editFavorites.maxArtistsSuffix')}`);
      return;
    }

    setSelectedArtists([...selectedArtists, id]);
  };

  const handleSubmit = async () => {
    if (selectedGenres.length < MIN_GENRES) {
      Alert.alert(t('common.error'), `${t('screens.editFavorites.minGenresPrefix')} ${MIN_GENRES} ${t('screens.editFavorites.minGenresSuffix')}`);
      return;
    }

    if (selectedArtists.length < MIN_ARTISTS) {
      Alert.alert(t('common.error'), `${t('screens.editFavorites.minArtistsPrefix')} ${MIN_ARTISTS} ${t('screens.editFavorites.minArtistsSuffix')}`);
      return;
    }

    try {
      setSubmitting(true);

      await updateMyFavorites({
        favoriteGenreIds: selectedGenres,
        favoriteArtistIds: selectedArtists,
      });

      Alert.alert(t('common.success'), t('screens.editFavorites.updatedSuccess'), [
        { text: t('common.done'), onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.message || t('screens.editFavorites.saveError'));
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit =
      selectedGenres.length >= MIN_GENRES &&
      selectedArtists.length >= MIN_ARTISTS;

  if (loading) {
    return (
        <View style={styles.loading}>
          <SectionSkeleton rows={2} />
        </View>
    );
  }

  if (loadError && genres.length === 0 && artists.length === 0) {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />

        <LinearGradient
            colors={[themeColors.gradSlate, themeColors.bg]}
            style={[styles.topBar, { paddingTop: insets.top + 12 }]}
        >
          <Pressable onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>← {t('screens.editFavorites.back')}</Text>
          </Pressable>

          <Text style={styles.title}>{t('screens.editFavorites.title')}</Text>

          <View style={{ width: 70 }} />
        </LinearGradient>

        <RetryState
          title="Không tải được mục yêu thích"
          description={loadError}
          onRetry={loadData}
          fallbackLabel="Quay lại"
          onFallback={() => navigation.goBack()}
          icon="🎧"
        />
      </View>
    );
  }

  return (
      <View style={styles.root}>
        <StatusBar style="light" />

        <LinearGradient
            colors={[themeColors.gradSlate, themeColors.bg]}
            style={[styles.topBar, { paddingTop: insets.top + 12 }]}
        >
          <Pressable onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>← {t('screens.editFavorites.back')}</Text>
          </Pressable>

          <Text style={styles.title}>{t('screens.editFavorites.title')}</Text>

          <View style={{ width: 70 }} />
        </LinearGradient>

        <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.body,
              { paddingBottom: insets.bottom + 40 },
            ]}
        >
          {/* GENRES */}

          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>{t('screens.editFavorites.favoriteGenres')}</Text>

              <Text style={styles.counter}>
                {selectedGenres.length}/{MAX_GENRES}
              </Text>
            </View>

            <View style={styles.genresWrap}>
              {genres.map(genre => (
                  <GenreChip
                      key={genre.id}
                      name={genre.name}
                      selected={selectedGenres.includes(genre.id)}
                      onPress={() => toggleGenre(genre.id)}
                  />
              ))}
            </View>
          </View>

          {/* ARTISTS */}

          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>{t('screens.editFavorites.favoriteArtists')}</Text>

              <Text style={styles.counter}>
                {selectedArtists.length}/{MAX_ARTISTS}
              </Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {artists.map(artist => (
                  <ArtistCard
                      key={artist.id}
                      id={artist.id}
                      stageName={artist.stageName}
                      avatarUrl={artist.avatarUrl}
                      selected={selectedArtists.includes(artist.id)}
                      onPress={() => toggleArtist(artist.id)}
                  />
              ))}
            </ScrollView>
          </View>

          {/* SAVE */}

          <Pressable
              style={({ pressed }) => [
                styles.saveBtn,
                pressed && { transform: [{ scale: 0.96 }] },
                !canSubmit && styles.btnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!canSubmit || submitting}
          >
            <LinearGradient
                colors={[themeColors.accent, themeColors.accentAlt]}
                style={styles.saveBtnGradient}
            >
              {submitting ? (
                  <ActivityIndicator size="small" color={themeColors.white} />
              ) : (
                  <Text style={styles.saveText}>{t('screens.editFavorites.saveChanges')}</Text>
              )}
            </LinearGradient>
          </Pressable>

          <Pressable
              style={({ pressed }) => [
                styles.cancelBtn,
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
          </Pressable>
        </ScrollView>
      </View>
  );
};

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },

  backBtn: {
    color: colors.accent,
    fontWeight: '600',
  },

  title: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 17,
  },

  body: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  section: {
    marginBottom: 30,
  },

  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  sectionTitle: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 16,
  },

  counter: {
    color: colors.accent,
    fontWeight: '700',
  },

  genresWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  saveBtn: {
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 10,
  },

  btnDisabled: {
    opacity: 0.4,
  },

  saveBtnGradient: {
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },

  saveText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 16,
  },

  cancelBtn: {
    marginTop: 12,
    alignItems: 'center',
  },

  cancelText: {
    color: colors.glass45,
  },
});