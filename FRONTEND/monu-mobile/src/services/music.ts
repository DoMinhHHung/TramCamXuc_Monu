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
  status: 'DRAFT' | 'PUBLIC' | 'ARCHIVED' | 'PRIVATE';
  transcodeStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  streamUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Playlist {
  id: string;
  userId: string;
  name: string;
  description?: string;
  slug: string;
  coverUrl?: string;
  visibility: 'PUBLIC' | 'PRIVATE' | 'COLLABORATIVE';
  songs: Song[];
  songCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Album {
  id: string;
  title: string;
  description?: string;
  coverUrl?: string;
  status: 'DRAFT' | 'PUBLIC' | 'PRIVATE';
  songs: Song[];
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

export interface PlaylistCreateRequest {
  name: string;
  description?: string;
  visibility: 'PUBLIC' | 'PRIVATE' | 'COLLABORATIVE';
}

// ─── Music API ────────────────────────────────────────────────────────────────

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

export const searchArtists = async (params: {
  keyword?: string;
  page?: number;
  size?: number;
}): Promise<PageResponse<Artist>> => {
  const response = await apiClient.get<PageResponse<Artist>>('/artists', { params });
  return response.data;
};

export const getTrendingSongs = async (params?: {
  page?: number;
  size?: number;
}): Promise<PageResponse<Song>> => {
  const response = await apiClient.get<PageResponse<Song>>('/songs/trending', { params });
  return response.data;
};

export const getNewestSongs = async (params?: {
  page?: number;
  size?: number;
}): Promise<PageResponse<Song>> => {
  const response = await apiClient.get<PageResponse<Song>>('/songs/newest', { params });
  return response.data;
};

export const getSongById = async (songId: string): Promise<Song> => {
  const response = await apiClient.get<Song>(`/songs/${songId}`);
  return response.data;
};

export const getSongsByArtist = async (
  artistId: string,
  params?: { page?: number; size?: number },
): Promise<PageResponse<Song>> => {
  const response = await apiClient.get<PageResponse<Song>>(
    `/songs/by-artist/${artistId}`, { params },
  );
  return response.data;
};

export const getStreamUrl = async (songId: string): Promise<string> => {
  const response = await apiClient.get<string>(`/songs/${songId}/stream`);
  return response.data;
};

export const recordPlay = async (songId: string): Promise<void> => {
  await apiClient.post(`/songs/${songId}/play`);
};

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

export const getSongsByIds = async (ids: string[]): Promise<Song[]> => {
  const response = await apiClient.get<Song[]>('/songs/batch', {
    params: { ids: ids.join(',') },
  });
  return response.data;
};

export const getMySongs = async (params?: { page?: number; size?: number }): Promise<PageResponse<Song>> => {
  const response = await apiClient.get<PageResponse<Song>>('/songs/my-songs', { params });
  return response.data;
};

export const getMyAlbums = async (params?: { page?: number; size?: number }): Promise<PageResponse<Album>> => {
  const response = await apiClient.get<PageResponse<Album>>('/albums/my', { params });
  return response.data;
};

export const getMyPlaylists = async (params?: { page?: number; size?: number }): Promise<PageResponse<Playlist>> => {
  const response = await apiClient.get<PageResponse<Playlist>>('/playlists/my-playlists', { params });
  return response.data;
};

export const createPlaylist = async (payload: PlaylistCreateRequest): Promise<Playlist> => {
  const response = await apiClient.post<Playlist>('/playlists', payload);
  return response.data;
};
