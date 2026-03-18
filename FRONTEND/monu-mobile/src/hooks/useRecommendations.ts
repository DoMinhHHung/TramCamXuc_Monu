import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Song, getTrendingSongs } from '../services/music';
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

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);

    try {
      const tasks: Promise<unknown>[] = [
        getTrendingRecommendations(20),
        getNewReleases(),
      ];

      if (authSession) {
        tasks.push(getHomeRecommendations(false));
        tasks.push(getSocialRecommendations(20));
      }

      const [trendingResult, releasesResult, homeResult, socialResult] = await Promise.allSettled(tasks);

      if (!isMountedRef.current) return;

      const errors: string[] = [];

      if (trendingResult.status === 'fulfilled') {
        const trending = (trendingResult.value as RecommendedSong[]) ?? [];
        if (trending.length > 0) {
          setGlobalTrending(trending);
        } else {
          try {
            const fallback = await getTrendingSongs({ page: 1, size: 20 });
            const mapped = (fallback.content ?? []).map(mapMusicSongToRecommended);
            setGlobalTrending(mapped);
            if (!mapped.length) {
              errors.push('Danh sách trending hiện đang trống.');
            }
          } catch (e: unknown) {
            errors.push(`Không tải được trending fallback: ${toErrorMessage(e)}`);
            setGlobalTrending([]);
          }
        }
      } else {
        errors.push(`Không tải được recommendation trending: ${toErrorMessage(trendingResult.reason)}`);

        try {
          const fallback = await getTrendingSongs({ page: 1, size: 20 });
          const mapped = (fallback.content ?? []).map(mapMusicSongToRecommended);
          setGlobalTrending(mapped);
          if (!mapped.length) {
            errors.push('Trending fallback không có dữ liệu.');
          }
        } catch (e: unknown) {
          errors.push(`Không tải được trending fallback: ${toErrorMessage(e)}`);
          setGlobalTrending([]);
        }
      }

      if (releasesResult.status === 'fulfilled') {
        setNewReleases((releasesResult.value as RecommendedSong[]) ?? []);
      } else {
        errors.push(`Không tải được mục mới phát hành: ${toErrorMessage(releasesResult.reason)}`);
      }

      if (homeResult?.status === 'fulfilled') {
        setHomeFeed(homeResult.value as HomeRecommendation);
      } else if (!authSession) {
        setHomeFeed(null);
      } else if (homeResult?.status === 'rejected') {
        errors.push(`Không tải được gợi ý cá nhân: ${toErrorMessage(homeResult.reason)}`);
      }

      if (socialResult?.status === 'fulfilled') {
        setSocialRecs((socialResult.value as RecommendedSong[]) ?? []);
      } else if (socialResult?.status === 'rejected') {
        errors.push(`Không tải được gợi ý cộng đồng: ${toErrorMessage(socialResult.reason)}`);
      }

      setLastUpdatedAt(new Date());
      setError(errors.length ? errors[0] : null);
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
