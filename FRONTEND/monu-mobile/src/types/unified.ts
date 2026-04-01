import { Song, SpotifyTrack } from '../services/music';

/** Song mở rộng hỗ trợ cả internal và Spotify preview */
export interface UnifiedSong extends Omit<Song, 'id'> {
  id: string;
  /** 'internal' | 'spotify' */
  source: 'internal' | 'spotify';
  /** Preview 30s URL (Spotify only) */
  spotifyPreviewUrl?: string | null;
  /** Link mở Spotify app */
  spotifyExternalUrl?: string | null;
  /** URI cho Spotify SDK nếu sau này dùng */
  spotifyUri?: string | null;
}

/** Convert internal Song → UnifiedSong */
export const fromInternalSong = (song: Song): UnifiedSong => ({
  ...song,
  source: 'internal',
});

/** Convert SpotifyTrack → UnifiedSong (playable preview) */
export const fromSpotifyTrack = (track: SpotifyTrack): UnifiedSong => ({
  id: `spotify_${track.id}`,
  title: track.name,
  primaryArtist: {
    artistId: `spotify_artist_${track.id}`,
    stageName: track.artistName,
  },
  genres: [],
  thumbnailUrl: track.imageUrl ?? undefined,
  durationSeconds: track.durationMs ? Math.floor(track.durationMs / 1000) : 30,
  playCount: 0,
  status: 'PUBLIC',
  transcodeStatus: 'COMPLETED',
  createdAt: '',
  updatedAt: '',
  streamUrl: track.previewUrl ?? undefined,
  source: 'spotify',
  spotifyPreviewUrl: track.previewUrl,
  spotifyExternalUrl: track.externalUrl,
  spotifyUri: track.spotifyUri,
});

export const isSpotifySong = (song: UnifiedSong | Song): boolean =>
  'source' in song
    ? (song as UnifiedSong).source === 'spotify'
    : song.id.startsWith('spotify_');
