import { Db } from 'mongodb';
import { getDb } from '../mongo';
import type { ListenHistoryResponse, ReactionType, UUID } from './types';

function asIso(d: unknown): string {
  if (!d) return '';
  if (d instanceof Date) return d.toISOString();
  if (typeof d === 'string') return d;
  return '';
}

function toInt(v: unknown, fallback: number): number {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v);
    if (Number.isFinite(n)) return Math.trunc(n);
  }
  return fallback;
}

export async function getListenHistoryInternal(params: {
  userId: UUID;
  limit: number;
  days: number;
}): Promise<ListenHistoryResponse[]> {
  const db = await getDb();
  const { userId } = params;

  const days = Math.min(3650, Math.max(1, params.days)); // safety cap
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const cursor = db.collection('listen_history').find(
    { userId, listenedAt: { $gte: since } },
    { projection: { userId: 1, songId: 1, artistId: 1, playlistId: 1, albumId: 1, durationSeconds: 1, listenedAt: 1 } }
  );
  const docs = await cursor.sort({ listenedAt: -1 }).limit(Math.max(1, params.limit)).toArray();

  return docs.map((d: any) => ({
    id: String(d._id ?? d.id),
    userId: String(d.userId),
    songId: String(d.songId),
    artistId: String(d.artistId),
    playlistId: d.playlistId ? String(d.playlistId) : null,
    albumId: d.albumId ? String(d.albumId) : null,
    durationSeconds: Number(d.durationSeconds ?? 0),
    listenedAt: asIso(d.listenedAt),
  }));
}

export async function getFollowedArtistIdsInternal(userId: UUID): Promise<string[]> {
  const db = await getDb();
  const docs = await db.collection('follows').find({ followerId: userId }, { projection: { artistId: 1 } }).toArray();
  return docs.map((d: any) => String(d.artistId));
}

export async function getFollowedUserIdsInternal(userId: UUID): Promise<string[]> {
  const db = await getDb();
  const docs = await db
    .collection('user_follows')
    .find({ followerId: userId }, { projection: { followeeId: 1 } })
    .toArray();
  return docs.map((d: any) => String(d.followeeId));
}

export async function getLikedSongIdsInternal(params: { userId: UUID; type: ReactionType }): Promise<string[]> {
  const db = await getDb();
  const docs = await db
    .collection('reactions')
    .find({ userId: params.userId, type: params.type }, { projection: { songId: 1 } })
    .toArray();
  return docs.map((d: any) => String(d.songId));
}

// Returns the raw map used by recommendation-service `ListeningInsightsService.fetchRawAggregation`.\n
export async function getListenInsightsRawInternal(params: {
  userId: UUID;
  days: number;
}): Promise<Record<string, any>> {
  const db = await getDb();

  const days = Math.min(365, Math.max(1, toInt(params.days, 30)));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const match = { userId: params.userId, listenedAt: { $gte: since } };

  // Summary + unique songs
  const summary = await db
    .collection('listen_history')
    .aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalSeconds: { $sum: '$durationSeconds' },
          uniqueSongs: { $addToSet: '$songId' },
        },
      },
      { $project: { _id: 0, totalSeconds: 1, uniqueSongsCount: { $size: '$uniqueSongs' } } },
    ])
    .toArray();

  const summaryRow = summary[0] ?? { totalSeconds: 0, uniqueSongsCount: 0 };
  const totalListeningSeconds = Number(summaryRow.totalSeconds ?? 0);
  const uniqueSongsCount = Number(summaryRow.uniqueSongsCount ?? 0);

  const dayRows = await db
    .collection('listen_history')
    .aggregate([
      { $match: match },
      { $project: { day: { $dateToString: { format: '%Y-%m-%d', date: '$listenedAt' } } } },
      { $group: { _id: '$day' } },
      { $sort: { _id: 1 } },
    ])
    .toArray();
  const daysList = dayRows.map((r: any) => String(r._id)).filter(Boolean);

  const parsedDates = daysList.map((d) => new Date(d + 'T00:00:00.000Z')).sort((a, b) => a.getTime() - b.getTime());

  const daySet = new Set(parsedDates.map((x) => x.toISOString().slice(0, 10)));
  let longest = 0;
  let current = 0;

  for (let i = 0; i < parsedDates.length; i++) {
    // Start a new streak if previous day is not present.
    const prev = new Date(parsedDates[i].getTime() - 24 * 60 * 60 * 1000);
    const prevKey = prev.toISOString().slice(0, 10);
    if (!daySet.has(prevKey)) {
      let streak = 0;
      let cur = parsedDates[i];
      while (true) {
        const key = cur.toISOString().slice(0, 10);
        if (!daySet.has(key)) break;
        streak += 1;
        cur = new Date(cur.getTime() + 24 * 60 * 60 * 1000);
      }
      longest = Math.max(longest, streak);
    }
  }

  // Current streak: run ending at the latest listened day.
  if (parsedDates.length) {
    const latest = parsedDates[parsedDates.length - 1];
    let streak = 0;
    let cur = latest;
    while (true) {
      const key = cur.toISOString().slice(0, 10);
      if (!daySet.has(key)) break;
      streak += 1;
      cur = new Date(cur.getTime() - 24 * 60 * 60 * 1000);
    }
    current = streak;
  }

  // Top songs by playCount (and include totalDurationSeconds)
  const topSongsRows = await db
    .collection('listen_history')
    .aggregate([
      { $match: match },
      { $group: { _id: '$songId', playCount: { $sum: 1 }, totalDurationSeconds: { $sum: '$durationSeconds' } } },
      { $sort: { playCount: -1 } },
      { $limit: 10 },
    ])
    .toArray();
  const topSongs = topSongsRows.map((r: any) => ({
    songId: String(r._id),
    playCount: Number(r.playCount ?? 0),
    totalDurationSeconds: Number(r.totalDurationSeconds ?? 0),
  }));

  // Top artists by totalDurationSeconds
  const topArtistsRows = await db
    .collection('listen_history')
    .aggregate([
      { $match: match },
      { $group: { _id: '$artistId', playCount: { $sum: 1 }, totalDurationSeconds: { $sum: '$durationSeconds' } } },
      { $sort: { totalDurationSeconds: -1 } },
      { $limit: 10 },
    ])
    .toArray();
  const topArtists = topArtistsRows.map((r: any) => ({
    artistId: String(r._id),
    totalDurationSeconds: Number(r.totalDurationSeconds ?? 0),
    playCount: Number(r.playCount ?? 0),
  }));

  // listenCountByHour: count events per hour of day.
  const hourRows = await db
    .collection('listen_history')
    .aggregate([
      { $match: match },
      { $group: { _id: { $hour: '$listenedAt' }, count: { $sum: 1 } } },
    ])
    .toArray();
  const listenCountByHour: number[] = Array.from({ length: 24 }, () => 0);
  for (const r of hourRows) {
    const hour = Number((r as any)._id);
    if (hour >= 0 && hour <= 23) listenCountByHour[hour] = Number((r as any).count ?? 0);
  }

  // listenCountByDayOfWeek: ISO day of week (Mon=1..Sun=7) -> index 0..6.
  const dowRows = await db
    .collection('listen_history')
    .aggregate([
      { $match: match },
      { $group: { _id: { $subtract: [{ $isoDayOfWeek: '$listenedAt' }, 1] }, count: { $sum: 1 } } },
    ])
    .toArray();
  const listenCountByDayOfWeek: number[] = Array.from({ length: 7 }, () => 0);
  for (const r of dowRows) {
    const idx = Number((r as any)._id);
    if (idx >= 0 && idx <= 6) listenCountByDayOfWeek[idx] = Number((r as any).count ?? 0);
  }

  // newlyDiscoveredArtistIds (approx): artists first heard within last 7 days.
  const discoveredSince = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const discoveredRows = await db
    .collection('listen_history')
    .aggregate([
      { $match: { userId: params.userId } },
      { $group: { _id: '$artistId', minDate: { $min: '$listenedAt' }, playCount: { $sum: 1 } } },
      { $match: { minDate: { $gte: discoveredSince } } },
      { $sort: { playCount: -1 } },
      { $limit: 10 },
    ])
    .toArray();
  const newlyDiscoveredArtistIds = discoveredRows.map((r: any) => String(r._id));

  return {
    totalListeningSeconds,
    uniqueSongsCount,
    currentStreakDays: current,
    longestStreakDays: longest,
    topSongs,
    topArtists,
    listenCountByHour,
    listenCountByDayOfWeek,
    newlyDiscoveredArtistIds,
  };
}

