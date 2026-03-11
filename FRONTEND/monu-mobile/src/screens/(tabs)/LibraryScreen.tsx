import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { FavoriteArtistRow } from '../../components/FavoriteArtistRow';
import { COLORS } from '../../config/colors';
import { getMyFavorites, getPopularArtists, getPopularGenres } from '../../services/favorites';
import { Artist, Genre } from '../../types/favorites';

export const LibraryScreen = () => {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [favoriteArtistIds, setFavoriteArtistIds] = useState<string[]>([]);
  const [favoriteGenreIds, setFavoriteGenreIds] = useState<string[]>([]);

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [favorites, artistData, genreData] = await Promise.all([
        getMyFavorites(),
        getPopularArtists(50),
        getPopularGenres(50),
      ]);
      setFavoriteArtistIds(favorites.favoriteArtistIds ?? []);
      setFavoriteGenreIds(favorites.favoriteGenreIds ?? []);
      setArtists(artistData);
      setGenres(genreData);
    } finally {
      setLoading(false);
    }
  };

  const favoriteArtists = useMemo(
    () => artists.filter((artist) => favoriteArtistIds.includes(artist.id)),
    [artists, favoriteArtistIds],
  );
  const favoriteGenres = useMemo(
    () => genres.filter((genre) => favoriteGenreIds.includes(genre.id)),
    [genres, favoriteGenreIds],
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={COLORS.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Nghệ sĩ yêu thích</Text>
      {favoriteArtists.length ? (
        favoriteArtists.map((artist) => <FavoriteArtistRow key={artist.id} name={artist.stageName} avatarUrl={artist.avatarUrl} />)
      ) : (
        <Text style={styles.emptyText}>Bạn chưa chọn nghệ sĩ yêu thích.</Text>
      )}

      <Text style={[styles.sectionTitle, styles.marginTop]}>Thể loại yêu thích</Text>
      <View style={styles.genreWrap}>
        {favoriteGenres.length ? (
          favoriteGenres.map((genre) => (
            <View key={genre.id} style={styles.genreChip}>
              <Text style={styles.genreText}>{genre.name}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Bạn chưa chọn thể loại yêu thích.</Text>
        )}
      </View>

      <Pressable style={styles.addButton} onPress={() => navigation.navigate('EditFavorites')}>
        <View style={styles.plusCircle}>
          <Text style={styles.plusText}>+</Text>
        </View>
        <Text style={styles.addText}>Thêm nghệ sĩ</Text>
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 40 },
  sectionTitle: { color: COLORS.text, fontSize: 20, fontWeight: '700', marginBottom: 14 },
  marginTop: { marginTop: 18 },
  emptyText: { color: COLORS.muted, marginBottom: 10 },
  genreWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genreChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  genreText: { color: COLORS.text },
  addButton: { marginTop: 28, alignItems: 'center' },
  plusCircle: { width: 66, height: 66, borderRadius: 33, backgroundColor: COLORS.accentDim, alignItems: 'center', justifyContent: 'center' },
  plusText: { color: COLORS.white, fontSize: 34, marginTop: -2 },
  addText: { color: COLORS.text, marginTop: 8, fontWeight: '600' },
});
