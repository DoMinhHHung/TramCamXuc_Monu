import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { Song, getTrendingSongs } from '../services/music';

const REC_CACHE_KEY = 'rec_cache_v1';
import {
  FeedbackType,
  HomeRecommendation,
  RecommendedSong,
  getHomeRecommendations,
  getNewReleases,
  getSocialRecommendations,
  getTrendingRecommendations,
  submitRecommendationFeedback,
} from '../services/recommendation';

const RECOMMENDATION_POLL_MS = 90_000;
/** Sau trending + new releases, trì personal/social để ưu tiên above-the-fold trên mạng yếu */
const PERSONAL_REC_DELAY_MS = 320;

const toErrorMessage = (reason: unknown): string => {
  if (reason instanceof Error) return reason.message;
  if (typeof reason === 'string') return reason;
  return 'Không thể tải recommendation';
};

const mapMusicSongToRecommended = (song: Song): RecommendedSong => ({
  songId: song.id,
  title: song.title,
  primaryArtist: song.primaryArtist,
  genres: song.genres,
  thumbnailUrl: song.thumbnailUrl,
  durationSeconds: song.durationSeconds,
  playCount: song.playCount,
  score: 0,
  reasonType: 'TRENDING_NOW',
  reason: 'Đang hot',
});

export function useRecommendations() {
  const { authSession } = useAuth();
  const [homeFeed, setHomeFeed] = useState<HomeRecommendation | null>(null);
  const [globalTrending, setGlobalTrending] = useState<RecommendedSong[]>([]);
  const [newReleases, setNewReleases] = useState<RecommendedSong[]>([]);
  const [socialRecs, setSocialRecs] = useState<RecommendedSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const isMountedRef = useRef(true);

  const runTrendingReleases = useCallback(async (): Promise<string[]> => {
    const errors: string[] = [];
    const [trendingResult, releasesResult] = await Promise.allSettled([
      getTrendingRecommendations(20),
      getNewReleases(),
    ]);

    if (!isMountedRef.current) return errors;

    if (trendingResult.status === 'fulfilled') {
      const trending = (trendingResult.value as RecommendedSong[]) ?? [];
      if (trending.length > 0) {
        setGlobalTrending(trending);
      } else {
        try {
          const fallback = await getTrendingSongs({ page: 1, size: 20 });
          const mapped = (fallback.content ?? []).map(mapMusicSongToRecommended);
          if (isMountedRef.current) setGlobalTrending(mapped);
          if (!mapped.length) {
            errors.push('Danh sách trending hiện đang trống.');
          }
        } catch (e: unknown) {
          errors.push(`Không tải được trending fallback: ${toErrorMessage(e)}`);
          if (isMountedRef.current) setGlobalTrending([]);
        }
      }
    } else {
      errors.push(`Không tải được recommendation trending: ${toErrorMessage(trendingResult.reason)}`);
      try {
        const fallback = await getTrendingSongs({ page: 1, size: 20 });
        const mapped = (fallback.content ?? []).map(mapMusicSongToRecommended);
        if (isMountedRef.current) setGlobalTrending(mapped);
        if (!mapped.length) {
          errors.push('Trending fallback không có dữ liệu.');
        }
      } catch (e: unknown) {
        errors.push(`Không tải được trending fallback: ${toErrorMessage(e)}`);
        if (isMountedRef.current) setGlobalTrending([]);
      }
    }

    if (!isMountedRef.current) return errors;

    if (releasesResult.status === 'fulfilled') {
      setNewReleases((releasesResult.value as RecommendedSong[]) ?? []);
    } else {
      errors.push(`Không tải được mục mới phát hành: ${toErrorMessage(releasesResult.reason)}`);
    }

    return errors;
  }, []);

  const runHomeSocial = useCallback(async (): Promise<string[]> => {
    const errors: string[] = [];
    if (!authSession) {
      if (isMountedRef.current) setHomeFeed(null);
      return errors;
    }

    const [homeResult, socialResult] = await Promise.allSettled([
      getHomeRecommendations(false),
      getSocialRecommendations(20),
    ]);

    if (!isMountedRef.current) return errors;

    if (homeResult.status === 'fulfilled') {
      setHomeFeed(homeResult.value as HomeRecommendation);
    } else {
      errors.push(`Không tải được gợi ý cá nhân: ${toErrorMessage(homeResult.reason)}`);
    }

    if (socialResult.status === 'fulfilled') {
      setSocialRecs((socialResult.value as RecommendedSong[]) ?? []);
    } else {
      errors.push(`Không tải được gợi ý cộng đồng: ${toErrorMessage(socialResult.reason)}`);
    }

    return errors;
  }, [authSession]);

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);

    try {
      const [coreErrs, personalErrs] = await Promise.all([
        runTrendingReleases(),
        runHomeSocial(),
      ]);

      if (!isMountedRef.current) return;

      const merged = [...coreErrs, ...personalErrs];
      setError(merged.length ? merged[0] : null);
      setLastUpdatedAt(new Date());
    } catch (e: unknown) {
      if (!silent) {
        const msg = e instanceof Error ? e.message : 'Không thể tải recommendation';
        setError(msg);
      }
    } finally {
      if (isMountedRef.current && !silent) setLoading(false);
    }
  }, [runTrendingReleases, runHomeSocial]);

  useEffect(() => {
    isMountedRef.current = true;

    (async () => {
      let hadTrendingCache = false;
      try {
        const raw = await AsyncStorage.getItem(REC_CACHE_KEY);
        if (raw && isMountedRef.current) {
          const c = JSON.parse(raw);
          if (c.globalTrending?.length) {
            setGlobalTrending(c.globalTrending);
            hadTrendingCache = true;
          }
          if (c.newReleases?.length) setNewReleases(c.newReleases);
          if (c.homeFeed) setHomeFeed(c.homeFeed);
          if (c.socialRecs?.length) setSocialRecs(c.socialRecs);
          setLoading(false);
        }
      } catch { /* ignore */ }

      const blockUi = !hadTrendingCache;
      if (blockUi) setLoading(true);

      const coreErrs = await runTrendingReleases();
      if (!isMountedRef.current) return;

      if (blockUi) setLoading(false);
      setError(coreErrs[0] ?? null);
      setLastUpdatedAt(new Date());

      await new Promise<void>((r) => setTimeout(r, PERSONAL_REC_DELAY_MS));
      if (!isMountedRef.current) return;

      const personalErrs = await runHomeSocial();
      if (!isMountedRef.current) return;

      setError((prev) => prev ?? personalErrs[0] ?? null);
      setLastUpdatedAt(new Date());
    })();

    const id = setInterval(() => {
      void fetchAll(true);
    }, RECOMMENDATION_POLL_MS);

    return () => {
      isMountedRef.current = false;
      clearInterval(id);
    };
  }, [runTrendingReleases, runHomeSocial, fetchAll]);

  useEffect(() => {
    if (!lastUpdatedAt) return;
    AsyncStorage.setItem(REC_CACHE_KEY, JSON.stringify({
      globalTrending,
      newReleases,
      homeFeed,
      socialRecs,
    })).catch(() => {});
  }, [lastUpdatedAt]);

  const refresh = useCallback(async () => {
    await fetchAll(false);
  }, [fetchAll]);

  const sendFeedback = useCallback(async (songId: string, feedback: FeedbackType, contextSection?: string) => {
    setHomeFeed((prev) => {
      if (!prev || feedback !== 'DISLIKE') return prev;

      return {
        ...prev,
        forYou: prev.forYou.filter((s) => s.songId !== songId),
        trendingNow: prev.trendingNow.filter((s) => s.songId !== songId),
        fromArtists: prev.fromArtists.filter((s) => s.songId !== songId),
        newReleases: prev.newReleases.filter((s) => s.songId !== songId),
        friendsAreListening: prev.friendsAreListening.filter((s) => s.songId !== songId),
      };
    });

    setGlobalTrending((prev) => (feedback === 'DISLIKE' ? prev.filter((s) => s.songId !== songId) : prev));
    setNewReleases((prev) => (feedback === 'DISLIKE' ? prev.filter((s) => s.songId !== songId) : prev));
    setSocialRecs((prev) => (feedback === 'DISLIKE' ? prev.filter((s) => s.songId !== songId) : prev));

    await submitRecommendationFeedback({ songId, feedback, contextSection });
  }, []);

  return useMemo(() => ({
    homeFeed,
    globalTrending,
    newReleases,
    socialRecs,
    loading,
    error,
    lastUpdatedAt,
    refresh,
    sendFeedback,
  }), [homeFeed, globalTrending, newReleases, socialRecs, loading, error, lastUpdatedAt, refresh, sendFeedback]);
}
