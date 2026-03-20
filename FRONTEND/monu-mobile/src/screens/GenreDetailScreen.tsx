/**
 * ─────────────────────────────────────────────────────────────────────────────
 * GenreDetailScreen – Browse and filter songs by genre
 * Displays genre information, popular songs, and allows filtering/sorting
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../context/LocalizationContext';
import { usePlayer } from '../context/PlayerContext';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Song } from '../services/music';
import { SongSection } from '../components/SongSection';
import { BackButton } from '../components/BackButton';
import themeUtils from '../config/themeUtils';

type GenreDetailNavigationProp = NativeStackNavigationProp<RootStackParamList, 'GenreDetail'>;

interface GenreDetailRoute {
  genreId: string;
  genreName: string;
}

export const GenreDetailScreen = () => {
  const navigation = useNavigation<GenreDetailNavigationProp>();
  const route = useRoute();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { playSong, currentSong, isPlaying } = usePlayer();
  const insets = useSafeAreaInsets();

  const params = (route.params as unknown as GenreDetailRoute) || {};
  const { genreId = '', genreName = 'Genre' } = params;

  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'trending' | 'newest' | 'popular'>('trending');

  const fetchGenreSongs = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // TODO: Replace with actual API call
      // const response = await getGenreSongs(genreId, { sortBy, limit: 50 });
      // setSongs(response);

      // Mock data for now
      const mockSongs: Song[] = Array.from({ length: 12 }, (_, i) => ({
        id: `song_${i}`,
        title: `${genreName} Track ${i + 1}`,
        primaryArtist: { artistId: `artist_${i}`, stageName: 'Artist Name' },
        genres: [{ id: genreId, name: genreName }],
        durationSeconds: 180 + Math.random() * 120,
        playCount: 1000 + Math.random() * 10000,
        thumbnailUrl: undefined,
        status: 'PUBLIC' as const,
        transcodeStatus: 'COMPLETED' as const,
        createdAt: '',
        updatedAt: '',
      }));

      setSongs(mockSongs);
    } catch (error) {
      Alert.alert('Error', 'Failed to load genre songs');
      console.error('[GenreDetailScreen] Error fetching songs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [genreId, genreName, sortBy]);

  useEffect(() => {
    fetchGenreSongs();
  }, [fetchGenreSongs, sortBy]);

  const handlePressSong = useCallback((song: Song) => {
    playSong(song, songs);
  }, [playSong, songs]);

  const formatDuration = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, []);

  const styles = StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    header: {
      paddingHorizontal: themeUtils.spacing.lg,
      paddingBottom: themeUtils.spacing.lg,
    },
    headerTop: {
      marginBottom: themeUtils.spacing.md,
      alignItems: 'flex-start',
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: themeUtils.spacing.md,
    },
    iconContainer: {
      width: 56,
      height: 56,
      borderRadius: themeUtils.borderRadius.md,
      backgroundColor: colors.surfaceMid,
      justifyContent: 'center',
      alignItems: 'center',
      borderColor: colors.accentBorder25,
      borderWidth: 0.5,
    },
    titleSection: {
      flex: 1,
    },
    genreName: {
      fontSize: themeUtils.fontSize['2xl'],
      fontWeight: '700',
      color: colors.text,
    },
    genreSubtitle: {
      fontSize: themeUtils.fontSize.sm,
      color: colors.textSecondary,
      marginTop: 2,
    },
    filterSection: {
      flexDirection: 'row',
      gap: themeUtils.spacing.sm,
      paddingHorizontal: themeUtils.spacing.lg,
      paddingBottom: themeUtils.spacing.md,
      justifyContent: 'flex-start',
    },
    filterButton: {
      minWidth: 92,
      paddingHorizontal: themeUtils.spacing.md,
      paddingVertical: themeUtils.spacing.sm,
      borderRadius: themeUtils.borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
    },
    filterButtonActive: {
      backgroundColor: colors.accentFill20,
      borderColor: colors.accent,
    },
    filterButtonText: {
      fontSize: themeUtils.fontSize.sm,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    filterButtonTextActive: {
      color: colors.accent,
      fontWeight: '600',
    },
    contentSection: {
      paddingHorizontal: themeUtils.spacing.lg,
      paddingVertical: themeUtils.spacing.md,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: themeUtils.spacing['3xl'],
    },
    emptyStateIcon: {
      marginBottom: themeUtils.spacing.md,
      opacity: 0.5,
    },
    emptyStateText: {
      fontSize: themeUtils.fontSize.md,
      color: colors.textSecondary,
    },
  });

  if (loading) {
    return (
      <View style={[styles.root, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchGenreSongs(true)}
            tintColor={colors.accent}
          />
        )}
      >
        <LinearGradient
          colors={[colors.gradPurple, colors.gradIndigo, colors.bg]}
          style={[styles.header, { paddingTop: insets.top + themeUtils.spacing.md }]}
        >
          <View style={styles.headerTop}>
            <BackButton onPress={() => navigation.goBack()} />
          </View>

          <View style={styles.headerContent}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons
                name="music-note"
                size={28}
                color={colors.accent}
              />
            </View>
            <View style={styles.titleSection}>
              <Text style={styles.genreName}>{genreName}</Text>
              <Text style={styles.genreSubtitle}>
                {songs.length} {t('homeScreen.songs')}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Sort/Filter Controls */}
        <View style={styles.filterSection}>
          {(['trending', 'newest', 'popular'] as const).map((sort) => (
            <Pressable
              key={sort}
              style={[styles.filterButton, sortBy === sort && styles.filterButtonActive]}
              onPress={() => setSortBy(sort)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  sortBy === sort && styles.filterButtonTextActive,
                ]}
              >
                {sort === 'trending' ? 'Trending' : sort === 'newest' ? 'Newest' : 'Popular'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Songs List */}
        {songs.length > 0 ? (
          <View style={styles.contentSection}>
            <SongSection
              title=""
              songs={songs}
              currentSong={currentSong}
              isPlaying={isPlaying}
              onPressSong={handlePressSong}
              onSongAction={() => {}} // TODO: Implement action sheet
              formatDuration={formatDuration}
            />
          </View>
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="music-note-off"
              size={48}
              color={colors.textSecondary}
              style={styles.emptyStateIcon}
            />
            <Text style={styles.emptyStateText}>
              {t('homeScreen.noDataAvailable')}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default GenreDetailScreen;
