/**
 * Home data theo 3 tầng: cache ngay → trending/newest/playlists → stats + genre sections (defer).
 * Giảm thời gian “chỉ thấy spinner” trên 3G yếu.
 */

import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuth } from '../context/AuthContext';
import {
  getMyPlaylists,
  getNewestSongs,
  getTrendingSongs,
  Song,
  type Playlist,
} from '../services/music';
import { getPopularGenres } from '../services/favorites';
import { Genre } from '../types/favorites';
import type { HomeStatsData } from './useHomeStats';
import { fetchHomeStats, HOME_STATS_CACHE_KEY } from './useHomeStats';

export const LEGACY_CACHE_KEY = 'home_legacy_cache_v1';

export type HomeLoadPhase = 1 | 2 | 3;

export type GenreSectionState = {
  songs: Song[];
  hasMore: boolean;
  expanded: boolean;
  loading: boolean;
};

const PHASE3_DELAY_MS = 320;

const shuffleInSession = <T,>(items: T[]): T[] => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

/** Group songs into genre sections client-side (e.g. after one batch trending+newest fetch). */
export const buildGenreSectionsFromPool = (
  genres: Genre[],
  songsPool: Song[],
  minSongs = 1,
): Record<string, GenreSectionState> => {
  const dedupedPool = Array.from(new Map(songsPool.map((song) => [song.id, song])).values());
  const nextSections: Record<string, GenreSectionState> = {};
  genres.forEach((genre) => {
    const genreSongs = dedupedPool.filter((song) =>
      (song.genres ?? []).some((songGenre) => songGenre.id === genre.id));
    if (genreSongs.length >= minSongs) {
      nextSections[genre.id] = {
        songs: genreSongs.slice(0, 5),
        hasMore: genreSongs.length > 5,
        expanded: false,
        loading: false,
      };
    }
  });
  return nextSections;
};

export interface UseHomeDataPriorityReturn {
  phase: HomeLoadPhase;
  legacyTrendingSongs: Song[];
  legacyNewestSongs: Song[];
  playlists: Playlist[];
  genres: Genre[];
  genreSections: Record<string, GenreSectionState>;
  homeStats: HomeStatsData | null;
  phase2Loading: boolean;
  phase3Loading: boolean;
  refresh: () => Promise<void>;
  setGenreSections: Dispatch<SetStateAction<Record<string, GenreSectionState>>>;
}

export function useHomeDataPriority(): UseHomeDataPriorityReturn {
  const { authSession } = useAuth();

  const [phase, setPhase] = useState<HomeLoadPhase>(1);
  const [legacyTrendingSongs, setLegacyTrendingSongs] = useState<Song[]>([]);
  const [legacyNewestSongs, setLegacyNewestSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [genreSections, setGenreSections] = useState<Record<string, GenreSectionState>>({});
  const [homeStats, setHomeStats] = useState<HomeStatsData | null>(null);
  const [phase2Loading, setPhase2Loading] = useState(true);
  const [phase3Loading, setPhase3Loading] = useState(false);

  const mounted = useRef(true);
  const runId = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // Tầng 1 — cache legacy (AsyncStorage)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [legacyRaw, statsRaw] = await Promise.all([
          AsyncStorage.getItem(LEGACY_CACHE_KEY),
          AsyncStorage.getItem(HOME_STATS_CACHE_KEY),
        ]);
        if (cancelled) return;

        if (legacyRaw) {
          const c = JSON.parse(legacyRaw) as {
            trending?: Song[];
            newest?: Song[];
            genres?: Genre[];
            genreSections?: Record<string, GenreSectionState>;
          };
          if (c.trending?.length) setLegacyTrendingSongs(c.trending);
          if (c.newest?.length) setLegacyNewestSongs(c.newest);
          if (c.genres?.length) setGenres(c.genres);
          if (c.genreSections && Object.keys(c.genreSections).length) {
            setGenreSections(c.genreSections);
          }
          setPhase(1);
        }

        if (statsRaw) {
          try {
            setHomeStats(JSON.parse(statsRaw) as HomeStatsData);
          } catch { /* ignore */ }
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const runPhase2And3 = useCallback(async (silent: boolean) => {
    const id = ++runId.current;
    if (!silent) setPhase2Loading(true);

    let tSongs: Song[] = [];
    let nSongs: Song[] = [];

    try {
      const [trending, newest] = await Promise.all([
        getTrendingSongs({ page: 1, size: 10 }),
        getNewestSongs({ page: 1, size: 10 }),
      ]);
      if (!mounted.current || runId.current !== id) return;

      tSongs = shuffleInSession(trending.content ?? []);
      nSongs = shuffleInSession(newest.content ?? []);
      setLegacyTrendingSongs(tSongs);
      setLegacyNewestSongs(nSongs);

      if (authSession) {
        const pls = await getMyPlaylists({ page: 1, size: 50 });
        if (!mounted.current || runId.current !== id) return;
        setPlaylists(pls.content ?? []);
      } else {
        setPlaylists([]);
      }

      const popularGenres = await getPopularGenres(12);
      if (!mounted.current || runId.current !== id) return;
      setGenres(popularGenres ?? []);

      setPhase(2);
    } catch (e) {
      if (!silent && mounted.current && runId.current === id) {
        console.warn('[useHomeDataPriority] phase2 failed', e);
      }
    } finally {
      if (mounted.current && runId.current === id) {
        setPhase2Loading(false);
      }
    }

    if (!mounted.current || runId.current !== id) return;

    await new Promise<void>((r) => setTimeout(r, PHASE3_DELAY_MS));
    if (!mounted.current || runId.current !== id) return;

    setPhase3Loading(true);
    try {
      if (authSession) {
        try {
          const stats = await fetchHomeStats({ force: silent });
          if (mounted.current && runId.current === id) {
            setHomeStats(stats);
            AsyncStorage.setItem(HOME_STATS_CACHE_KEY, JSON.stringify(stats)).catch(() => {});
          }
        } catch (e: unknown) {
          if (mounted.current && runId.current === id) {
            console.warn('[useHomeDataPriority] home stats failed', e);
          }
        }
      }

      if (mounted.current && runId.current === id) setPhase(3);
    } catch (e) {
      if (!silent && mounted.current && runId.current === id) {
        console.warn('[useHomeDataPriority] phase3 failed', e);
      }
    } finally {
      if (mounted.current && runId.current === id) {
        setPhase3Loading(false);
      }
    }
  }, [authSession]);

  useEffect(() => {
    void runPhase2And3(false);
  }, [runPhase2And3]);

  useEffect(() => {
    if (!legacyTrendingSongs.length && !legacyNewestSongs.length) return;
    AsyncStorage.setItem(LEGACY_CACHE_KEY, JSON.stringify({
      trending: legacyTrendingSongs,
      newest: legacyNewestSongs,
      genres,
      genreSections,
    })).catch(() => {});
  }, [legacyTrendingSongs, legacyNewestSongs, genres, genreSections]);

  const refresh = useCallback(async () => {
    await runPhase2And3(true);
  }, [runPhase2And3]);

  return {
    phase,
    legacyTrendingSongs,
    legacyNewestSongs,
    playlists,
    genres,
    genreSections,
    homeStats,
    phase2Loading,
    phase3Loading,
    refresh,
    setGenreSections,
  };
}
