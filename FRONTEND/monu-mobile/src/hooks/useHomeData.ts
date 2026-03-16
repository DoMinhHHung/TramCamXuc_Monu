import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getPopularGenres } from '../services/favorites';
import { getMyPlaylists, getNewestSongs, getTrendingSongs, Playlist, Song } from '../services/music';
import { useRecommendations } from './useRecommendations';
import { Genre } from '../types/favorites';

const MUSIC_POLL_MS = 15_000;

export interface HomeData {
  rec: ReturnType<typeof useRecommendations>;
  trendingSongs: Song[];
  newestSongs: Song[];
  genres: Genre[];
  playlists: Playlist[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useHomeData(): HomeData {
  const { authSession } = useAuth();
  const rec = useRecommendations();

  const [trendingSongs, setTrendingSongs] = useState<Song[]>([]);
  const [newestSongs, setNewestSongs] = useState<Song[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isMounted = useRef(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMusicData = useCallback(async (silent = false) => {
    if (!isMounted.current) return;
    if (!silent) setLoading(true);

    try {
      const tasks: Promise<unknown>[] = [
        getTrendingSongs({ page: 1, size: 10 }),
        getNewestSongs({ page: 1, size: 10 }),
        getPopularGenres(12),
      ];

      if (authSession) tasks.push(getMyPlaylists({ page: 1, size: 50 }));

      const [tr, nw, gn, pl] = await Promise.allSettled(tasks);
      if (!isMounted.current) return;

      if (tr.status === 'fulfilled') setTrendingSongs((tr.value as { content?: Song[] }).content ?? []);
      if (nw.status === 'fulfilled') setNewestSongs((nw.value as { content?: Song[] }).content ?? []);
      if (gn.status === 'fulfilled') setGenres((gn.value as Genre[]) ?? []);
      if (pl?.status === 'fulfilled') setPlaylists((pl.value as { content?: Playlist[] }).content ?? []);

      setError(null);
    } catch (e: unknown) {
      if (!silent) setError(e instanceof Error ? e.message : 'Lỗi tải dữ liệu');
    } finally {
      if (isMounted.current && !silent) setLoading(false);
    }
  }, [authSession]);

  useEffect(() => {
    isMounted.current = true;
    void fetchMusicData(false);

    intervalRef.current = setInterval(() => {
      void fetchMusicData(true);
    }, MUSIC_POLL_MS);

    return () => {
      isMounted.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchMusicData]);

  const refresh = useCallback(async () => {
    await Promise.all([fetchMusicData(false), rec.refresh()]);
  }, [fetchMusicData, rec]);

  return {
    rec,
    trendingSongs,
    newestSongs,
    genres,
    playlists,
    loading: loading || rec.loading,
    error: error ?? rec.error,
    refresh,
  };
}
