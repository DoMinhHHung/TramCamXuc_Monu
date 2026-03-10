import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ArtistCard } from '../components/ArtistCard';
import { GenreChip } from '../components/GenreChip';
import {
  getMyFavorites,
  getPopularArtists,
  getPopularGenres,
  updateMyFavorites
} from '../services/favorites';
import { Artist, Genre } from '../types/favorites';
import { RootStackParamList } from '../navigation/AppNavigator';
import { COLORS } from '../config/colors';

type Nav = NativeStackNavigationProp<RootStackParamList, 'EditFavorites'>;

const MIN_GENRES = 1;
const MAX_GENRES = 5;
const MIN_ARTISTS = 1;
const MAX_ARTISTS = 3;

export const EditFavoritesScreen = () => {
  const navigation = useNavigation<Nav>();

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

      // Pre-fill với favorites hiện tại
      if (favoritesData.favoriteGenreIds) {
        setSelectedGenres(favoritesData.favoriteGenreIds);
      }
      if (favoritesData.favoriteArtistIds) {
        setSelectedArtists(favoritesData.favoriteArtistIds);
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error?.message || 'Không thể tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const toggleGenre = (id: string) => {
    if (selectedGenres.includes(id)) {
      setSelectedGenres(selectedGenres.filter(g => g !== id));
    } else {
      if (selectedGenres.length >= MAX_GENRES) {
        Alert.alert('Giới hạn', `Bạn chỉ có thể chọn tối đa ${MAX_GENRES} thể loại.`);
        return;
      }
      setSelectedGenres([...selectedGenres, id]);
    }
  };

  const toggleArtist = (id: string) => {
    if (selectedArtists.includes(id)) {
      setSelectedArtists(selectedArtists.filter(a => a !== id));
    } else {
      if (selectedArtists.length >= MAX_ARTISTS) {
        Alert.alert('Giới hạn', `Bạn chỉ có thể chọn tối đa ${MAX_ARTISTS} nghệ sĩ.`);
        return;
      }
      setSelectedArtists([...selectedArtists, id]);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (selectedGenres.length < MIN_GENRES || selectedGenres.length > MAX_GENRES) {
      Alert.alert('Lỗi', `Vui lòng chọn từ ${MIN_GENRES} đến ${MAX_GENRES} thể loại.`);
      return;
    }

    if (selectedArtists.length < MIN_ARTISTS || selectedArtists.length > MAX_ARTISTS) {
      Alert.alert('Lỗi', `Vui lòng chọn từ ${MIN_ARTISTS} đến ${MAX_ARTISTS} nghệ sĩ.`);
      return;
    }

    try {
      setSubmitting(true);
      await updateMyFavorites({
        favoriteGenreIds: selectedGenres,
        favoriteArtistIds: selectedArtists,
      });

      Alert.alert('Thành công', 'Sở thích của bạn đã được cập nhật!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Lỗi', error?.message || 'Không thể lưu sở thích. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const canSubmit = selectedGenres.length >= MIN_GENRES && 
                    selectedGenres.length <= MAX_GENRES &&
                    selectedArtists.length >= MIN_ARTISTS && 
                    selectedArtists.length <= MAX_ARTISTS;

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header với nút Back */}
      <View style={styles.topBar}>
        <Pressable onPress={handleCancel} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Quay lại</Text>
        </Pressable>
        <Text style={styles.topBarTitle}>Chỉnh sửa sở thích</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Genres Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Chọn {MIN_GENRES}-{MAX_GENRES} thể loại yêu thích 
            <Text style={styles.sectionCount}> ({selectedGenres.length}/{MAX_GENRES})</Text>
          </Text>
          <View style={styles.genresContainer}>
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
        </View>

        {/* Artists Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Chọn {MIN_ARTISTS}-{MAX_ARTISTS} nghệ sĩ yêu thích 
            <Text style={styles.sectionCount}> ({selectedArtists.length}/{MAX_ARTISTS})</Text>
          </Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.artistsContainer}
          >
            {artists.map(artist => (
              <ArtistCard
                key={artist.id}
                id={artist.id}
                stageName={artist.stageName}
                avatarUrl={artist.avatarUrl}
                selected={selectedArtists.includes(artist.id)}
                onPress={() => toggleArtist(artist.id)}
                disabled={!selectedArtists.includes(artist.id) && selectedArtists.length >= MAX_ARTISTS}
              />
            ))}
          </ScrollView>
        </View>

        {/* Buttons */}
        <View style={styles.buttonsContainer}>
          <Pressable
            style={[styles.button, styles.buttonPrimary, !canSubmit && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={COLORS.bg} />
            ) : (
              <Text style={styles.buttonPrimaryText}>Lưu thay đổi</Text>
            )}
          </Pressable>

          <Pressable
            style={[styles.button, styles.buttonSecondary]}
            onPress={handleCancel}
            disabled={submitting}
          >
            <Text style={styles.buttonSecondaryText}>Hủy</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: '500',
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingText: {
    color: COLORS.muted,
    marginTop: 12,
    fontSize: 14,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  sectionCount: {
    color: COLORS.accent,
    fontWeight: 'bold',
  },
  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  artistsContainer: {
    paddingRight: 20,
  },
  buttonsContainer: {
    marginTop: 20,
    gap: 12,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: COLORS.accent,
  },
  buttonPrimaryText: {
    color: COLORS.bg,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  buttonSecondaryText: {
    color: COLORS.muted,
    fontSize: 16,
    fontWeight: '500',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
