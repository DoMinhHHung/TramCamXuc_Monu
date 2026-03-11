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

import { ArtistCard } from '../../components/ArtistCard';
import { BackButton } from '../../components/BackButton';
import { COLORS } from '../../config/colors';
import { useAuth } from '../../context/AuthContext';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { getPopularArtists, updateMyFavorites } from '../../services/favorites';
import { Artist } from '../../types/favorites';

type Nav = NativeStackNavigationProp<RootStackParamList, 'SelectArtists'>;

const MIN_ARTISTS = 1;
const MAX_ARTISTS = 3;

export const SelectArtistsScreen = ({ route }: { route: { params: { selectedGenreIds: string[] } } }) => {
  const navigation = useNavigation<Nav>();
  const { refreshProfile } = useAuth();
  const selectedGenres = route.params?.selectedGenreIds ?? [];

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);

  useEffect(() => {
    void loadArtists();
  }, []);

  const loadArtists = async () => {
    try {
      setLoading(true);
      setArtists(await getPopularArtists(20));
    } catch (error: any) {
      Alert.alert('Lỗi', error?.message || 'Không thể tải dữ liệu nghệ sĩ.');
    } finally {
      setLoading(false);
    }
  };

  const toggleArtist = (id: string) => {
    if (selectedArtists.includes(id)) {
      setSelectedArtists(selectedArtists.filter((artistId) => artistId !== id));
      return;
    }

    if (selectedArtists.length >= MAX_ARTISTS) {
      Alert.alert('Giới hạn', `Bạn chỉ có thể chọn tối đa ${MAX_ARTISTS} nghệ sĩ.`);
      return;
    }

    setSelectedArtists([...selectedArtists, id]);
  };

  const handleFinish = async () => {
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

      await refreshProfile();
    } catch (error: any) {
      Alert.alert('Lỗi', error?.message || 'Không thể lưu sở thích của bạn.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Đang tải nghệ sĩ...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <BackButton onPress={() => navigation.goBack()} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.emoji}>🎤</Text>
          <Text style={styles.title}>Chọn nghệ sĩ bạn thích</Text>
          <Text style={styles.subtitle}>Điều này giúp PhazelSound cá nhân hóa playlist cho bạn</Text>

          <View style={styles.stepIndicator}>
            <View style={styles.stepDot} />
            <View style={[styles.stepDot, styles.stepDotActive]} />
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          Chọn {MIN_ARTISTS}-{MAX_ARTISTS} nghệ sĩ ({selectedArtists.length}/{MAX_ARTISTS})
        </Text>

        <View style={styles.artistGrid}>
          {artists.map((artist) => (
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
        </View>

        <Pressable style={[styles.finishButton, submitting && styles.disabled]} onPress={handleFinish} disabled={submitting}>
          {submitting ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.finishText}>Hoàn tất</Text>}
        </Pressable>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  centered: { justifyContent: 'center', alignItems: 'center' },
  headerBar: { paddingHorizontal: 20, paddingTop: 20 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  loadingText: { color: COLORS.muted, marginTop: 10 },
  header: { alignItems: 'center', marginTop: 12, marginBottom: 24 },
  emoji: { fontSize: 44, marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  subtitle: { color: COLORS.muted, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  stepIndicator: { flexDirection: 'row', marginTop: 18 },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.border, marginHorizontal: 4 },
  stepDotActive: { width: 24, backgroundColor: COLORS.accent },
  sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: '600', marginBottom: 12 },
  artistGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  finishButton: { marginTop: 18, backgroundColor: COLORS.accentDim, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  finishText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
  disabled: { opacity: 0.5 },
});
