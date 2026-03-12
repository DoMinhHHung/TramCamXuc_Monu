import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable,
  ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArtistCard } from '../../components/ArtistCard';
import { GenreChip } from '../../components/GenreChip';
import {
  getMyFavorites, getPopularArtists, getPopularGenres, updateMyFavorites,
} from '../../services/favorites';
import { Artist, Genre } from '../../types/favorites';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { COLORS } from '../../config/colors';

type Nav = NativeStackNavigationProp<RootStackParamList, 'EditFavorites'>;

const MIN_GENRES = 1; const MAX_GENRES = 5;
const MIN_ARTISTS = 1; const MAX_ARTISTS = 3;

export const EditFavoritesScreen = () => {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [favoritesData, genresData, artistsData] = await Promise.all([
        getMyFavorites(), getPopularGenres(20), getPopularArtists(15),
      ]);
      setGenres(genresData); setArtists(artistsData);
      if (favoritesData.favoriteGenreIds) setSelectedGenres(favoritesData.favoriteGenreIds);
      if (favoritesData.favoriteArtistIds) setSelectedArtists(favoritesData.favoriteArtistIds);
    } catch (error: any) {
      Alert.alert('Lỗi', error?.message || 'Không thể tải dữ liệu.');
    } finally { setLoading(false); }
  };

  const toggleGenre = (id: string) => {
    if (selectedGenres.includes(id)) { setSelectedGenres(selectedGenres.filter(g => g !== id)); return; }
    if (selectedGenres.length >= MAX_GENRES) { Alert.alert('Giới hạn', `Tối đa ${MAX_GENRES} thể loại.`); return; }
    setSelectedGenres([...selectedGenres, id]);
  };

  const toggleArtist = (id: string) => {
    if (selectedArtists.includes(id)) { setSelectedArtists(selectedArtists.filter(a => a !== id)); return; }
    if (selectedArtists.length >= MAX_ARTISTS) { Alert.alert('Giới hạn', `Tối đa ${MAX_ARTISTS} nghệ sĩ.`); return; }
    setSelectedArtists([...selectedArtists, id]);
  };

  const handleSubmit = async () => {
    if (selectedGenres.length < MIN_GENRES) { Alert.alert('Lỗi', `Chọn ít nhất ${MIN_GENRES} thể loại.`); return; }
    if (selectedArtists.length < MIN_ARTISTS) { Alert.alert('Lỗi', `Chọn ít nhất ${MIN_ARTISTS} nghệ sĩ.`); return; }
    try {
      setSubmitting(true);
      await updateMyFavorites({ favoriteGenreIds: selectedGenres, favoriteArtistIds: selectedArtists });
      Alert.alert('Thành công', 'Sở thích đã được cập nhật!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (error: any) {
      Alert.alert('Lỗi', error?.message || 'Không thể lưu sở thích.');
    } finally { setSubmitting(false); }
  };

  const canSubmit = selectedGenres.length >= MIN_GENRES && selectedArtists.length >= MIN_ARTISTS;

  if (loading) {
    return (
        <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
    );
  }

  return (
      <View style={styles.root}>
        <StatusBar style="light" />

        {/* Top bar */}
        <LinearGradient
            colors={[COLORS.gradSlate, COLORS.bg]}
            style={[styles.topBar, { paddingTop: insets.top + 12 }]}
        >
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Quay lại</Text>
          </Pressable>
          <Text style={styles.topBarTitle}>Chỉnh sửa sở thích</Text>
          <View style={{ width: 80 }} />
        </LinearGradient>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]}>
          {/* Genres */}
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Thể loại yêu thích</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{selectedGenres.length}/{MAX_GENRES}</Text>
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
          </View>

          {/* Artists */}
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Nghệ sĩ yêu thích</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{selectedArtists.length}/{MAX_ARTISTS}</Text>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
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
          <Pressable
              style={({ pressed }) => [styles.saveBtn, !canSubmit && styles.btnDisabled, pressed && { opacity: 0.85 }]}
              onPress={handleSubmit}
              disabled={!canSubmit || submitting}
          >
            <LinearGradient
                colors={canSubmit ? [COLORS.accent, COLORS.accentAlt] : [COLORS.surfaceMid, COLORS.surfaceMid]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.saveBtnGradient}
            >
              {submitting
                  ? <ActivityIndicator size="small" color={COLORS.white} />
                  : <Text style={styles.saveBtnText}>Lưu thay đổi</Text>
              }AppNavigator
            </LinearGradient>
          </Pressable>

          <Pressable style={styles.cancelBtn} onPress={() => navigation.goBack()} disabled={submitting}>
            <Text style={styles.cancelBtnText}>Hủy</Text>
          </Pressable>
        </ScrollView>
      </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'COLORS.glass06',
  },
  backBtn: { paddingVertical: 8, paddingHorizontal: 4 },
  backBtnText: { color: COLORS.accent, fontSize: 15, fontWeight: '600' },
  topBarTitle: { color: COLORS.white, fontSize: 17, fontWeight: '700' },

  body: { paddingHorizontal: 20, paddingTop: 24 },

  section: { marginBottom: 32 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { color: COLORS.white, fontSize: 17, fontWeight: '700' },
  countBadge: {
    backgroundColor: 'COLORS.accentFill25',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'COLORS.accentBorder30',
  },
  countText: { color: COLORS.accent, fontWeight: '700', fontSize: 12 },

  genresWrap: { flexDirection: 'row', flexWrap: 'wrap' },

  saveBtn: { borderRadius: 999, overflow: 'hidden', marginBottom: 12 },
  btnDisabled: { opacity: 0.5 },
  saveBtnGradient: { minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  saveBtnText: { color: COLORS.white, fontWeight: '800', fontSize: 16 },

  cancelBtn: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'COLORS.glass10',
  },
  cancelBtnText: { color: 'COLORS.glass45', fontWeight: '600', fontSize: 15 },
});