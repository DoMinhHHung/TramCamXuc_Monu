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

import { GenreChip } from '../../components/GenreChip';
import { getPopularGenres } from '../../services/favorites';
import { Genre } from '../../types/favorites';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../config/colors';

type Nav = NativeStackNavigationProp<RootStackParamList, 'SelectGenres'>;

const MIN_GENRES = 1;
const MAX_GENRES = 5;

export const SelectGenresScreen = () => {
  const navigation = useNavigation<Nav>();
  const { refreshProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  useEffect(() => {
    loadGenres();
  }, []);

  const loadGenres = async () => {
    try {
      setLoading(true);
      const genresData = await getPopularGenres(20);
      setGenres(genresData);
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

  const handleContinue = () => {
    if (selectedGenres.length < MIN_GENRES || selectedGenres.length > MAX_GENRES) {
      Alert.alert('Lỗi', `Vui lòng chọn từ ${MIN_GENRES} đến ${MAX_GENRES} thể loại.`);
      return;
    }

    navigation.navigate('SelectArtists', { selectedGenreIds: selectedGenres });
  };

  const handleSkip = async () => {
    Alert.alert(
        'Bỏ qua?',
        'Nếu bỏ qua, bạn sẽ không nhận được gợi ý nhạc phù hợp.',
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Bỏ qua',
            style: 'destructive',
            onPress: async () => {
              await refreshProfile();
            }
          }
        ]
    );
  };

  const canContinue =
      selectedGenres.length >= MIN_GENRES &&
      selectedGenres.length <= MAX_GENRES;

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
          <View style={styles.header}>
            <Text style={styles.emoji}>🎵</Text>
            <Text style={styles.title}>Chào mừng đến Monu!</Text>
            <Text style={styles.subtitle}>
              Hãy cho chúng tôi biết thể loại nhạc yêu thích của bạn
            </Text>

            <View style={styles.stepIndicator}>
              <View style={[styles.stepDot, styles.stepDotActive]} />
              <View style={styles.stepDot} />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Chọn {MIN_GENRES}-{MAX_GENRES} thể loại
              <Text style={styles.sectionCount}>
                {' '}
                ({selectedGenres.length}/{MAX_GENRES})
              </Text>
            </Text>

            <View style={styles.genresContainer}>
              {genres.map(genre => (
                  <GenreChip
                      key={genre.id}
                      name={genre.name}
                      selected={selectedGenres.includes(genre.id)}
                      onPress={() => toggleGenre(genre.id)}
                      disabled={
                          !selectedGenres.includes(genre.id) &&
                          selectedGenres.length >= MAX_GENRES
                      }
                  />
              ))}
            </View>
          </View>

          <View style={styles.buttonsContainer}>
            <Pressable
                style={[
                  styles.button,
                  styles.buttonPrimary,
                  !canContinue && styles.buttonDisabled
                ]}
                onPress={handleContinue}
                disabled={!canContinue}
            >
              <Text style={styles.buttonPrimaryText}>Tiếp tục</Text>
            </Pressable>

            <Pressable
                style={[styles.button, styles.buttonSecondary]}
                onPress={handleSkip}
            >
              <Text style={styles.buttonSecondaryText}>Bỏ qua</Text>
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

  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
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