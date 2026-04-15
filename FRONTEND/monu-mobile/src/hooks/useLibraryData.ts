import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';
import { getMyAlbums, getMyPlaylists, getMySongs, type Album, type Playlist, type Song } from '../services/music';
import { getMySubscription } from '../services/payment';
import type { AuthSession } from '../types/auth';
import { fetchWithRetry, loadCache, saveCache } from '../utils/swrCache';

const STALE_MS = 90_000;
const CACHE_GC_MS = 10 * 60 * 1000;
const CACHE_STORAGE_TTL_MS = 5 * 60 * 1000;

export type LibraryArtistProfile = {
  id: string;
  stageName?: string;
  status?: 'ACTIVE' | 'PENDING' | 'BANNED' | 'REJECTED';
};

export type LibraryData = {
  playlists: Playlist[];
  songs: Song[];
  albums: Album[];
  artistProfile: LibraryArtistProfile | null;
  hasActiveSub: boolean;
  canCreateAlbumByPlan: boolean;
};

type LibraryCachePayload = LibraryData & {
  updatedAt: number;
};

export const getLibraryQueryKey = (authSession?: AuthSession | null) => [
  'library',
  authSession?.profile?.id ?? authSession?.tokens?.accessToken?.slice(-24) ?? 'anonymous',
] as const;

const getLibraryCacheStorageKey = (userScope: string) => `library.cache.${userScope}`;

export async function fetchAllLibraryData(authSession: AuthSession | null): Promise<LibraryData> {
  const userScope = authSession?.profile?.id ?? authSession?.tokens?.accessToken?.slice(-24) ?? 'anonymous';
  const cacheKey = getLibraryCacheStorageKey(userScope);
  const cached = await loadCache<LibraryCachePayload>(cacheKey);

  if (cached && Date.now() - cached.data.updatedAt < CACHE_STORAGE_TTL_MS) {
    return {
      playlists: cached.data.playlists ?? [],
      songs: cached.data.songs ?? [],
      albums: cached.data.albums ?? [],
      artistProfile: cached.data.artistProfile ?? null,
      hasActiveSub: !!cached.data.hasActiveSub,
      canCreateAlbumByPlan: !!cached.data.canCreateAlbumByPlan,
    };
  }

  const [plRes, soRes, alRes, artistRes, subRes] = await Promise.allSettled([
    fetchWithRetry(() => getMyPlaylists({ page: 1, size: 50 }), 2),
    fetchWithRetry(() => getMySongs({ page: 1, size: 50 }), 2),
    fetchWithRetry(() => getMyAlbums({ page: 1, size: 50 }), 2),
    fetchWithRetry(() => apiClient.get<LibraryArtistProfile>('/artists/me'), 1),
    fetchWithRetry(() => getMySubscription(), 1),
  ]);

  const nextPlaylists = plRes.status === 'fulfilled' ? (plRes.value.content ?? []) : (cached?.data.playlists ?? []);
  const nextSongs = soRes.status === 'fulfilled' ? (soRes.value.content ?? []) : (cached?.data.songs ?? []);
  const nextAlbums = alRes.status === 'fulfilled' ? (alRes.value.content ?? []) : (cached?.data.albums ?? []);
  const nextArtist = artistRes.status === 'fulfilled' ? (artistRes.value.data ?? null) : (cached?.data.artistProfile ?? null);

  let nextHasActiveSub = cached?.data.hasActiveSub ?? false;
  let nextCanCreateAlbumByPlan = cached?.data.canCreateAlbumByPlan ?? false;
  if (subRes.status === 'fulfilled') {
    const sub = subRes.value;
    const active =
      sub?.status === 'ACTIVE' &&
      Boolean(sub.expiresAt) &&
      new Date(sub.expiresAt as string).getTime() > Date.now();
    const features = sub?.plan?.features ?? {};
    const hasAlbumFeature = Boolean(features.create_album ?? features.can_become_artist);
    nextHasActiveSub = active;
    nextCanCreateAlbumByPlan = active && hasAlbumFeature;
  }

  const nextPayload: LibraryData = {
    playlists: nextPlaylists,
    songs: nextSongs,
    albums: nextAlbums,
    artistProfile: nextArtist,
    hasActiveSub: nextHasActiveSub,
    canCreateAlbumByPlan: nextCanCreateAlbumByPlan,
  };

  if (plRes.status === 'fulfilled' || soRes.status === 'fulfilled' || alRes.status === 'fulfilled' || artistRes.status === 'fulfilled' || subRes.status === 'fulfilled') {
    void saveCache(cacheKey, {
      ...nextPayload,
      updatedAt: Date.now(),
    });
  }

  return nextPayload;
}

export function useLibraryData() {
  const { authSession } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = getLibraryQueryKey(authSession);

  const query = useQuery({
    queryKey,
    queryFn: () => fetchAllLibraryData(authSession),
    enabled: Boolean(authSession),
    staleTime: STALE_MS,
    gcTime: CACHE_GC_MS,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });

  const prefetch = () => {
    if (!authSession) return Promise.resolve();

    return queryClient.prefetchQuery({
      queryKey,
      queryFn: () => fetchAllLibraryData(authSession),
      staleTime: STALE_MS,
      gcTime: CACHE_GC_MS,
    });
  };

  return {
    data: query.data ?? null,
    isFetching: query.isFetching,
    prefetch,
  };
}