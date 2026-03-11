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

import { BackButton } from '../../components/BackButton';
import { GenreChip } from '../../components/GenreChip';
import { COLORS } from '../../config/colors';
import { useAuth } from '../../context/AuthContext';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { getPopularGenres } from '../../services/favorites';
import { Genre } from '../../types/favorites';

type Nav = NativeStackNavigationProp<RootStackParamList, 'SelectGenres'>;

const MIN_GENRES = 1;
const MAX_GENRES = 5;

export const SelectGenresScreen = () => {
  const navigation = useNavigation<Nav>();
  const { refreshProfile, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  useEffect(() => {
    void loadGenres();
  }, []);

  const loadGenres = async () => {
    try {
      setLoading(true);
      setGenres(await getPopularGenres(20));
    } catch (error: any) {
      Alert.alert('Lỗi', error?.message || 'Không thể tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    Alert.alert('Cancel setup?', 'Do you want to cancel setup and logout?', [
      { text: 'Không', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);
  };

  const toggleGenre = (id: string) => {
    if (selectedGenres.includes(id)) {
      setSelectedGenres(selectedGenres.filter((g) => g !== id));
      return;
    }

    if (selectedGenres.length >= MAX_GENRES) {
      Alert.alert('Giới hạn', `Bạn chỉ có thể chọn tối đa ${MAX_GENRES} thể loại.`);
      return;
    }

    setSelectedGenres([...selectedGenres, id]);
  };

  const handleContinue = () => {
    if (selectedGenres.length < MIN_GENRES || selectedGenres.length > MAX_GENRES) {
      Alert.alert('Lỗi', `Vui lòng chọn từ ${MIN_GENRES} đến ${MAX_GENRES} thể loại.`);
      return;
    }

    navigation.navigate('SelectArtists', { selectedGenreIds: selectedGenres });
  };

  const handleSkip = () => {
    Alert.alert('Bỏ qua?', 'Nếu bỏ qua, bạn sẽ không nhận được gợi ý nhạc phù hợp.', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Bỏ qua',
        style: 'destructive',
        onPress: async () => {
          await refreshProfile();
        },
      },
    ]);
  };

  const canContinue = selectedGenres.length >= MIN_GENRES && selectedGenres.length <= MAX_GENRES;

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
      <View style={styles.headerBar}>
        <BackButton onPress={handleBack} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.emoji}>🎵</Text>
          <Text style={styles.title}>Chào mừng đến PhazelSound!</Text>
          <Text style={styles.subtitle}>Hãy cho chúng tôi biết thể loại nhạc yêu thích của bạn</Text>

          <View style={styles.stepIndicator}>
            <View style={[styles.stepDot, styles.stepDotActive]} />
            <View style={styles.stepDot} />
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          Chọn {MIN_GENRES}-{MAX_GENRES} thể loại ({selectedGenres.length}/{MAX_GENRES})
        </Text>

        <View style={styles.genresContainer}>
          {genres.map((genre) => (
            <GenreChip
              key={genre.id}
              name={genre.name}
              selected={selectedGenres.includes(genre.id)}
              onPress={() => toggleGenre(genre.id)}
              disabled={!selectedGenres.includes(genre.id) && selectedGenres.length >= MAX_GENRES}
            />
          ))}
        </View>

        <View style={styles.buttonsContainer}>
          <Pressable
            style={[styles.button, styles.buttonPrimary, !canContinue && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={!canContinue}
          >
            <Text style={styles.buttonPrimaryText}>Tiếp tục</Text>
          </Pressable>

          <Pressable style={[styles.button, styles.buttonSecondary]} onPress={handleSkip}>
            <Text style={styles.buttonSecondaryText}>Bỏ qua</Text>
          </Pressable>
        </View>
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
  loadingText: { color: COLORS.muted, marginTop: 12, fontSize: 14 },
  header: { alignItems: 'center', marginBottom: 32, marginTop: 12 },
  emoji: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 28, fontWeight: '700', color: COLORS.text, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: COLORS.muted, textAlign: 'center', lineHeight: 24 },
  stepIndicator: { flexDirection: 'row', marginTop: 20 },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.border, marginHorizontal: 4 },
  stepDotActive: { width: 24, backgroundColor: COLORS.accent },
  sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: '600', marginBottom: 16 },
  genresContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 24 },
  buttonsContainer: { gap: 12 },
  button: { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  buttonPrimary: { backgroundColor: COLORS.accentDim },
  buttonSecondary: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  buttonPrimaryText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
  buttonSecondaryText: { color: COLORS.text, fontWeight: '600', fontSize: 16 },
  buttonDisabled: { opacity: 0.4 },
});
