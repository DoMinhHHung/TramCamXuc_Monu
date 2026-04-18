import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
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

const FETCH_PAGE_SIZE = 50;
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

function itemsPerPageForWidth(screenWidth: number): number {
  const cols = screenWidth >= 360 ? 3 : 2;
  return cols * 6;
}

export const SelectArtistsScreen = ({ route }: { route: { params: { selectedGenreIds: string[] } } }) => {
  const navigation = useNavigation<Nav>();
  const { refreshProfile } = useAuth();
  const { t } = useTranslation();
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const themeColors = useThemeColors();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const selectedGenres = route.params?.selectedGenreIds ?? [];

  const itemsPerPage = useMemo(() => itemsPerPageForWidth(windowWidth), [windowWidth]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [catalogArtists, setCatalogArtists] = useState<Artist[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<Artist[] | null>(null);
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);
  const [listPage, setListPage] = useState(0);
  const myArtistRef = useRef<Artist | null>(null);
  const searchReq = useRef(0);

  const loadArtists = useCallback(async () => {
    try {
      setLoading(true);
      const merged = new Map<string, Artist>();
      let page = 1;
      let last = false;

      while (!last && page < MAX_CATALOG_PAGES) {
        const res = await searchArtists({ page, size: FETCH_PAGE_SIZE });
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

  useEffect(() => {
    setListPage(0);
  }, [searchQuery]);

  const displayArtists = searchQuery.trim() ? (searchResults ?? []) : catalogArtists;

  const totalPages = Math.max(1, Math.ceil(displayArtists.length / itemsPerPage));
  const safePage = Math.min(listPage, totalPages - 1);
  const pageSlice = useMemo(() => {
    const start = safePage * itemsPerPage;
    return displayArtists.slice(start, start + itemsPerPage);
  }, [displayArtists, safePage, itemsPerPage]);

  useEffect(() => {
    if (listPage !== safePage) setListPage(safePage);
  }, [listPage, safePage]);

  const toggleArtist = (id: string) => {
    if (selectedArtists.includes(id)) {
      setSelectedArtists(selectedArtists.filter((a) => a !== id));
      return;
    }
    if (selectedArtists.length >= MAX_ARTISTS) {
      Alert.alert(
        t('screens.onboarding.limitTitle'),
        t('screens.onboarding.maxArtists').replace('{max}', String(MAX_ARTISTS)),
      );
      return;
    }
    setSelectedArtists([...selectedArtists, id]);
  };

  const persistAndExit = async (artistIds: string[]) => {
    try {
      setSubmitting(true);
      await updateMyFavorites({ favoriteGenreIds: selectedGenres, favoriteArtistIds: artistIds });
      await refreshProfile();
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.message || t('errors.somethingWentWrong'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinish = async () => {
    if (selectedArtists.length < MIN_ARTISTS) {
      Alert.alert(
        t('common.error'),
        t('screens.onboarding.minArtists').replace('{min}', String(MIN_ARTISTS)),
      );
      return;
    }
    await persistAndExit(selectedArtists);
  };


  if (loading) {
    return (
      <View style={[styles.root, styles.centered]}>
        <ActivityIndicator size="large" color={themeColors.accent} />
        <Text style={styles.loadingText}>{t('screens.onboarding.loadingArtists')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <LinearGradient
        colors={[themeColors.gradIndigo, themeColors.bg]}
        style={[styles.hero, { paddingTop: insets.top + 10 }]}
      >
        <BackButton onPress={() => navigation.goBack()} />
        <View style={styles.stepRow}>
          <View style={styles.stepDot} />
          <View style={styles.stepDotActive} />
        </View>
        <Text style={styles.emoji}>{ONBOARDING_EMOJIS.artist}</Text>
        <Text style={styles.title}>{t('onboarding.selectArtistsTitle')}</Text>
        <Text style={styles.subtitle}>{t('onboarding.selectArtistsSubtitle')}</Text>
      </LinearGradient>

      <View style={styles.chrome}>
        <View style={styles.countRow}>
          <Text style={styles.countLabel}>
            {t('onboarding.selectCount')
              .replace('{min}', String(MIN_ARTISTS))
              .replace('{max}', String(MAX_ARTISTS))}
          </Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>
              {t('onboarding.selected')
                .replace('{count}', String(selectedArtists.length))
                .replace('{max}', String(MAX_ARTISTS))}
            </Text>
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

        <View style={styles.pageNav}>
          <Pressable
            onPress={() => setListPage((p) => Math.max(0, p - 1))}
            disabled={safePage <= 0}
            style={({ pressed }) => [
              styles.pageBtn,
              safePage <= 0 && styles.pageBtnDisabled,
              pressed && safePage > 0 && { opacity: 0.75 },
            ]}
          >
            <MaterialIcons name="chevron-left" size={22} color={themeColors.text} />
            <Text style={[styles.pageBtnLabel, safePage <= 0 && styles.pageBtnLabelDisabled]}>
              {t('onboarding.prevPage')}
            </Text>
          </Pressable>
          <View style={styles.pagePill}>
            <Text style={styles.pagePillText}>
              {t('onboarding.artistsPage').replace('{current}', String(safePage + 1)).replace('{total}', String(totalPages))}
            </Text>
          </View>
          <Pressable
            onPress={() => setListPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePage >= totalPages - 1}
            style={({ pressed }) => [
              styles.pageBtn,
              safePage >= totalPages - 1 && styles.pageBtnDisabled,
              pressed && safePage < totalPages - 1 && { opacity: 0.75 },
            ]}
          >
            <Text style={[styles.pageBtnLabel, safePage >= totalPages - 1 && styles.pageBtnLabelDisabled]}>
              {t('onboarding.nextPage')}
            </Text>
            <MaterialIcons name="chevron-right" size={22} color={themeColors.text} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.listScroll}
        contentContainerStyle={styles.listScrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {searchLoading ? (
          <View style={styles.searchLoadingRow}>
            <ActivityIndicator size="small" color={themeColors.accent} />
            <Text style={styles.searchLoadingText}>{t('screens.search.searching', 'Searching…')}</Text>
          </View>
        ) : null}

        {!searchLoading && searchQuery.trim() && displayArtists.length === 0 ? (
          <Text style={styles.emptySearch}>{t('screens.search.noArtists', 'No artists found')}</Text>
        ) : null}

        <View style={styles.gridCard}>
          <View style={styles.artistGrid}>
            {pageSlice.map((artist) => (
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
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Pressable
          style={({ pressed }) => [
            styles.finishBtn,
            (submitting || selectedArtists.length < MIN_ARTISTS) && styles.btnDisabled,
            pressed && { opacity: 0.88 },
          ]}
          onPress={() => void handleFinish()}
          disabled={submitting || selectedArtists.length < MIN_ARTISTS}
        >
          <LinearGradient
            colors={[themeColors.accent, themeColors.accentAlt]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btnGradient}
          >
            {submitting ? (
              <ActivityIndicator color={themeColors.white} />
            ) : (
              <Text style={styles.finishBtnText}>{t('screens.onboarding.finish')} ✓</Text>
            )}
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
};

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    centered: { alignItems: 'center', justifyContent: 'center' },
    loadingText: { color: colors.glass40, marginTop: 12 },

    hero: {
      paddingHorizontal: 22,
      paddingBottom: 20,
    },
    stepRow: { flexDirection: 'row', gap: 8, marginTop: 14, marginBottom: 16 },
    stepDotActive: { width: 24, height: 8, borderRadius: 4, backgroundColor: colors.accent },
    stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.glass20 },
    emoji: { fontSize: 40, marginBottom: 10 },
    title: { color: colors.white, fontSize: 26, fontWeight: '800', lineHeight: 32, marginBottom: 6 },
    subtitle: { color: colors.glass50, fontSize: 14, lineHeight: 20, maxWidth: 340 },

    chrome: {
      paddingHorizontal: 18,
      paddingTop: 14,
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderSubtle,
      backgroundColor: colors.bg,
    },
    countRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    countLabel: { color: colors.white, fontSize: 15, fontWeight: '700' },
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
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 11,
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
    pageNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    pageBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.glass12,
    },
    pageBtnDisabled: { opacity: 0.38 },
    pageBtnLabel: { color: colors.text, fontWeight: '600', fontSize: 13 },
    pageBtnLabelDisabled: { color: colors.muted },
    pagePill: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 14,
      backgroundColor: colors.accentFill20,
      borderWidth: 1,
      borderColor: colors.accentBorder25,
    },
    pagePillText: { color: colors.accent, fontWeight: '800', fontSize: 13 },

    listScroll: { flex: 1 },
    listScrollContent: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 16 },
    searchLoadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    searchLoadingText: { color: colors.glass45, fontSize: 13 },
    emptySearch: { color: colors.glass45, fontSize: 14, marginBottom: 12, textAlign: 'center' },
    gridCard: {
      borderRadius: 18,
      overflow: 'hidden',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 10,
      paddingHorizontal: 6,
    },
    artistGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-around',
    },

    footer: {
      paddingHorizontal: 18,
      paddingTop: 12,
      gap: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.borderSubtle,
      backgroundColor: colors.surfaceLow,
    },
    skipOutline: {
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.glass15,
      backgroundColor: colors.glass04,
    },
    skipOutlineText: { color: colors.glass60, fontWeight: '600', fontSize: 15 },
    finishBtn: { borderRadius: 999, overflow: 'hidden' },
    btnDisabled: { opacity: 0.45 },
    btnGradient: { minHeight: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
    finishBtnText: { color: colors.white, fontWeight: '800', fontSize: 16 },
  });
