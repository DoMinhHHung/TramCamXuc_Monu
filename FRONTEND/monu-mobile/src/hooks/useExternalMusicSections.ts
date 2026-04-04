/**
 * useExternalMusicSections
 * Lấy tracks Spotify và SoundCloud để hiển thị ở HomeScreen.
 * Cache 1 giờ (TTL = 3_600_000ms) — tự xóa khi pull-to-refresh.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { searchSoundCloud, SoundCloudTrack, SpotifyTrack, searchSpotify } from '../services/externalMusic';

// ── Cache ──────────────────────────────────────────────────────────────────────
const CACHE_TTL_MS = 3_600_000; // 1 giờ

interface ExternalCache {
    soundcloud: SoundCloudTrack[];
    spotify: SpotifyTrack[];
    fetchedAt: number;
}

let _cache: ExternalCache | null = null;

function isCacheValid(): boolean {
    if (!_cache) return false;
    return Date.now() - _cache.fetchedAt < CACHE_TTL_MS;
}

function invalidateCache() {
    _cache = null;
}

// ── Queries để lấy nhạc phổ biến từ SC / Spotify ─────────────────────────────
// Dùng search query vì cả hai platform không có endpoint "trending" public.
// Kết hợp vi + en để có kết quả đa dạng.
const SC_QUERIES_VI = ['nhạc trẻ hay nhất', 'vpop trending'];
const SC_QUERIES_EN = ['top hits 2024', 'trending pop'];
const SP_QUERIES_VI = ['nhạc trẻ việt'];
const SP_QUERIES_EN = ['top hits 2024'];

async function fetchSoundCloud(locale: 'vi' | 'en'): Promise<SoundCloudTrack[]> {
    const queries = locale === 'vi' ? SC_QUERIES_VI : SC_QUERIES_EN;
    const results = await Promise.allSettled(
        queries.map(q => searchSoundCloud(q, 8)),
    );
    const merged: SoundCloudTrack[] = [];
    const seen = new Set<string>();
    for (const r of results) {
        if (r.status === 'fulfilled') {
            for (const t of r.value) {
                if (!seen.has(t.id)) {
                    seen.add(t.id);
                    merged.push(t);
                }
            }
        }
    }
    return merged.slice(0, 12);
}

async function fetchSpotify(locale: 'vi' | 'en'): Promise<SpotifyTrack[]> {
    const queries = locale === 'vi' ? SP_QUERIES_VI : SP_QUERIES_EN;
    const results = await Promise.allSettled(
        queries.map(q => searchSpotify(q, 10)),
    );
    const merged: SpotifyTrack[] = [];
    const seen = new Set<string>();
    for (const r of results) {
        if (r.status === 'fulfilled') {
            for (const t of r.value) {
                if (!seen.has(t.id)) {
                    seen.add(t.id);
                    merged.push(t);
                }
            }
        }
    }
    return merged.slice(0, 10);
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface ExternalMusicSections {
    soundcloudTracks: SoundCloudTrack[];
    spotifyTracks: SpotifyTrack[];
    loading: boolean;
    refresh: () => Promise<void>;
}

export function useExternalMusicSections(locale: 'vi' | 'en' = 'vi'): ExternalMusicSections {
    const [soundcloudTracks, setSoundcloudTracks] = useState<SoundCloudTrack[]>(
        isCacheValid() ? (_cache?.soundcloud ?? []) : [],
    );
    const [spotifyTracks, setSpotifyTracks] = useState<SpotifyTrack[]>(
        isCacheValid() ? (_cache?.spotify ?? []) : [],
    );
    const [loading, setLoading] = useState(!isCacheValid());
    const isMounted = useRef(true);
    const fetchingRef = useRef(false);

    const doFetch = useCallback(async (force = false) => {
        if (!force && isCacheValid()) {
            setSoundcloudTracks(_cache!.soundcloud);
            setSpotifyTracks(_cache!.spotify);
            setLoading(false);
            return;
        }
        if (fetchingRef.current) return;
        fetchingRef.current = true;
        setLoading(true);
        try {
            const [sc, sp] = await Promise.all([
                fetchSoundCloud(locale),
                fetchSpotify(locale),
            ]);
            _cache = { soundcloud: sc, spotify: sp, fetchedAt: Date.now() };
            if (isMounted.current) {
                setSoundcloudTracks(sc);
                setSpotifyTracks(sp);
            }
        } catch {
            // giữ nguyên data cũ nếu có lỗi
        } finally {
            fetchingRef.current = false;
            if (isMounted.current) setLoading(false);
        }
    }, [locale]);

    useEffect(() => {
        isMounted.current = true;
        void doFetch();
        return () => { isMounted.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const refresh = useCallback(async () => {
        invalidateCache();
        await doFetch(true);
    }, [doFetch]);

    return { soundcloudTracks, spotifyTracks, loading, refresh };
}
