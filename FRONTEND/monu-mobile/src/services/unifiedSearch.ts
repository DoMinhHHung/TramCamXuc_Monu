import {
  Artist,
  searchArtists,
  searchSongs,
  searchSpotifyTracks,
} from './music';
import {
  UnifiedSong,
  fromInternalSong,
  fromSpotifyTrack,
} from '../types/unified';

export interface UnifiedSearchResult {
  songs: UnifiedSong[];
  artists: Artist[];
  hasMore: boolean;
}

/**
 * Tìm kiếm đồng thời trên internal + Spotify, merge kết quả.
 * Internal được ưu tiên phía trên. Spotify có preview_url mới được thêm.
 */
export const unifiedSearch = async (
  keyword: string,
  options: {
    internalLimit?: number;
    spotifyLimit?: number;
    includeArtists?: boolean;
  } = {},
): Promise<UnifiedSearchResult> => {
  const { internalLimit = 10, spotifyLimit = 10, includeArtists = true } = options;

  const fetchSpotifyPlayable = async () => {
    const vn = await searchSpotifyTracks({ keyword, limit: spotifyLimit, market: 'VN' });
    const vnPlayable = vn.filter((t) => !!t.previewUrl);
    if (vnPlayable.length > 0) return vnPlayable;

    const us = await searchSpotifyTracks({ keyword, limit: spotifyLimit, market: 'US' });
    return us.filter((t) => !!t.previewUrl);
  };

  const [internalRes, spotifyRes, artistRes] = await Promise.allSettled([
    searchSongs({ keyword, size: internalLimit }),
    fetchSpotifyPlayable(),
    includeArtists ? searchArtists({ keyword, size: 5 }) : Promise.resolve(null),
  ]);

  const internalSongs: UnifiedSong[] =
    internalRes.status === 'fulfilled'
      ? internalRes.value.content.map(fromInternalSong)
      : [];

  const spotifySongs: UnifiedSong[] =
    spotifyRes.status === 'fulfilled'
      ? spotifyRes.value
          .map(fromSpotifyTrack)
      : [];

  const artists: Artist[] =
    artistRes.status === 'fulfilled' && artistRes.value
      ? artistRes.value.content
      : [];

  const internalTitles = new Set(
    internalSongs.map((s) => `${s.title.toLowerCase()}|${s.primaryArtist.stageName.toLowerCase()}`),
  );

  const filteredSpotify = spotifySongs.filter(
    (s) =>
      !internalTitles.has(
        `${s.title.toLowerCase()}|${s.primaryArtist.stageName.toLowerCase()}`,
      ),
  );

  return {
    songs: [...internalSongs, ...filteredSpotify],
    artists,
    hasMore: false,
  };
};
