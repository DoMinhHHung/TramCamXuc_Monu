import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  FeedbackType,
  HomeRecommendation,
  RecommendedSong,
  getHomeRecommendations,
  getNewReleases,
  getTrendingRecommendations,
  submitRecommendationFeedback,
} from '../services/recommendation';

const RECOMMENDATION_POLL_MS = 60_000;

export function useRecommendations() {
  const { authSession } = useAuth();
  const [homeFeed, setHomeFeed] = useState<HomeRecommendation | null>(null);
  const [globalTrending, setGlobalTrending] = useState<RecommendedSong[]>([]);
  const [newReleases, setNewReleases] = useState<RecommendedSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const isMountedRef = useRef(true);

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);

    try {
      const tasks: Promise<unknown>[] = [
        getTrendingRecommendations(20),
        getNewReleases(),
      ];

      if (authSession) {
        tasks.push(getHomeRecommendations(false));
      }

      const [trendingResult, releasesResult, homeResult] = await Promise.allSettled(tasks);

      if (!isMountedRef.current) return;

      if (trendingResult.status === 'fulfilled') {
        setGlobalTrending((trendingResult.value as RecommendedSong[]) ?? []);
      }

      if (releasesResult.status === 'fulfilled') {
        setNewReleases((releasesResult.value as RecommendedSong[]) ?? []);
      }

      if (homeResult?.status === 'fulfilled') {
        setHomeFeed(homeResult.value as HomeRecommendation);
      } else if (!authSession) {
        setHomeFeed(null);
      }

      setLastUpdatedAt(new Date());
      setError(null);
    } catch (e: unknown) {
      if (!silent) {
        const msg = e instanceof Error ? e.message : 'Không thể tải recommendation';
        setError(msg);
      }
    } finally {
      if (isMountedRef.current && !silent) setLoading(false);
    }
  }, [authSession]);

  useEffect(() => {
    isMountedRef.current = true;
    void fetchAll(false);

    const id = setInterval(() => {
      void fetchAll(true);
    }, RECOMMENDATION_POLL_MS);

    return () => {
      isMountedRef.current = false;
      clearInterval(id);
    };
  }, [fetchAll]);

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

    await submitRecommendationFeedback({ songId, feedback, contextSection });
  }, []);

  return useMemo(() => ({
    homeFeed,
    globalTrending,
    newReleases,
    loading,
    error,
    lastUpdatedAt,
    refresh,
    sendFeedback,
  }), [homeFeed, globalTrending, newReleases, loading, error, lastUpdatedAt, refresh, sendFeedback]);
}
