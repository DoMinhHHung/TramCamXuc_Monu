import { apiClient } from './api';
import {
  getSoundCloudStreamUrl as getSoundCloudStreamUrlExternal,
  searchSoundCloud as searchSoundCloudExternal,
  searchSpotify as searchSpotifyExternal,
} from './externalMusic';

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
  lyricUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  uploadUrl?: string;
  sourceType?: 'LOCAL' | 'JAMENDO' | 'SOUNDCLOUD';
  soundcloudId?: string;
  soundcloudPermalink?: string;
  soundcloudWaveformUrl?: string;
  soundcloudUsername?: string;
}

export type ReportReason =
  | 'COPYRIGHT_VIOLATION'
  | 'EXPLICIT_CONTENT'
  | 'HATE_SPEECH'
  | 'SPAM'
  | 'MISINFORMATION'
  | 'OTHER';

export type ReportStatus = 'PENDING' | 'CONFIRMED' | 'DISMISSED';

export interface SongReportItem {
  id: string;
  songId: string;
  songTitle: string;
  reporterId?: string | null;
  reason: ReportReason;
  description?: string | null;
  status: ReportStatus;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  adminNote?: string | null;
  createdAt: string;
}

export const isSoundCloudExternalSong = (
  song?: Pick<Song, 'sourceType' | 'soundcloudId' | 'soundcloudPermalink'> | null,
): boolean => {
  if (!song) return false;
  return song.sourceType === 'SOUNDCLOUD' || Boolean(song.soundcloudId) || Boolean(song.soundcloudPermalink);
};

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
  slug?: string;
  description?: string;
  coverUrl?: string;
  releaseDate?: string;
  status: 'DRAFT' | 'PUBLIC' | 'PRIVATE';
  totalSongs?: number;
  totalDurationSeconds?: number;
  ownerArtistId?: string;
  ownerStageName?: string;
  ownerAvatarUrl?: string;
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

export const reportSong = async (songId: string, payload: { reason: ReportReason; description?: string }): Promise<void> => {
  await apiClient.post(`/songs/${songId}/report`, payload);
};

export const getMyReportHistory = async (params?: { page?: number; size?: number }): Promise<PageResponse<SongReportItem>> => {
  const response = await apiClient.get<PageResponse<SongReportItem>>('/songs/my-reports', { params });
  return unwrap<PageResponse<SongReportItem>>(response.data);
};

export const removeMyReport = async (reportId: string): Promise<void> => {
  await apiClient.delete(`/songs/my-reports/${reportId}`);
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

export type SongStatus = 'PUBLIC' | 'PRIVATE';

export const updateSong = async (songId: string, payload: {
  title?: string;
  genreIds?: string[];
  status?: SongStatus;
}): Promise<Song> => {
  const response = await apiClient.put<Song>(`/songs/${songId}`, payload);
  return unwrap<Song>(response.data);
};

export interface SpotifyTrack {
  id: string;
  name: string;
  artistName: string;
  albumName?: string;
  externalUrl?: string;
  spotifyUrl?: string;
  previewUrl?: string;
  durationMs?: number;
}

export interface SoundCloudTrack {
  id: string;
  urn: string;
  title: string;
  uploaderName?: string;
  artworkUrl?: string;
  permalinkUrl?: string;
  streamUrl?: string;
  previewUrl?: string;
  durationMs?: number;
  playbackCount?: number;
  genre?: string;
  attributionText?: string;
}

const cleanExternalText = (value?: string): string => {
  if (!value) return '';

  let next = value;

  if (next.includes('%')) {
    try {
      next = decodeURIComponent(next);
    } catch {
      // keep original when malformed URI segment
    }
  }

  next = next.replace(/\b(?:[0-9A-Fa-f]{2}\s+){1,}[0-9A-Fa-f]{2}\b/g, (chunk) => {
    try {
      const encoded = chunk
        .trim()
        .split(/\s+/)
        .map((hex) => `%${hex.toUpperCase()}`)
        .join('');
      return decodeURIComponent(encoded);
    } catch {
      return chunk;
    }
  });

  next = next.replace(/\b20(?=[A-Za-z])/g, ' ');
  next = next.replace(/\s{2,}/g, ' ').trim();
  return next;
};

export const searchSpotifyTracks = async (params: {
  keyword: string;
  limit?: number;
  market?: string;
}): Promise<SpotifyTrack[]> => {
  const rows = await searchSpotifyExternal(params.keyword, params.limit ?? 20);
  return rows.map((row) => ({
    id: row.id,
    name: cleanExternalText(row.name),
    artistName: cleanExternalText(row.artistName),
    albumName: cleanExternalText(row.albumName),
    externalUrl: row.spotifyUrl,
    spotifyUrl: row.spotifyUrl,
    previewUrl: row.previewUrl,
    durationMs: row.durationSeconds ? row.durationSeconds * 1000 : undefined,
  }));
};

export const searchSoundCloudTracks = async (params: {
  keyword: string;
  limit?: number;
}): Promise<SoundCloudTrack[]> => {
  const rows = await searchSoundCloudExternal(params.keyword, params.limit ?? 20);
  return rows.map((row) => ({
    id: row.id,
    urn: row.urn ?? row.id,
    title: cleanExternalText(row.title),
    uploaderName: cleanExternalText(row.artistUsername),
    artworkUrl: row.thumbnailUrl,
    permalinkUrl: row.permalink,
    streamUrl: row.streamUrl,
    durationMs: row.durationSeconds ? row.durationSeconds * 1000 : undefined,
    playbackCount: row.playbackCount,
    genre: row.genre,
    attributionText: 'Provided by SoundCloud',
  }));
};

export const getSoundCloudStreamUrl = async (soundcloudId: string): Promise<{
  streamUrl?: string;
  streamUrlFallback?: string;
}> => {
  const streamUrl = await getSoundCloudStreamUrlExternal(soundcloudId);
  return {
    streamUrl,
    streamUrlFallback: streamUrl,
  };
};

export const isSpotifyOwnedContent = (track: SpotifyTrack): boolean => {
  return Boolean(track.spotifyUrl || track.externalUrl);
};

export const isSoundCloudOwnedContent = (track: SoundCloudTrack): boolean => {
  return Boolean(track.urn || track.streamUrl || track.permalinkUrl);
};
