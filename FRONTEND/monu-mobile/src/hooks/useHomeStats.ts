/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Monu – Home Stats Hook
 * Fetches personalized home screen data: most played playlists, favorite albums,
 * top artists, and trending genres with caching
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getPopularArtists, getPopularGenres } from '../services/favorites';
import { getAlbumById, getMyPlaylists, getPublicAlbums, searchSongs } from '../services/music';
import { getListeningInsights } from '../services/recommendation';
import { getArtistStatsBatch, getMyFollowedArtists, getMyListenHistory } from '../services/social';

const STORAGE_KEY = 'home_stats_cache';

export interface PlaylistStats {
  id: string;
  name: string;
  description?: string;
  songCount: number;
  coverImageUrl?: string;
  playCount: number;
  avgPlayTime?: number;
}

export interface AlbumStats {
  id: string;
  title: string;
  artist: string;
  coverImageUrl?: string;
  releaseDate?: string;
  songCount: number;
  playCount: number;
  userPlayCount?: number;
}

export interface ArtistStats {
  id: string;
  name: string;
  avatarUrl?: string;
  followerCount: number;
  playCount: number;
  isFollowing?: boolean;
}

export interface GenreStats {
  id: string;
  name: string;
  iconUrl?: string;
  trendingRank?: number;
  topSongsCount: number;
}

interface HomeStatsData {
  mostPlayedPlaylists: PlaylistStats[];
  favoriteAlbums: AlbumStats[];
  followedArtistAlbums: AlbumStats[];
  topArtists: ArtistStats[];
  trendingGenres: GenreStats[];
}

interface UseHomeStatsReturn {
  data: HomeStatsData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let cachedData: HomeStatsData | null = null;
let cacheTimestamp: number = 0;

const LISTEN_HISTORY_LIMIT = 200;

const normalizeId = (value?: string | null): string | null => {
  if (!value) return null;
  if (value.length >= 24 && value.startsWith('ObjectId(')) {
    return value.substring(9, value.length - 2);
  }
  return value;
};

const fetchHomeStats = async (): Promise<HomeStatsData> => {
  // Check cache first
  const now = Date.now();
  if (cachedData && now - cacheTimestamp < CACHE_DURATION) {
    return cachedData;
  }

  try {
    const [listenHistoryPage, playlistsPage, insights, popularGenres, popularArtists, followedArtistsPage] = await Promise.all([
      getMyListenHistory({ page: 1, size: LISTEN_HISTORY_LIMIT }),
      getMyPlaylists({ page: 1, size: 50 }),
      getListeningInsights(30),
      getPopularGenres(12),
      getPopularArtists(8),
      getMyFollowedArtists({ page: 1, size: 100 }),
    ]);

    const listenHistory = listenHistoryPage.content ?? [];
    const playlists = playlistsPage.content ?? [];

    const followedArtistIds = new Set((followedArtistsPage.content ?? []).map((f) => normalizeId(f.artistId)).filter((id): id is string => !!id));

    const playlistAgg = new Map<string, { playCount: number; totalDuration: number }>();
    const albumAgg = new Map<string, { playCount: number; totalDuration: number }>();

    listenHistory.forEach((item) => {
      const playlistId = normalizeId(item.playlistId);
      if (playlistId) {
        const current = playlistAgg.get(playlistId) ?? { playCount: 0, totalDuration: 0 };
        playlistAgg.set(playlistId, {
          playCount: current.playCount + 1,
          totalDuration: current.totalDuration + (item.durationSeconds ?? 0),
        });
      }

      const albumId = normalizeId(item.albumId);
      if (albumId) {
        const current = albumAgg.get(albumId) ?? { playCount: 0, totalDuration: 0 };
        albumAgg.set(albumId, {
          playCount: current.playCount + 1,
          totalDuration: current.totalDuration + (item.durationSeconds ?? 0),
        });
      }
    });

    const mostPlayedPlaylists: PlaylistStats[] = playlists
      .map((playlist) => {
        const stat = playlistAgg.get(playlist.id);
        const playCount = stat?.playCount ?? 0;
        const avgPlayTime = stat?.playCount
          ? Math.round((stat.totalDuration / stat.playCount) / 60)
          : undefined;

        return {
          id: playlist.id,
          name: playlist.name,
          description: playlist.description,
          songCount: playlist.totalSongs ?? playlist.songs?.length ?? 0,
          coverImageUrl: playlist.coverUrl,
          playCount,
          avgPlayTime,
        };
      })
      .sort((a, b) => {
        if (b.playCount !== a.playCount) return b.playCount - a.playCount;
        return (b.songCount ?? 0) - (a.songCount ?? 0);
      })
      .slice(0, 5);

    const albumIds = Array.from(albumAgg.keys()).slice(0, 20);
    const albumDetailResults = await Promise.allSettled(
      albumIds.map((albumId) => getAlbumById(albumId)),
    );

    const mappedFavoriteAlbums: Array<AlbumStats | null> = albumDetailResults
      .map((result, index) => {
        if (result.status !== 'fulfilled') return null;
        const album = result.value;

        const albumId = albumIds[index];
        const stats = albumAgg.get(albumId);

        return {
          id: album.id,
          title: album.title,
          artist: album.ownerStageName ?? 'Unknown artist',
          coverImageUrl: album.coverUrl,
          releaseDate: album.releaseDate,
          songCount: album.totalSongs ?? 0,
          playCount: Math.max(0, Math.round((stats?.totalDuration ?? 0) / 60)),
          userPlayCount: stats?.playCount ?? 0,
        };
      });

    let favoriteAlbums: AlbumStats[] = mappedFavoriteAlbums
      .filter((album): album is AlbumStats => album !== null)
      .sort((a, b) => (b.userPlayCount ?? 0) - (a.userPlayCount ?? 0))
      .slice(0, 5);

    if (favoriteAlbums.length === 0) {
      const publicAlbumsPage = await getPublicAlbums({ page: 1, size: 5 });
      favoriteAlbums = (publicAlbumsPage.content ?? []).map((album) => ({
        id: album.id,
        title: album.title,
        artist: album.ownerStageName ?? 'Unknown artist',
        coverImageUrl: album.coverUrl,
        releaseDate: album.releaseDate,
        songCount: album.totalSongs ?? 0,
        playCount: 0,
        userPlayCount: 0,
      }));
    }

    const topArtistRows = insights.topArtists ?? [];
    const topArtistIds = topArtistRows.map((a) => a.artistId);
    const batchStats = topArtistIds.length
      ? await getArtistStatsBatch(topArtistIds).catch(() => [])
      : [];
    const statsMap = new Map(batchStats.map((s) => [s.artistId, s]));

    let topArtists: ArtistStats[] = topArtistRows.map((artist) => {
      const s = statsMap.get(artist.artistId);
      return {
        id: artist.artistId,
        name: artist.artistStageName,
        avatarUrl: artist.artistAvatarUrl,
        followerCount: s?.followerCount ?? 0,
        playCount: artist.playCount,
        isFollowing: followedArtistIds.has(artist.artistId),
      };
    });

    if (topArtists.length === 0) {
      const fallbackIds = popularArtists.map((a) => a.id);
      const fallbackStats = fallbackIds.length
        ? await getArtistStatsBatch(fallbackIds).catch(() => [])
        : [];
      const fbMap = new Map(fallbackStats.map((s) => [s.artistId, s]));

      topArtists = popularArtists.map((artist) => {
        const s = fbMap.get(artist.id);
        return {
          id: artist.id,
          name: artist.stageName,
          avatarUrl: artist.avatarUrl,
          followerCount: s?.followerCount ?? 0,
          playCount: s?.totalListens ?? 0,
          isFollowing: followedArtistIds.has(artist.id),
        };
      }).slice(0, 5);
    }

    const genreSongCounts = await Promise.allSettled(
      popularGenres.map((genre) => searchSongs({ genreId: genre.id, page: 1, size: 1 })),
    );

    const trendingGenres: GenreStats[] = popularGenres.map((genre, index) => ({
      id: genre.id,
      name: genre.name,
      iconUrl: undefined,
      trendingRank: index + 1,
      topSongsCount: genreSongCounts[index].status === 'fulfilled'
        ? genreSongCounts[index].value.totalElements ?? 0
        : 0,
    }));

    const followedArtistAlbumsResults = await Promise.allSettled(
      Array.from(followedArtistIds)
        .slice(0, 20)
        .map((artistId) => getPublicAlbums({ page: 1, size: 4, artistId })),
    );

    const followedArtistAlbumsMap = new Map<string, AlbumStats>();

    followedArtistAlbumsResults.forEach((result) => {
      if (result.status !== 'fulfilled') return;

      (result.value.content ?? [])
        .filter((album) => album.status === 'PUBLIC')
        .forEach((album) => {
          if (!album.id || followedArtistAlbumsMap.has(album.id)) return;

          followedArtistAlbumsMap.set(album.id, {
            id: album.id,
            title: album.title,
            artist: album.ownerStageName ?? 'Unknown artist',
            coverImageUrl: album.coverUrl,
            releaseDate: album.releaseDate,
            songCount: album.totalSongs ?? 0,
            playCount: 0,
            userPlayCount: 0,
          });
        });
    });

    const followedArtistAlbums = Array.from(followedArtistAlbumsMap.values())
      .sort((a, b) => {
        const aTime = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
        const bTime = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 8);

    const data: HomeStatsData = {
      mostPlayedPlaylists,
      favoriteAlbums,
      followedArtistAlbums,
      topArtists,
      trendingGenres,
    };

    // Update cache
    cachedData = data;
    cacheTimestamp = now;

    return data;
  } catch (error) {
    console.error('[useHomeStats] Failed to fetch home stats:', error);
    throw error;
  }
};

/**
 * Hook to fetch and manage home screen statistics
 * Provides data for most played playlists, favorite albums, top artists, and trending genres
 */
export const useHomeStats = (): UseHomeStatsReturn => {
  const [data, setData] = useState<HomeStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const freshData = await fetchHomeStats();
      setData(freshData);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(freshData)).catch(() => {});
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch home stats';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const cached = await AsyncStorage.getItem(STORAGE_KEY);
        if (cached && !cancelled) {
          setData(JSON.parse(cached));
          setLoading(false);
        }
      } catch {}

      if (!cancelled) refetch();
    })();

    return () => { cancelled = true; };
  }, [refetch]);

  return {
    data,
    loading,
    error,
    refetch,
  };
};

export default useHomeStats;
