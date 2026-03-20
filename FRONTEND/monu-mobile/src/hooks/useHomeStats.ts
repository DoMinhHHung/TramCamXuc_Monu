/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Monu – Home Stats Hook
 * Fetches personalized home screen data: most played playlists, favorite albums,
 * top artists, and trending genres with caching
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback } from 'react';

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

/**
 * Mock implementation for home stats API calls
 * Replace with actual API calls when backend is ready
 */
const fetchHomeStats = async (): Promise<HomeStatsData> => {
  // Check cache first
  const now = Date.now();
  if (cachedData && now - cacheTimestamp < CACHE_DURATION) {
    return cachedData;
  }

  try {
    // Mock API responses - replace with actual API calls
    // Simulating: GET /users/me/stats/most-played-playlists
    const mostPlayedPlaylists: PlaylistStats[] = [
      {
        id: 'playlist_1',
        name: 'Chill Vibes',
        description: 'Your personal chill collection',
        songCount: 45,
        coverImageUrl: undefined,
        playCount: 320,
        avgPlayTime: 28,
      },
      {
        id: 'playlist_2',
        name: 'Workout Mix',
        description: 'High energy tracks for workouts',
        songCount: 38,
        coverImageUrl: undefined,
        playCount: 250,
        avgPlayTime: 45,
      },
      {
        id: 'playlist_3',
        name: 'Late Night Drives',
        description: 'Perfect for late night drives',
        songCount: 52,
        coverImageUrl: undefined,
        playCount: 180,
        avgPlayTime: 35,
      },
    ];

    // Simulating: GET /users/me/stats/favorite-albums
    const favoriteAlbums: AlbumStats[] = [
      {
        id: 'album_1',
        title: 'Midnight Dreams',
        artist: 'The Nocturnes',
        coverImageUrl: undefined,
        releaseDate: '2024-01-15',
        songCount: 12,
        playCount: 500,
        userPlayCount: 125,
      },
      {
        id: 'album_2',
        title: 'Electric Soul',
        artist: 'Luna Echo',
        coverImageUrl: undefined,
        releaseDate: '2023-09-20',
        songCount: 14,
        playCount: 450,
        userPlayCount: 98,
      },
      {
        id: 'album_3',
        title: 'Acoustic Journey',
        artist: 'The Wanderers',
        coverImageUrl: undefined,
        releaseDate: '2024-02-10',
        songCount: 11,
        playCount: 320,
        userPlayCount: 75,
      },
    ];

    // Simulating: GET /users/me/stats/top-artists
    const topArtists: ArtistStats[] = [
      {
        id: 'artist_1',
        name: 'The Nocturnes',
        avatarUrl: undefined,
        followerCount: 45600,
        playCount: 850,
        isFollowing: true,
      },
      {
        id: 'artist_2',
        name: 'Luna Echo',
        avatarUrl: undefined,
        followerCount: 32400,
        playCount: 720,
        isFollowing: true,
      },
      {
        id: 'artist_3',
        name: 'Sonic Dreamers',
        avatarUrl: undefined,
        followerCount: 28900,
        playCount: 650,
        isFollowing: false,
      },
      {
        id: 'artist_4',
        name: 'The Wanderers',
        avatarUrl: undefined,
        followerCount: 19200,
        playCount: 580,
        isFollowing: true,
      },
    ];

    // Simulating: GET /genres/trending
    const trendingGenres: GenreStats[] = [
      {
        id: 'genre_1',
        name: 'Lo-fi Hip Hop',
        iconUrl: undefined,
        trendingRank: 1,
        topSongsCount: 45,
      },
      {
        id: 'genre_2',
        name: 'Indie Pop',
        iconUrl: undefined,
        trendingRank: 2,
        topSongsCount: 38,
      },
      {
        id: 'genre_3',
        name: 'Synthwave',
        iconUrl: undefined,
        trendingRank: 3,
        topSongsCount: 32,
      },
      {
        id: 'genre_4',
        name: 'Ambient',
        iconUrl: undefined,
        trendingRank: 4,
        topSongsCount: 28,
      },
    ];

    const data: HomeStatsData = {
      mostPlayedPlaylists,
      favoriteAlbums,
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
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch home stats';
      setError(errorMessage);
      console.error('[useHomeStats] Error:', errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    data,
    loading,
    error,
    refetch,
  };
};

export default useHomeStats;
