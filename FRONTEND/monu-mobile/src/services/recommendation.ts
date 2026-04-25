import { apiClient } from './api';

export type ReasonType =
    | 'BECAUSE_YOU_LISTEN'
    | 'FRIEND_LIKED'
    | 'ARTIST_YOU_FOLLOW'
    | 'NEW_RELEASE'
    | 'TRENDING_NOW'
    | 'TRENDING_IN_GENRE'
    | 'SIMILAR_TO_LIKED'
    | 'POPULAR_GLOBALLY'
    | 'CONTEXT_TIME'        // Feature 1: ngữ cảnh thời gian/tâm trạng
    | 'CROWD_PICK'          // Feature 4: social graph crowd
    | 'DISCOVERY';          // Feature 5: khám phá

export type FeedbackType = 'LIKE' | 'DISLIKE' | 'SKIP' | 'SKIP_EARLY' | 'REPEAT' | 'COMPLETE';

// ─── Context signal types ─────────────────────────────────────────────────────

export type TimeSlot = 'EARLY_MORNING' | 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT' | 'LATE_NIGHT';
export type MoodType = 'HAPPY' | 'SAD' | 'STRESSED' | 'FOCUSED' | 'ROMANTIC' | 'ENERGETIC';
export type ActivityType = 'WORKING' | 'EXERCISING' | 'COMMUTING' | 'RELAXING' | 'STUDYING';

export interface ContextSignal {
  timeSlot?: TimeSlot;
  mood?: MoodType;
  activity?: ActivityType;
}

// ─── Session signal types ─────────────────────────────────────────────────────

export type SessionSignalType = 'PLAYED' | 'SKIPPED' | 'SKIP_EARLY' | 'REPEATED' | 'COMPLETED';

export interface SessionSignal {
  songId: string;
  type: SessionSignalType;
  genreIds?: string[];
  artistId?: string;
  playedSeconds?: number;
}

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
  reasonContext?: string;
  /** Feature 5: true nếu bài thuộc luồng khám phá */
  isDiscovery?: boolean;
  /** Vị trí trong bảng top 10 (1-based), chỉ có trong /trending/top10 */
  rank?: number;
  /** Badge xu hướng: "🔥 Nổi bật hôm nay" | "📈 Tăng mạnh" | "⭐ Mới & Hot" | "🎵 Đang thịnh" */
  trendBadge?: string;
}

export interface HomeRecommendation {
  forYou: RecommendedSong[];
  trendingNow: RecommendedSong[];
  fromArtists: RecommendedSong[];
  newReleases: RecommendedSong[];
  friendsAreListening: RecommendedSong[];
  /** Feature 1: gợi ý theo ngữ cảnh thời gian/tâm trạng */
  contextual?: RecommendedSong[];
  /** Label mô tả contextual section, vd "Đêm - Cảm xúc 🌙" */
  contextualLabel?: string;
  /** Feature 4: crowd picks từ social graph */
  crowdPicks?: RecommendedSong[];
  /** Feature 5: 30% discovery */
  discover?: RecommendedSong[];
  recentlyPlayedIds: string[];
}

export type RecommendationMode = 'basic' | 'advance';

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

/** Detect time slot từ giờ hiện tại của thiết bị (client-side) */
export const detectLocalTimeSlot = (): TimeSlot => {
  const h = new Date().getHours();
  if (h >= 5  && h < 8)  return 'EARLY_MORNING';
  if (h >= 8  && h < 12) return 'MORNING';
  if (h >= 12 && h < 17) return 'AFTERNOON';
  if (h >= 17 && h < 20) return 'EVENING';
  if (h >= 20 && h < 23) return 'NIGHT';
  return 'LATE_NIGHT';
};

export const getHomeRecommendations = async (
  debug = false,
  context?: ContextSignal,
): Promise<HomeRecommendation> => {
  const timeSlot = context?.timeSlot ?? detectLocalTimeSlot();
  const res = await apiClient.get<HomeRecommendation>('/recommendations/home', {
    params: { debug, timeSlot, mood: context?.mood, activity: context?.activity },
  });
  return res.data;
};

export const getHomeRecommendationsByMode = async (
    mode: RecommendationMode,
    debug = false,
    context?: ContextSignal,
): Promise<HomeRecommendation> => {
  const timeSlot = context?.timeSlot ?? detectLocalTimeSlot();
  const res = await apiClient.get<HomeRecommendation>(`/recommendations/${mode}/home`, {
    params: { debug, timeSlot, mood: context?.mood },
  });
  return res.data;
};

export const getBasicHomeRecommendations = async (debug = false): Promise<HomeRecommendation> =>
    getHomeRecommendationsByMode('basic', debug);

export const getAdvanceHomeRecommendations = async (debug = false): Promise<HomeRecommendation> =>
    getHomeRecommendationsByMode('advance', debug);

export const getTrendingRecommendations = async (limit = 20): Promise<RecommendedSong[]> => {
  const res = await apiClient.get<RecommendedSong[]>('/recommendations/trending', {
    params: { limit },
  });
  return res.data ?? [];
};

/**
 * Top 10 Xu Hướng — mỗi bài có rank (1-10) và trendBadge.
 * Combined score: listen 50% + engagement 30% + velocity 15% + freshness 5%.
 * Cache server-side 2 phút.
 */
export const getTop10Trending = async (): Promise<RecommendedSong[]> => {
  try {
    const res = await apiClient.get<RecommendedSong[]>('/recommendations/trending/top10');
    return res.data ?? [];
  } catch {
    return [];
  }
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
  try {
    const res = await apiClient.get<RecommendedSong[]>(
      `/recommendations/advance/similar/${songId}`,
      { params: { limit } },
    );
    return res.data ?? [];
  } catch {
    const fallback = await apiClient.get<RecommendedSong[]>(
        `/recommendations/basic/similar/${songId}`,
        { params: { limit } },
    );
    return fallback.data ?? [];
  }
};

export const getBasicSimilarSongs = async (songId: string, limit = 20): Promise<RecommendedSong[]> => {
  const res = await apiClient.get<RecommendedSong[]>(
      `/recommendations/basic/similar/${songId}`,
      { params: { limit } },
  );
  return res.data ?? [];
};

export const getAdvanceSimilarSongs = async (songId: string, limit = 20): Promise<RecommendedSong[]> => {
  const res = await apiClient.get<RecommendedSong[]>(
      `/recommendations/advance/similar/${songId}`,
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

// ─── Feature 2: Session signal API ───────────────────────────────────────────

/**
 * Gửi session signal lên server để re-rank real-time.
 * Fire-and-forget — không block UI.
 */
export const postSessionSignal = async (signal: SessionSignal): Promise<void> => {
  try {
    await apiClient.post('/recommendations/session/signal', signal);
  } catch {
    // best-effort, không block
  }
};
