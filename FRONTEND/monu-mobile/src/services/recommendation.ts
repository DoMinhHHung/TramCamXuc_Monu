import { apiClient } from './api';

export type ReasonType =
    | 'BECAUSE_YOU_LISTEN'
    | 'FRIEND_LIKED'
    | 'ARTIST_YOU_FOLLOW'
    | 'NEW_RELEASE'
    | 'TRENDING_NOW'
    | 'TRENDING_IN_GENRE'
    | 'SIMILAR_TO_LIKED'
    | 'POPULAR_GLOBALLY';

export type FeedbackType = 'LIKE' | 'DISLIKE' | 'SKIP' | 'COMPLETE';

export interface RecommendedSong {
  songId: string;
  title: string;
  primaryArtist: { artistId: string; stageName: string };
  genres: { id: string; name: string }[];
  thumbnailUrl?: string;
  durationSeconds: number;
  playCount: number;
  score: number;
  reason?: string;
  reasonType: ReasonType;
}

export interface HomeRecommendation {
  forYou: RecommendedSong[];
  trendingNow: RecommendedSong[];
  fromArtists: RecommendedSong[];
  newReleases: RecommendedSong[];
  friendsAreListening: RecommendedSong[];
  recentlyPlayedIds: string[];
}

export interface FeedbackPayload {
  songId: string;
  feedback: FeedbackType;
  contextSection?: string;
}

// ─── Listening Insights types ─────────────────────────────────────────────────

export interface GenreStat {
  genreId: string;
  genreName: string;
  totalMinutes: number;
  percentageOfTotal: number;
}

export interface ArtistStat {
  artistId: string;
  artistStageName: string;
  artistAvatarUrl?: string;
  playCount: number;
  totalMinutes: number;
}

export interface SongStat {
  songId: string;
  title: string;
  thumbnailUrl?: string;
  artistStageName: string;
  playCount: number;
}

export interface HourlyListenCount {
  hour: number;   // 0-23
  count: number;
}

export interface DailyListenCount {
  dayOfWeek: number;
  dayLabel: string;
  count: number;
}

export interface ListeningInsights {
  totalListeningMinutesLast30Days: number;
  uniqueSongsLast30Days: number;
  currentStreakDays: number;
  longestStreakDays: number;
  topGenres: GenreStat[];
  topArtists: ArtistStat[];
  mostPlayedSongs: SongStat[];
  listeningByHour: HourlyListenCount[];
  listeningByDayOfWeek: DailyListenCount[];
  newlyDiscoveredArtistIds: string[];
  dominantMoodLabel?: string;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const getHomeRecommendations = async (debug = false): Promise<HomeRecommendation> => {
  const res = await apiClient.get<HomeRecommendation>('/recommendations/home', {
    params: { debug },
  });
  return res.data;
};

export const getTrendingRecommendations = async (limit = 20): Promise<RecommendedSong[]> => {
  const res = await apiClient.get<RecommendedSong[]>('/recommendations/trending', {
    params: { limit },
  });
  return res.data ?? [];
};

export const getTrendingByGenre = async (genreId: string, limit = 20): Promise<RecommendedSong[]> => {
  const res = await apiClient.get<RecommendedSong[]>(
      `/recommendations/trending/genre/${genreId}`,
      { params: { limit } },
  );
  return res.data ?? [];
};

export const getSocialRecommendations = async (limit = 20): Promise<RecommendedSong[]> => {
  const res = await apiClient.get<RecommendedSong[]>('/recommendations/social', {
    params: { limit },
  });
  return res.data ?? [];
};

export const getSimilarSongs = async (songId: string, limit = 20): Promise<RecommendedSong[]> => {
  const res = await apiClient.get<RecommendedSong[]>(
      `/recommendations/similar/${songId}`,
      { params: { limit } },
  );
  return res.data ?? [];
};

export const getNewReleases = async (): Promise<RecommendedSong[]> => {
  const res = await apiClient.get<RecommendedSong[]>('/recommendations/new-releases');
  return res.data ?? [];
};

export const submitRecommendationFeedback = async (payload: FeedbackPayload): Promise<void> => {
  try {
    await apiClient.post('/recommendations/feedback', payload);
  } catch {}
};

export const getRecommendationHealth = async (): Promise<{
  mlServiceHealthy: boolean;
  cfModelVersion?: string;
}> => {
  try {
    const res = await apiClient.get<{ mlServiceHealthy: boolean; cfModelVersion?: string }>(
        '/recommendations/health',
    );
    return res.data;
  } catch {
    return { mlServiceHealthy: false };
  }
};

export const getListeningInsights = async (days: 7 | 30 | 90 = 30): Promise<ListeningInsights> => {
  const res = await apiClient.get<ListeningInsights>('/recommendations/insights', {
    params: { days },
  });
  return res.data;
};