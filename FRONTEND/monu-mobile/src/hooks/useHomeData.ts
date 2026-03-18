import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMyPlaylists, Playlist } from '../services/music';
import { useRecommendations } from './useRecommendations';

const MUSIC_POLL_MS = 90_000;

export interface HomeData {
  rec: ReturnType<typeof useRecommendations>;
  playlists: Playlist[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useHomeData(): HomeData {
  const { authSession } = useAuth();
  const rec = useRecommendations();

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isMounted = useRef(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMusicData = useCallback(async (silent = false) => {
    if (!isMounted.current) return;
    if (!silent) setLoading(true);

    try {
      if (authSession) {
        const plRes = await getMyPlaylists({ page: 1, size: 50 });
        if (isMounted.current) setPlaylists(plRes.content ?? []);
      }
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
    playlists,
    loading: loading || rec.loading,
    error: error ?? rec.error,
    refresh,
  };
}
