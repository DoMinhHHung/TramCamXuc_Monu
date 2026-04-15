import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArtistCard } from '../../components/ArtistCard';
import { BackButton } from '../../components/BackButton';
import { ColorScheme, useThemeColors } from '../../config/colors';
import { ONBOARDING_EMOJIS } from '../../config/emojis';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LocalizationContext';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { apiClient } from '../../services/api';
import { searchArtists, type Artist as ApiArtist } from '../../services/music';
import { updateMyFavorites } from '../../services/favorites';
import { Artist } from '../../types/favorites';
import { MaterialIcons } from '@expo/vector-icons';

type MeArtist = { id: string; stageName: string; avatarUrl?: string; status?: string };

const PAGE_SIZE = 50;
const MAX_CATALOG_PAGES = 8;

const mapApiArtistToFavorite = (a: ApiArtist): Artist | null => {
  const id = (a as { id?: string }).id ?? a.artistId;
  if (!id) return null;
  return {
    id,
    stageName: a.stageName,
    avatarUrl: a.avatarUrl,
    status: 'ACTIVE',
  };
};

const sortByStageName = (list: Artist[]) =>
  [...list].sort((x, y) => x.stageName.localeCompare(y.stageName, undefined, { sensitivity: 'base' }));

type Nav = NativeStackNavigationProp<RootStackParamList, 'SelectArtists'>;

const MIN_ARTISTS = 1;
const MAX_ARTISTS = 3;

export const SelectArtistsScreen = ({ route }: { route: { params: { selectedGenreIds: string[] } } }) => {
  const navigation = useNavigation<Nav>();
  const { refreshProfile } = useAuth();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const themeColors = useThemeColors();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const selectedGenres = route.params?.selectedGenreIds ?? [];

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [catalogArtists, setCatalogArtists] = useState<Artist[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<Artist[] | null>(null);
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);
  const myArtistRef = useRef<Artist | null>(null);
  const searchReq = useRef(0);

  const loadArtists = useCallback(async () => {
    try {
      setLoading(true);
      const merged = new Map<string, Artist>();
      // Backend `/artists` currently uses 1-based `page` (page=1 is first page).
      let page = 1;
      let last = false;

      while (!last && page < MAX_CATALOG_PAGES) {
        const res = await searchArtists({ page, size: PAGE_SIZE });
        for (const raw of res.content ?? []) {
          const m = mapApiArtistToFavorite(raw);
          if (m) merged.set(m.id, m);
        }
        last = Boolean(res.last);
        page += 1;
      }

      try {
        const res = await apiClient.get<MeArtist>('/artists/me');
        const me = res.data;
        if (me?.id?.length) {
          const mine: Artist = {
            id: me.id,
            stageName: me.stageName,
            avatarUrl: me.avatarUrl,
            status: 'ACTIVE',
          };
          myArtistRef.current = mine;
          merged.set(me.id, mine);
        }
      } catch {
        myArtistRef.current = null;
      }

      setCatalogArtists(sortByStageName(Array.from(merged.values())));
      setSearchResults(null);
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.message || t('errors.loadingFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadArtists();
  }, [loadArtists]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults(null);
      setSearchLoading(false);
      return;
    }

    setSearchResults(null);
    setSearchLoading(true);
    const req = ++searchReq.current;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const res = await searchArtists({ keyword: q, size: 50 });
          if (searchReq.current !== req) return;
          const fromApi = (res.content ?? [])
            .map(mapApiArtistToFavorite)
            .filter((x): x is Artist => Boolean(x));
          const byId = new Map(fromApi.map((a) => [a.id, a]));
          const mine = myArtistRef.current;
          if (mine && mine.stageName.toLowerCase().includes(q.toLowerCase()) && !byId.has(mine.id)) {
            byId.set(mine.id, mine);
          }
          setSearchResults(sortByStageName([...byId.values()]));
        } catch {
          if (searchReq.current === req) setSearchResults([]);
        } finally {
          if (searchReq.current === req) setSearchLoading(false);
        }
      })();
    }, 320);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const displayArtists = searchQuery.trim() ? (searchResults ?? []) : catalogArtists;

  const toggleArtist = (id: string) => {
    if (selectedArtists.includes(id)) { setSelectedArtists(selectedArtists.filter(a => a !== id)); return; }
    if (selectedArtists.length >= MAX_ARTISTS) {
      Alert.alert(t('screens.onboarding.limitTitle'), t('screens.onboarding.maxArtists').replace('{max}', String(MAX_ARTISTS)));
      return;
    }
    setSelectedArtists([...selectedArtists, id]);
  };

  const handleFinish = async () => {
    if (selectedArtists.length < MIN_ARTISTS) {
      Alert.alert(t('common.error'), t('screens.onboarding.minArtists').replace('{min}', String(MIN_ARTISTS)));
      return;
    }
    try {
      setSubmitting(true);
      await updateMyFavorites({ favoriteGenreIds: selectedGenres, favoriteArtistIds: selectedArtists });
      await refreshProfile();
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.message || t('errors.somethingWentWrong'));
    } finally { setSubmitting(false); }
  };

  if (loading) {
    return (
        <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
          <ActivityIndicator size="large" color={themeColors.accent} />
          <Text style={styles.loadingText}>{t('screens.onboarding.loadingArtists')}</Text>
        </View>
    );
  }

  return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <ScrollView showsVerticalScrollIndicator={false}>
          <LinearGradient
              colors={[themeColors.gradIndigo, themeColors.bg]}
              style={[styles.gradientTop, { paddingTop: insets.top + 12 }]}
          >
            <BackButton onPress={() => navigation.goBack()} />

            <View style={styles.stepRow}>
              <View style={styles.stepDot} />
              <View style={styles.stepDotActive} />
            </View>

            <Text style={styles.emoji}>{ONBOARDING_EMOJIS.artist}</Text>
            <Text style={styles.title}>{t('onboarding.selectArtistsTitle')}</Text>
          </LinearGradient>

          <View style={[styles.body, { paddingBottom: insets.bottom + 32 }]}>
            <View style={styles.countRow}>
              <Text style={styles.countLabel}>{t('onboarding.selectCount').replace('{min}', String(MIN_ARTISTS)).replace('{max}', String(MAX_ARTISTS))}</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{t('onboarding.selected').replace('{count}', String(selectedArtists.length)).replace('{max}', String(MAX_ARTISTS))}</Text>
              </View>
            </View>

            <View style={styles.searchBar}>
              <MaterialIcons name="search" color={themeColors.muted} size={22} />
              <TextInput
                style={styles.searchInput}
                placeholder={t('screens.home.searchPlaceholder')}
                placeholderTextColor={themeColors.glass35}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
              />
              {searchQuery.length > 0 ? (
                <Pressable onPress={() => setSearchQuery('')} hitSlop={10}>
                  <MaterialIcons name="close" color={themeColors.muted} size={22} />
                </Pressable>
              ) : null}
            </View>

            {searchLoading ? (
              <View style={styles.searchLoadingRow}>
                <ActivityIndicator size="small" color={themeColors.accent} />
                <Text style={styles.searchLoadingText}>{t('screens.search.searching', 'Đang tìm…')}</Text>
              </View>
            ) : null}

            {!searchLoading && searchQuery.trim() && displayArtists.length === 0 ? (
              <Text style={styles.emptySearch}>{t('screens.search.noArtists', 'Không tìm thấy nghệ sĩ')}</Text>
            ) : null}

            <View style={styles.artistGrid}>
              {displayArtists.map(artist => (
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
                  colors={[themeColors.accent, themeColors.accentAlt]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.btnGradient}
              >
                {submitting
                    ? <ActivityIndicator color={themeColors.white} />
                    : <Text style={styles.finishBtnText}>{t('screens.onboarding.finish')} ✓</Text>
                }
              </LinearGradient>
            </Pressable>
          </View>
        </ScrollView>
      </View>
  );
};

const createStyles = (colors: ColorScheme) => StyleSheet.create({
    skipBtn: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.glass10,
  },
  skipText: { color: colors.glass45, fontWeight: '600', fontSize: 15 },
  root: { flex: 1, backgroundColor: colors.bg },
  loadingText: { color: colors.glass40, marginTop: 12 },

  gradientTop: { paddingHorizontal: 24, paddingBottom: 32 },

  stepRow: { flexDirection: 'row', gap: 8, marginTop: 20, marginBottom: 24 },
  stepDotActive: { width: 24, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.glass20 },

  emoji: { fontSize: 44, marginBottom: 14 },
  title: { color: colors.white, fontSize: 30, fontWeight: '800', lineHeight: 38, marginBottom: 10 },
  subtitle: { color: colors.glass50, fontSize: 15, lineHeight: 22 },

  body: { paddingHorizontal: 20, paddingTop: 24 },

  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  countLabel: { color: colors.white, fontSize: 16, fontWeight: '700' },
  countBadge: {
    backgroundColor: colors.accentFill25,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.accentBorder30,
  },
  countBadgeText: { color: colors.accent, fontWeight: '700', fontSize: 13 },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.glass12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: colors.white,
    fontSize: 15,
    paddingVertical: 0,
  },
  searchLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  searchLoadingText: { color: colors.glass45, fontSize: 13 },
  emptySearch: { color: colors.glass45, fontSize: 14, marginBottom: 12, textAlign: 'center' },

  artistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 28,
  },

  finishBtn: { borderRadius: 999, overflow: 'hidden' },
  btnDisabled: { opacity: 0.5 },
  btnGradient: { minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  finishBtnText: { color: colors.white, fontWeight: '800', fontSize: 16 },
});
