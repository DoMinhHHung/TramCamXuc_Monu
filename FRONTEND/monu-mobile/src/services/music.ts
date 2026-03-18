import { apiClient } from './api';

const unwrap = <T>(data: any): T => (data && typeof data === 'object' && 'result' in data ? (data as any).result as T : data as T);

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
  status: 'DRAFT' | 'PUBLIC' | 'ARCHIVED' | 'PRIVATE' | "DELETED";
  transcodeStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  streamUrl?: string;
  createdAt: string;
  updatedAt: string;
  uploadUrl?: string;
}

export interface PlaylistSong {
  playlistSongId: string;
  prevId?: string | null;
  nextId?: string | null;
  songId: string;
  title: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  playCount?: number;
  artistId?: string;
  artistStageName?: string;
}

export interface Playlist {
  id: string;
  name: string;
  slug: string;
  description?: string;
  coverUrl?: string;
  ownerId: string;
  visibility: 'PUBLIC' | 'PRIVATE' | 'COLLABORATIVE';
  totalSongs?: number;
  songs?: PlaylistSong[];
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

export const searchSongs = async (params: {
  keyword?: string;
  genreId?: string;
  artistId?: string;
  page?: number;
  size?: number;
}): Promise<PageResponse<Song>> => {
  const response = await apiClient.get<PageResponse<Song>>('/songs', { params });
  return unwrap<PageResponse<Song>>(response.data);
};

export const searchArtists = async (params: {
  keyword?: string;
  page?: number;
  size?: number;
}): Promise<PageResponse<Artist>> => {
  const response = await apiClient.get<PageResponse<Artist>>('/artists', { params });
  return unwrap<PageResponse<Artist>>(response.data);
};

export const getTrendingSongs = async (params?: {
  page?: number;
  size?: number;
}): Promise<PageResponse<Song>> => {
  const response = await apiClient.get<PageResponse<Song>>('/songs/trending', { params });
  return unwrap<PageResponse<Song>>(response.data);
};

export const getNewestSongs = async (params?: {
  page?: number;
  size?: number;
}): Promise<PageResponse<Song>> => {
  const response = await apiClient.get<PageResponse<Song>>('/songs/newest', { params });
  return unwrap<PageResponse<Song>>(response.data);
};

export const getSongById = async (songId: string): Promise<Song> => {
  const response = await apiClient.get<Song>(`/songs/${songId}`);
  return unwrap<Song>(response.data);
};

export const getSongsByArtist = async (
  artistId: string,
  params?: { page?: number; size?: number },
): Promise<PageResponse<Song>> => {
  const response = await apiClient.get<PageResponse<Song>>(`/songs/by-artist/${artistId}`, { params });
  return unwrap<PageResponse<Song>>(response.data);
};

export const getStreamUrl = async (songId: string): Promise<string> => {
  const response = await apiClient.get<string>(`/songs/${songId}/stream`);
  return unwrap<string>(response.data);
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
  return unwrap<Song[]>(response.data);
};

export const getMySongs = async (params?: { page?: number; size?: number; noCache?: boolean }): Promise<PageResponse<Song>> => {
  const { noCache, ...rest } = params ?? {};
  const response = await apiClient.get<PageResponse<Song>>('/songs/my-songs', {
    params: {
      page: rest.page,
      size: rest.size,
      ...(noCache ? { _ts: Date.now() } : {}),
    },
  });
  return unwrap<PageResponse<Song>>(response.data);
};

export const requestUploadSong = async (payload: { title: string; fileExtension: string; genreIds: string[] }): Promise<Song> => {
  const response = await apiClient.post<Song>('/songs/request-upload', payload);
  return unwrap<Song>(response.data);
};

export const confirmUploadSong = async (songId: string): Promise<void> => {
  await apiClient.post(`/songs/${songId}/confirm`);
};

export const getMyAlbums = async (params?: { page?: number; size?: number }): Promise<PageResponse<Album>> => {
  const response = await apiClient.get<PageResponse<Album>>('/albums/my', { params });
  return unwrap<PageResponse<Album>>(response.data);
};

export const getAlbumById = async (albumId: string): Promise<Album> => {
  const response = await apiClient.get<Album>(`/albums/${albumId}`);
  return unwrap<Album>(response.data);
};

export const getMyAlbumById = async (albumId: string): Promise<Album> => {
  const response = await apiClient.get<Album>(`/albums/my/${albumId}`);
  return unwrap<Album>(response.data);
};

export const getMyPlaylists = async (params?: { page?: number; size?: number }): Promise<PageResponse<Playlist>> => {
  const response = await apiClient.get<PageResponse<Playlist>>('/playlists/my-playlists', { params });
  return unwrap<PageResponse<Playlist>>(response.data);
};

export const getPlaylistById = async (playlistId: string): Promise<Playlist> => {
  const response = await apiClient.get<Playlist>(`/playlists/${playlistId}`);
  return unwrap<Playlist>(response.data);
};

export const getPlaylistBySlug = async (slug: string): Promise<Playlist> => {
  const response = await apiClient.get<Playlist>(`/playlists/${slug}`);
  return unwrap<Playlist>(response.data);
};

export const createPlaylist = async (payload: PlaylistCreateRequest): Promise<Playlist> => {
  const response = await apiClient.post<Playlist>('/playlists', payload);
  return unwrap<Playlist>(response.data);
};

export const updatePlaylist = async (playlistId: string, payload: { name: string; description?: string; visibility: 'PUBLIC' | 'PRIVATE' | 'COLLABORATIVE' }): Promise<Playlist> => {
  const response = await apiClient.put<Playlist>(`/playlists/${playlistId}`, payload);
  return unwrap<Playlist>(response.data);
};

export const deletePlaylist = async (playlistId: string): Promise<void> => {
  await apiClient.delete(`/playlists/${playlistId}`);
};

export const addSongToPlaylist = async (playlistId: string, songId: string): Promise<Playlist> => {
  const response = await apiClient.post<Playlist>(`/playlists/${playlistId}/songs/${songId}`);
  return unwrap<Playlist>(response.data);
};

export const reorderPlaylistSong = async (playlistId: string, payload: { draggedId: string; prevId?: string | null; nextId?: string | null }): Promise<Playlist> => {
  const response = await apiClient.patch<Playlist>(`/playlists/${playlistId}/songs/reorder`, payload);
  return unwrap<Playlist>(response.data);
};


export const reportSong = async (songId: string, payload: { reason: 'COPYRIGHT_VIOLATION' | 'EXPLICIT_CONTENT' | 'HATE_SPEECH' | 'SPAM' | 'MISINFORMATION' | 'OTHER'; description?: string }): Promise<void> => {
  await apiClient.post(`/songs/${songId}/report`, payload);
};
