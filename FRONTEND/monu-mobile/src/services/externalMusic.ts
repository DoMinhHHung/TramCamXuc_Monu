import { apiClient } from './api';


export interface SpotifyTrack {
    id: string;
    name: string;
    artistName: string;
    artistSpotifyUrl: string;
    albumName: string;
    thumbnailUrl?: string;
    uri: string;            // spotify:track:xxx
    spotifyUrl: string;     // https://open.spotify.com/track/xxx
    previewUrl?: string;    // thường null
    durationSeconds: number;
    explicit: boolean;
}

// ─── SoundCloud Types ─────────────────────────────────────────────────────────

export interface SoundCloudTrack {
    id: string;
    urn?: string;
    title: string;
    artistUsername: string;
    artistId: string;
    artistPermalink: string;
    artistAvatarUrl?: string;
    thumbnailUrl?: string;
    permalink: string;
    streamUrl: string;
    waveformUrl?: string;
    genre?: string;
    durationSeconds: number;
    playbackCount: number;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const searchSpotify = async (q: string, limit = 20): Promise<SpotifyTrack[]> => {
    const response = await apiClient.get<SpotifyTrack[]>('/external/spotify/search', {
        params: { q, limit },
    });
    return Array.isArray(response.data) ? response.data : [];
};

export const searchSoundCloud = async (q: string, limit = 20): Promise<SoundCloudTrack[]> => {
    const response = await apiClient.get<SoundCloudTrack[]>('/external/soundcloud/search', {
        params: { q, limit },
    });
    return Array.isArray(response.data) ? response.data : [];
};

export const getSoundCloudStreamUrl = async (soundcloudId: string): Promise<string> => {
    const response = await apiClient.get<string>(
        `/external/soundcloud/tracks/${soundcloudId}/stream`
    );
    return response.data as unknown as string;
};

export const saveSoundCloudTrack = async (track: SoundCloudTrack) => {
    const response = await apiClient.post('/external/soundcloud/tracks/save', track);
    return response.data;
};

export const saveAndAddSoundCloudToPlaylist = async (
    playlistId: string,
    track: SoundCloudTrack,
) => {
    const response = await apiClient.post(
        `/external/soundcloud/tracks/save-and-add-to-playlist/${playlistId}`,
        track,
    );
    return response.data;
};

// ─── Spotify Deep Link ────────────────────────────────────────────────────────

import { Linking } from 'react-native';

/**
 * Mở Spotify app. Nếu không có app, fallback về web player.
 */
export const openInSpotify = async (track: SpotifyTrack) => {
    const appUrl = `spotify://track/${track.id}`;
    const webUrl = track.spotifyUrl;

    try {
        const canOpen = await Linking.canOpenURL(appUrl);
        if (canOpen) {
            await Linking.openURL(appUrl);
        } else {
            await Linking.openURL(webUrl);
        }
    } catch {
        await Linking.openURL(webUrl);
    }
};

/**
 * Chuyển SoundCloudTrack → Song-like object để PlayerContext có thể dùng.
 * streamUrl sẽ được resolve lại khi playSong() được gọi.
 */
export const soundCloudTrackToSong = (track: SoundCloudTrack) => ({
    id: `sc_${track.urn ?? track.id}`,        // prefix để phân biệt với local song
    title: track.title,
    primaryArtist: {
        artistId: `sc_artist_${track.artistId}`,
        stageName: track.artistUsername,
        avatarUrl: track.artistAvatarUrl,
    },
    genres: [],
    thumbnailUrl: track.thumbnailUrl,
    durationSeconds: track.durationSeconds,
    playCount: track.playbackCount,
    status: 'PUBLIC' as const,
    transcodeStatus: 'COMPLETED' as const,
    streamUrl: track.streamUrl,   // Backend proxy URL cho SoundCloud stream
    soundcloudId: track.urn ?? track.id, // Ưu tiên URN, fallback numeric id nếu response cũ
    soundcloudPermalink: track.permalink,
    soundcloudUsername: track.artistUsername,
    createdAt: '',
    updatedAt: '',
    lyricUrl: null,
    sourceType: 'SOUNDCLOUD' as const,
});