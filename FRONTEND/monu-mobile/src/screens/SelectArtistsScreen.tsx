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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ArtistCard } from '../components/ArtistCard';
import { getPopularArtists, updateMyFavorites } from '../services/favorites';
import { Artist } from '../types/favorites';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../config/colors';

type Nav = NativeStackNavigationProp<RootStackParamList, 'SelectArtists'>;
type Route = RouteProp<RootStackParamList, 'SelectArtists'>;

const MIN_ARTISTS = 1;
const MAX_ARTISTS = 3;

export const SelectArtistsScreen = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { refreshProfile } = useAuth();

  const { selectedGenreIds } = route.params;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);

  useEffect(() => {
    loadArtists();
  }, []);

  const loadArtists = async () => {
    try {
      setLoading(true);
      const artistsData = await getPopularArtists(15);
      setArtists(artistsData);
    } catch (error: any) {
      Alert.alert('Lỗi', error?.message || 'Không thể tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
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
    if (selectedArtists.length < MIN_ARTISTS || selectedArtists.length > MAX_ARTISTS) {
      Alert.alert('Lỗi', `Vui lòng chọn từ ${MIN_ARTISTS} đến ${MAX_ARTISTS} nghệ sĩ.`);
      return;
    }

    try {
      setSubmitting(true);
      await updateMyFavorites({
        favoriteGenreIds: selectedGenreIds,
        favoriteArtistIds: selectedArtists,
      });

      // Refresh profile to update pickFavorite flag
      await refreshProfile();
      // Navigator will auto re-render and show Home screen
    } catch (error: any) {
      Alert.alert('Lỗi', error?.message || 'Không thể lưu sở thích. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const canSubmit = selectedArtists.length >= MIN_ARTISTS && 
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
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.emoji}>🎤</Text>
          <Text style={styles.title}>Nghệ sĩ yêu thích</Text>
          <Text style={styles.subtitle}>
            Chọn nghệ sĩ bạn yêu thích để nhận gợi ý phù hợp
          </Text>
          <View style={styles.stepIndicator}>
            <View style={styles.stepDot} />
            <View style={[styles.stepDot, styles.stepDotActive]} />
          </View>
        </View>

        {/* Artists Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Chọn {MIN_ARTISTS}-{MAX_ARTISTS} nghệ sĩ 
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
              <Text style={styles.buttonPrimaryText}>Hoàn tất</Text>
            )}
          </Pressable>

          <Pressable
            style={[styles.button, styles.buttonSecondary]}
            onPress={handleBack}
            disabled={submitting}
          >
            <Text style={styles.buttonSecondaryText}>← Quay lại</Text>
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
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  stepIndicator: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 8,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  stepDotActive: {
    backgroundColor: COLORS.accent,
    width: 24,
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
  artistsContainer: {
    paddingRight: 20,
    gap: 12,
  },
  buttonsContainer: {
    gap: 12,
    marginTop: 20,
  },
  button: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: COLORS.accent,
  },
  buttonDisabled: {
    backgroundColor: COLORS.border,
    opacity: 0.5,
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
    fontWeight: '600',
  },
});
