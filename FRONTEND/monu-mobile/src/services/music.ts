/**
 * Lưu/copy playlist từ Discovery: tạo bản copy Discovery ở backend
 * @param sourcePlaylistId ID playlist gốc
 * @param sourceAuthorName Tên tác giả gốc (hiển thị mô tả)
 */

import { apiClient } from './api';

export const savePlaylistFromDiscovery = async (sourcePlaylistId: string, sourceAuthorName: string): Promise<Playlist> => {
  const response = await apiClient.post<Playlist>(
    `/playlists/save-from-discovery`,
    { sourcePlaylistId, sourceAuthorName }
  );
  return unwrap<Playlist>(response.data);
};

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
  status: 'DRAFT' | 'PUBLIC' | 'ARCHIVED' | 'PRIVATE' | 'DELETED' | 'ALBUM_ONLY';
  transcodeStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  streamUrl?: string;
  lyricUrl?: string | null;
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

/** Track row trong album (API `AlbumSongResponse`) */
export interface AlbumSongRow {
  albumSongId?: string;
  songId: string;
  prevId?: string | null;
  nextId?: string | null;
  title: string;
  slug?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  playCount?: number;
  available?: boolean;
  unavailableReason?: string;
  artistId?: string;
  artistStageName?: string;
  artistAvatarUrl?: string;
}

export interface Album {
  id: string;
  title: string;
  slug?: string;
  description?: string;
  coverUrl?: string;
  releaseDate?: string;
  /** Lịch phát hành tự động (album PRIVATE + có giá trị = chờ phát hành) */
  scheduledPublishAt?: string | null;
  scheduleCommittedAt?: string | null;
  credits?: string | null;
  publishedAt?: string | null;
  status: 'DRAFT' | 'PUBLIC' | 'PRIVATE';
  totalSongs?: number;
  totalDurationSeconds?: number;
  ownerArtistId?: string;
  ownerStageName?: string;
  ownerAvatarUrl?: string;
  /** Detail có danh sách bài; list có thể rỗng */
  songs?: (Song | AlbumSongRow)[];
  createdAt: string;
  updatedAt: string;
}

export function isAlbumPendingScheduledRelease(album: Pick<Album, 'status' | 'scheduledPublishAt'>): boolean {
  return album.status === 'PRIVATE' && !!album.scheduledPublishAt;
}

/** Gộp ngày + giờ local → ISO gửi backend (ZonedDateTime) */
export function localDateAndTimeToPublishAtIso(dateYmd: string, timeHm: string): string {
  const d = dateYmd.trim();
  const t = (timeHm.trim() || '12:00').slice(0, 5);
  const [y, m, day] = d.split('-').map((x) => Number.parseInt(x, 10));
  const [hh, mm] = t.split(':').map((x) => Number.parseInt(x, 10));
  if (!y || !m || !day || Number.isNaN(hh) || Number.isNaN(mm)) {
    throw new Error('Invalid date/time');
  }
  const local = new Date(y, m - 1, day, hh, mm, 0, 0);
  return local.toISOString();
}

export function albumTrackToSong(row: AlbumSongRow): Song {
  const id = row.songId;
  let status: Song['status'] = 'PUBLIC';
  if (row.available === false) {
    status = 'ALBUM_ONLY';
  }
  return {
    id,
    title: row.title ?? 'Track',
    primaryArtist: {
      artistId: row.artistId ?? '',
      stageName: row.artistStageName ?? 'Artist',
      avatarUrl: row.artistAvatarUrl,
    },
    genres: [],
    thumbnailUrl: row.thumbnailUrl,
    durationSeconds: row.durationSeconds ?? 0,
    playCount: typeof row.playCount === 'number' ? row.playCount : 0,
    status,
    transcodeStatus: row.available === false ? 'PENDING' : 'COMPLETED',
    createdAt: '',
    updatedAt: '',
  };
}

/** Chuẩn hoá queue cho player từ album detail */
export function albumTracksAsPlayableSongs(album: Album | null): Song[] {
  const raw = album?.songs ?? [];
  return raw.map((s: Song | AlbumSongRow) => {
    if (s && typeof (s as AlbumSongRow).songId === 'string') {
      return albumTrackToSong(s as AlbumSongRow);
    }
    return s as Song;
  });
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

export const getPublicAlbums = async (params?: { page?: number; size?: number; artistId?: string }): Promise<PageResponse<Album>> => {
  const response = await apiClient.get<PageResponse<Album>>('/albums', { params });
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
  const response = await apiClient.get<Playlist>(`/playlists/id/${playlistId}`);
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

export const removeSongFromPlaylist = async (playlistId: string, songId: string): Promise<void> => {
  await apiClient.delete(`/playlists/${playlistId}/songs/${songId}`);
};

/**
 * Reorder user's playlists
 * @param playlistIds Array of playlist IDs in the desired order
 */
export const reorderPlaylists = async (playlistIds: string[]): Promise<void> => {
  await apiClient.patch('/playlists/reorder', { playlistIds });
};

export const reportSong = async (songId: string, payload: { reason: 'COPYRIGHT_VIOLATION' | 'EXPLICIT_CONTENT' | 'HATE_SPEECH' | 'SPAM' | 'MISINFORMATION' | 'OTHER'; description?: string }): Promise<void> => {
  await apiClient.post(`/songs/${songId}/report`, payload);
};

// ── Lyrics ──────────────────────────────────────────────────────────────────

export type LyricFormat = 'LRC' | 'SRT' | 'TXT';

export interface LyricLine {
  timeMs: number | null;
  text: string;
}

export interface LyricResponse {
  songId: string;
  format: LyricFormat;
  lines: LyricLine[];
}

export const getLyric = async (songId: string): Promise<LyricResponse> => {
  const response = await apiClient.get<LyricResponse>(`/songs/${songId}/lyrics`);
  return unwrap<LyricResponse>(response.data);
};

export const searchByLyric = async (params: {
  keyword: string;
  page?: number;
  size?: number;
}): Promise<Song[]> => {
  const response = await apiClient.get<Song[]>('/songs/search-by-lyric', { params });
  return unwrap<Song[]>(response.data);
};

export const uploadLyric = async (songId: string, file: {
  uri: string;
  name: string;
  type?: string;
}): Promise<LyricResponse> => {
  const form = new FormData();
  form.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.type ?? 'application/octet-stream',
  } as any);
  const response = await apiClient.post<LyricResponse>(
    `/songs/${songId}/lyrics`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return unwrap<LyricResponse>(response.data);
};

export const deleteLyric = async (songId: string): Promise<void> => {
  await apiClient.delete(`/songs/${songId}/lyrics`);
};

export type SongStatus = 'PUBLIC' | 'PRIVATE' | 'ALBUM_ONLY';

export const updateSong = async (songId: string, payload: {
  title?: string;
  genreIds?: string[];
  status?: SongStatus;
}): Promise<Song> => {
  const response = await apiClient.put<Song>(`/songs/${songId}`, payload);
  return unwrap<Song>(response.data);
};

export const publishAlbum = async (albumId: string): Promise<Album> => {
  const response = await apiClient.post<Album>(`/albums/${albumId}/publish`);
  return unwrap<Album>(response.data);
};

export const unpublishAlbum = async (albumId: string): Promise<Album> => {
  const response = await apiClient.post<Album>(`/albums/${albumId}/unpublish`);
  return unwrap<Album>(response.data);
};

export const addSongToAlbum = async (albumId: string, songId: string): Promise<Album> => {
  const response = await apiClient.post<Album>(`/albums/${albumId}/songs/${songId}`);
  return unwrap<Album>(response.data);
};

export const removeSongFromAlbum = async (albumId: string, songId: string): Promise<Album> => {
  const response = await apiClient.delete<Album>(`/albums/${albumId}/songs/${songId}`);
  return unwrap<Album>(response.data);
};

/** Album của artist hiện tại có chứa bài hát này (chỉnh Album-only). */
export const getMyAlbumsContainingSong = async (songId: string): Promise<Album[]> => {
  const response = await apiClient.get<Album[]>(`/albums/my/containing-song/${songId}`);
  return unwrap<Album[]>(response.data);
};

export const updateAlbum = async (
  albumId: string,
  payload: { title?: string; description?: string; releaseDate?: string | null; credits?: string | null },
): Promise<Album> => {
  const response = await apiClient.put<Album>(`/albums/${albumId}`, payload);
  return unwrap<Album>(response.data);
};

export interface AlbumScheduleCommitRequest {
  publishAt: string;
  credits?: string | null;
}

export const commitAlbumSchedule = async (albumId: string, payload: AlbumScheduleCommitRequest): Promise<Album> => {
  const response = await apiClient.post<Album>(`/albums/${albumId}/schedule/commit`, payload);
  return unwrap<Album>(response.data);
};

export const cancelAlbumSchedule = async (albumId: string): Promise<Album> => {
  const response = await apiClient.delete<Album>(`/albums/${albumId}/schedule`);
  return unwrap<Album>(response.data);
};

export const getRecentlyPublishedAlbums = async (params?: {
  withinDays?: number;
  page?: number;
  size?: number;
}): Promise<PageResponse<Album>> => {
  const response = await apiClient.get<PageResponse<Album>>('/albums/new-releases', {
    params: {
      withinDays: params?.withinDays ?? 7,
      page: params?.page ?? 1,
      size: params?.size ?? 20,
    },
  });
  return unwrap<PageResponse<Album>>(response.data);
};

export const favoriteAlbum = async (albumId: string): Promise<void> => {
  await apiClient.post(`/albums/${albumId}/favorite`);
};

export const unfavoriteAlbum = async (albumId: string): Promise<void> => {
  await apiClient.delete(`/albums/${albumId}/favorite`);
};

export const isAlbumFavoritedByMe = async (albumId: string): Promise<boolean> => {
  const response = await apiClient.get<boolean>(`/albums/${albumId}/favorite/me`);
  return unwrap<boolean>(response.data);
};
