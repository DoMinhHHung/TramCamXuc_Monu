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
import { BackButton } from '../../components/BackButton';
import { COLORS } from '../../config/colors';
import { ONBOARDING_EMOJIS } from '../../config/emojis';
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
  const insets = useSafeAreaInsets();
  const selectedGenres = route.params?.selectedGenreIds ?? [];

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);

  useEffect(() => { void loadArtists(); }, []);

  const loadArtists = async () => {
    try {
      setLoading(true);
      setArtists(await getPopularArtists(20));
    } catch (error: any) {
      Alert.alert('Lỗi', error?.message || 'Không thể tải dữ liệu nghệ sĩ.');
    } finally { setLoading(false); }
  };

  const toggleArtist = (id: string) => {
    if (selectedArtists.includes(id)) { setSelectedArtists(selectedArtists.filter(a => a !== id)); return; }
    if (selectedArtists.length >= MAX_ARTISTS) { Alert.alert('Giới hạn', `Tối đa ${MAX_ARTISTS} nghệ sĩ.`); return; }
    setSelectedArtists([...selectedArtists, id]);
  };

  const handleFinish = async () => {
    if (selectedArtists.length < MIN_ARTISTS) { Alert.alert('Lỗi', `Vui lòng chọn ít nhất ${MIN_ARTISTS} nghệ sĩ.`); return; }
    try {
      setSubmitting(true);
      await updateMyFavorites({ favoriteGenreIds: selectedGenres, favoriteArtistIds: selectedArtists });
      await refreshProfile();
    } catch (error: any) {
      Alert.alert('Lỗi', error?.message || 'Không thể lưu sở thích của bạn.');
    } finally { setSubmitting(false); }
  };

  if (loading) {
    return (
        <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Đang tải nghệ sĩ...</Text>
        </View>
    );
  }

  return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <ScrollView showsVerticalScrollIndicator={false}>
          <LinearGradient
              colors={[COLORS.gradIndigo, COLORS.bg]}
              style={[styles.gradientTop, { paddingTop: insets.top + 12 }]}
          >
            <BackButton onPress={() => navigation.goBack()} />

            <View style={styles.stepRow}>
              <View style={styles.stepDot} />
              <View style={styles.stepDotActive} />
            </View>

            <Text style={styles.emoji}>{ONBOARDING_EMOJIS.artist}</Text>
            <Text style={styles.title}>Nghệ sĩ bạn{'\n'}yêu thích</Text>
            <Text style={styles.subtitle}>Playlist của bạn sẽ được cá nhân hóa theo lựa chọn này</Text>
          </LinearGradient>

          <View style={[styles.body, { paddingBottom: insets.bottom + 32 }]}>
            <View style={styles.countRow}>
              <Text style={styles.countLabel}>Chọn {MIN_ARTISTS}–{MAX_ARTISTS} nghệ sĩ</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{selectedArtists.length}/{MAX_ARTISTS}</Text>
              </View>
            </View>

            <View style={styles.artistGrid}>
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
            </View>

            <Pressable
                style={({ pressed }) => [styles.finishBtn, submitting && styles.btnDisabled, pressed && { opacity: 0.85 }]}
                onPress={handleFinish}
                disabled={submitting}
            >
              <LinearGradient
                  colors={[COLORS.accent, COLORS.accentAlt]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.btnGradient}
              >
                {submitting
                    ? <ActivityIndicator color={COLORS.white} />
                    : <Text style={styles.finishBtnText}>Hoàn tất ✓</Text>
                }
              </LinearGradient>
            </Pressable>
          </View>
        </ScrollView>
      </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  loadingText: { color: 'COLORS.glass40', marginTop: 12 },

  gradientTop: { paddingHorizontal: 24, paddingBottom: 32 },

  stepRow: { flexDirection: 'row', gap: 8, marginTop: 20, marginBottom: 24 },
  stepDotActive: { width: 24, height: 8, borderRadius: 4, backgroundColor: COLORS.accent },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'COLORS.glass20' },

  emoji: { fontSize: 44, marginBottom: 14 },
  title: { color: COLORS.white, fontSize: 30, fontWeight: '800', lineHeight: 38, marginBottom: 10 },
  subtitle: { color: 'COLORS.glass50', fontSize: 15, lineHeight: 22 },

  body: { paddingHorizontal: 20, paddingTop: 24 },

  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  countLabel: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  countBadge: {
    backgroundColor: 'COLORS.accentFill25',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'COLORS.accentBorder30',
  },
  countBadgeText: { color: COLORS.accent, fontWeight: '700', fontSize: 13 },

  artistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 28,
  },

  finishBtn: { borderRadius: 999, overflow: 'hidden' },
  btnDisabled: { opacity: 0.5 },
  btnGradient: { minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  finishBtnText: { color: COLORS.white, fontWeight: '800', fontSize: 16 },
});
