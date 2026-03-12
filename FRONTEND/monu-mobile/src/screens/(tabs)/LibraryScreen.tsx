import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FavoriteArtistRow } from '../../components/FavoriteArtistRow';
import { COLORS } from '../../config/colors';
import { getMyFavorites, getPopularArtists, getPopularGenres } from '../../services/favorites';
import { Artist, Genre } from '../../types/favorites';

export const LibraryScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [favoriteArtistIds, setFavoriteArtistIds] = useState<string[]>([]);
  const [favoriteGenreIds, setFavoriteGenreIds] = useState<string[]>([]);

  useEffect(() => { void loadData(); }, []);

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
    } finally { setLoading(false); }
  };

  const favoriteArtists = useMemo(
      () => artists.filter(a => favoriteArtistIds.includes(a.id)),
      [artists, favoriteArtistIds],
  );
  const favoriteGenres = useMemo(
      () => genres.filter(g => favoriteGenreIds.includes(g.id)),
      [genres, favoriteGenreIds],
  );

  if (loading) {
    return (
        <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
          <ActivityIndicator color={COLORS.accent} size="large" />
        </View>
    );
  }

  return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Edge-to-edge header */}
          <LinearGradient
              colors={[COLORS.gradSlate, COLORS.bg]}
              style={[styles.header, { paddingTop: insets.top + 16 }]}
          >
            <Text style={styles.headerTitle}>Thư viện của bạn</Text>
            <Text style={styles.headerSub}>Nghệ sĩ & thể loại yêu thích</Text>
          </LinearGradient>

          <View style={styles.body}>
            {/* Artists section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Nghệ sĩ yêu thích</Text>
              <Text style={styles.sectionCount}>{favoriteArtists.length} nghệ sĩ</Text>
            </View>

            {favoriteArtists.length ? (
                <View style={styles.artistsCard}>
                  <LinearGradient colors={[COLORS.surface, COLORS.surfaceLow]} style={styles.artistsCardGradient}>
                    {favoriteArtists.map((artist, i) => (
                        <View key={artist.id}>
                          <FavoriteArtistRow name={artist.stageName} avatarUrl={artist.avatarUrl} />
                          {i < favoriteArtists.length - 1 && <View style={styles.divider} />}
                        </View>
                    ))}
                  </LinearGradient>
                </View>
            ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyEmoji}>🎤</Text>
                  <Text style={styles.emptyText}>Chưa có nghệ sĩ yêu thích</Text>
                </View>
            )}

            {/* Genres section */}
            <View style={[styles.sectionHeader, { marginTop: 28 }]}>
              <Text style={styles.sectionTitle}>Thể loại yêu thích</Text>
              <Text style={styles.sectionCount}>{favoriteGenres.length} thể loại</Text>
            </View>

            {favoriteGenres.length ? (
                <View style={styles.genreWrap}>
                  {favoriteGenres.map(genre => (
                      <LinearGradient
                          key={genre.id}
                          colors={[COLORS.surface, COLORS.surfaceLow]}
                          style={styles.genreChip}
                      >
                        <Text style={styles.genreText}>{genre.name}</Text>
                      </LinearGradient>
                  ))}
                </View>
            ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyEmoji}>🎵</Text>
                  <Text style={styles.emptyText}>Chưa có thể loại yêu thích</Text>
                </View>
            )}

            {/* Edit button */}
            <Pressable
                style={({ pressed }) => [styles.editBtn, pressed && { opacity: 0.8 }]}
                onPress={() => navigation.navigate('EditFavorites')}
            >
              <LinearGradient
                  colors={[COLORS.accent, COLORS.accentAlt]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.editBtnGradient}
              >
                <Text style={styles.editBtnText}>✎  Chỉnh sửa sở thích</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </ScrollView>
      </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  header: { paddingHorizontal: 20, paddingBottom: 24 },
  headerTitle: { color: COLORS.white, fontSize: 28, fontWeight: '800', marginBottom: 4 },
  headerSub: { color: 'COLORS.glass40', fontSize: 14 },

  body: { paddingHorizontal: 20, paddingTop: 24 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  sectionCount: { color: 'COLORS.glass35', fontSize: 13 },

  artistsCard: { borderRadius: 16, overflow: 'hidden' },
  artistsCardGradient: {
    borderWidth: 1,
    borderColor: 'COLORS.glass07',
    borderRadius: 16,
    paddingVertical: 4,
  },
  divider: { height: 1, backgroundColor: 'COLORS.glass06', marginHorizontal: 16 },

  emptyCard: {
    backgroundColor: 'COLORS.glass03',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'COLORS.glass07',
    paddingVertical: 24,
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  emptyEmoji: { fontSize: 28, marginBottom: 8, opacity: 0.4 },
  emptyText: { color: 'COLORS.glass30', fontSize: 14 },

  genreWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genreChip: {
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'COLORS.accentBorder25',
    overflow: 'hidden',
  },
  genreText: { color: 'COLORS.glass85', fontSize: 13, fontWeight: '600' },

  editBtn: { borderRadius: 999, overflow: 'hidden', marginTop: 36 },
  editBtnGradient: { minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  editBtnText: { color: COLORS.white, fontWeight: '800', fontSize: 15 },
});