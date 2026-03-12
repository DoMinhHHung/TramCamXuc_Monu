import { apiClient } from './api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Artist {
  artistId: string;
  stageName: string;
  avatarUrl?: string;
}

export interface Genre {
  id: string;
  name: string;
  description?: string;
}

export interface Song {
  id: string;
  title: string;
  primaryArtist: Artist;
  genres: Genre[];
  thumbnailUrl?: string;
  durationSeconds: number;
  playCount: number;
  status: 'DRAFT' | 'PUBLIC' | 'ARCHIVED';
  transcodeStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  streamUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PageResponse<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
  };
  totalElements: number;
  totalPages: number;
  last: boolean;
  first: boolean;
  empty: boolean;
}

// ─── Music API ────────────────────────────────────────────────────────────────

/**
 * Search songs with filters
 * GET /songs?keyword=&genreId=&artistId=&page=1&size=20
 */
export const searchSongs = async (params: {
  keyword?: string;
  genreId?: string;
  artistId?: string;
  page?: number;
  size?: number;
}): Promise<PageResponse<Song>> => {
  const response = await apiClient.get<PageResponse<Song>>('/songs', { params });
  return response.data;
};

/**
 * Get trending songs
 * GET /songs/trending
 */
export const getTrendingSongs = async (params?: {
  page?: number;
  size?: number;
}): Promise<PageResponse<Song>> => {
  const response = await apiClient.get<PageResponse<Song>>('/songs/trending', { params });
  return response.data;
};

/**
 * Get newest songs
 * GET /songs/newest
 */
export const getNewestSongs = async (params?: {
  page?: number;
  size?: number;
}): Promise<PageResponse<Song>> => {
  const response = await apiClient.get<PageResponse<Song>>('/songs/newest', { params });
  return response.data;
};

/**
 * Get song by ID
 * GET /songs/{songId}
 */
export const getSongById = async (songId: string): Promise<Song> => {
  const response = await apiClient.get<Song>(`/songs/${songId}`);
  return response.data;
};

/**
 * Get songs by artist
 * GET /songs/by-artist/{artistId}
 */
export const getSongsByArtist = async (
  artistId: string,
  params?: { page?: number; size?: number }
): Promise<PageResponse<Song>> => {
  const response = await apiClient.get<PageResponse<Song>>(`/songs/by-artist/${artistId}`, {
    params,
  });
  return response.data;
};

/**
 * Get stream URL for authenticated user
 * GET /songs/{songId}/stream
 */
export const getStreamUrl = async (songId: string): Promise<string> => {
  const response = await apiClient.get<string>(`/songs/${songId}/stream`);
  return response.data;
};

/**
 * Record play count (public)
 * POST /songs/{songId}/play
 */
export const recordPlay = async (songId: string): Promise<void> => {
  await apiClient.post(`/songs/${songId}/play`);
};

/**
 * Record listen event
 * POST /songs/{songId}/listen
 */
export const recordListen = async (
  songId: string,
  params?: {
    playlistId?: string;
    albumId?: string;
    durationSeconds?: number;
  }
): Promise<void> => {
  await apiClient.post(`/songs/${songId}/listen`, null, { params });
};

/**
 * Batch fetch songs by IDs
 * GET /songs/batch?ids=id1,id2,...
 */
export const getSongsByIds = async (ids: string[]): Promise<Song[]> => {
  const response = await apiClient.get<Song[]>('/songs/batch', {
    params: { ids: ids.join(',') },
  });
  return response.data;
};
