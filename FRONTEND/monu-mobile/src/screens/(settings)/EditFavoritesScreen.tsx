import React, { useEffect, useState } from 'react';
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

import {
  getMyFavorites,
  getPopularArtists,
  getPopularGenres,
  updateMyFavorites,
} from '../../services/favorites';

import { Artist, Genre } from '../../types/favorites';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { COLORS } from '../../config/colors';

type Nav = NativeStackNavigationProp<RootStackParamList, 'EditFavorites'>;

const MIN_GENRES = 1;
const MAX_GENRES = 5;

const MIN_ARTISTS = 1;
const MAX_ARTISTS = 3;

export const EditFavoritesScreen = () => {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
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
      Alert.alert('Lỗi', error?.message || 'Không thể tải dữ liệu.');
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
      Alert.alert('Giới hạn', `Tối đa ${MAX_GENRES} thể loại.`);
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
      Alert.alert('Giới hạn', `Tối đa ${MAX_ARTISTS} nghệ sĩ.`);
      return;
    }

    setSelectedArtists([...selectedArtists, id]);
  };

  const handleSubmit = async () => {
    if (selectedGenres.length < MIN_GENRES) {
      Alert.alert('Lỗi', `Chọn ít nhất ${MIN_GENRES} thể loại.`);
      return;
    }

    if (selectedArtists.length < MIN_ARTISTS) {
      Alert.alert('Lỗi', `Chọn ít nhất ${MIN_ARTISTS} nghệ sĩ.`);
      return;
    }

    try {
      setSubmitting(true);

      await updateMyFavorites({
        favoriteGenreIds: selectedGenres,
        favoriteArtistIds: selectedArtists,
      });

      Alert.alert('Thành công', 'Sở thích đã được cập nhật!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Lỗi', error?.message || 'Không thể lưu sở thích.');
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
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
    );
  }

  return (
      <View style={styles.root}>
        <StatusBar style="light" />

        <LinearGradient
            colors={[COLORS.gradSlate, COLORS.bg]}
            style={[styles.topBar, { paddingTop: insets.top + 12 }]}
        >
          <Pressable onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>← Quay lại</Text>
          </Pressable>

          <Text style={styles.title}>Chỉnh sửa sở thích</Text>

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
              <Text style={styles.sectionTitle}>Thể loại yêu thích</Text>

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
              <Text style={styles.sectionTitle}>Nghệ sĩ yêu thích</Text>

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
                colors={[COLORS.accent, COLORS.accentAlt]}
                style={styles.saveBtnGradient}
            >
              {submitting ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                  <Text style={styles.saveText}>Lưu thay đổi</Text>
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
            <Text style={styles.cancelText}>Hủy</Text>
          </Pressable>
        </ScrollView>
      </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
  },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },

  backBtn: {
    color: COLORS.accent,
    fontWeight: '600',
  },

  title: {
    color: COLORS.white,
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
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 16,
  },

  counter: {
    color: COLORS.accent,
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
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 16,
  },

  cancelBtn: {
    marginTop: 12,
    alignItems: 'center',
  },

  cancelText: {
    color: COLORS.glass45,
  },
});