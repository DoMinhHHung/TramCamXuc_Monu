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
  pageable: { pageNumber: number; pageSize: number };
  totalElements: number;
  totalPages: number;
  last: boolean;
  first: boolean;
  empty: boolean;
}

// ─── Music API ────────────────────────────────────────────────────────────────

/** GET /songs?keyword=&genreId=&artistId=&page=1&size=20 */
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

/** GET /artists?keyword=&page=&size= */
export const searchArtists = async (params: {
  keyword?: string;
  page?: number;
  size?: number;
}): Promise<PageResponse<Artist>> => {
  const response = await apiClient.get<PageResponse<Artist>>('/artists', { params });
  return response.data;
};

/** GET /songs/trending */
export const getTrendingSongs = async (params?: {
  page?: number;
  size?: number;
}): Promise<PageResponse<Song>> => {
  const response = await apiClient.get<PageResponse<Song>>('/songs/trending', { params });
  return response.data;
};

/** GET /songs/newest */
export const getNewestSongs = async (params?: {
  page?: number;
  size?: number;
}): Promise<PageResponse<Song>> => {
  const response = await apiClient.get<PageResponse<Song>>('/songs/newest', { params });
  return response.data;
};

/** GET /songs/{songId} */
export const getSongById = async (songId: string): Promise<Song> => {
  const response = await apiClient.get<Song>(`/songs/${songId}`);
  return response.data;
};

/** GET /songs/by-artist/{artistId} */
export const getSongsByArtist = async (
    artistId: string,
    params?: { page?: number; size?: number },
): Promise<PageResponse<Song>> => {
  const response = await apiClient.get<PageResponse<Song>>(
      `/songs/by-artist/${artistId}`, { params },
  );
  return response.data;
};

/** GET /songs/{songId}/stream */
export const getStreamUrl = async (songId: string): Promise<string> => {
  const response = await apiClient.get<string>(`/songs/${songId}/stream`);
  return response.data;
};

/**
 * POST /songs/{songId}/play
 * Gọi ngay khi bắt đầu stream — tính play count.
 */
export const recordPlay = async (songId: string): Promise<void> => {
  await apiClient.post(`/songs/${songId}/play`);
};

/**
 * POST /songs/{songId}/listen
 * Gọi khi user nghe đủ 30s HOẶC khi bài kết thúc.
 *
 * @param completed  true nếu user nghe ≥ 90% bài
 * @param artistId   primary artist id (backend có thể tự look-up, nhưng gửi kèm để analytics nhanh hơn)
 * @param genreIds   comma-separated genre ids
 * @param durationSeconds  tổng giây nghe thực sự (không tính pause)
 */
export const recordListen = async (
    songId: string,
    params?: {
      playlistId?: string;
      albumId?: string;
      durationSeconds?: number;
      completed?: boolean;
      artistId?: string;
      genreIds?: string;
    },
): Promise<void> => {
  await apiClient.post(`/songs/${songId}/listen`, null, { params });
};

/** GET /songs/batch?ids=id1,id2,... */
export const getSongsByIds = async (ids: string[]): Promise<Song[]> => {
  const response = await apiClient.get<Song[]>('/songs/batch', {
    params: { ids: ids.join(',') },
  });
  return response.data;
};