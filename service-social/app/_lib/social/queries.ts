import { Db } from 'mongodb';
import { makePageResponse, PageResponse } from '../api';
import { getDb } from '../mongo';
import type {
  ArtistStatsResponse,
  Comment,
  FeedPost,
  FollowResponse,
  HeartResponse,
  ListenHistoryResponse,
  ReactionResponse,
  ReactionType,
  ReactionUserEntry,
  UUID,
} from './types';

function asIso(d: unknown): string {
  if (!d) return '';
  // Mongo returns Date for Instant fields.
  if (d instanceof Date) return d.toISOString();
  // If stored as string already.
  if (typeof d === 'string') return d;
  return '';
}

async function countDocs(db: Db, collection: string, filter: Record<string, unknown>) {
  return db.collection(collection).countDocuments(filter);
}

async function findDocs<T = unknown>(
  db: Db,
  collection: string,
  {
    filter,
    sort,
    skip,
    limit,
    projection,
  }: {
    filter: Record<string, unknown>;
    sort?: Record<string, 1 | -1>;
    skip?: number;
    limit?: number;
    projection?: Record<string, 0 | 1>;
  }
): Promise<T[]> {
  const cursor = db
    .collection(collection)
    .find(filter, { projection: projection ? { ...projection } : undefined });
  if (sort) cursor.sort(sort);
  if (typeof skip === 'number') cursor.skip(skip);
  if (typeof limit === 'number') cursor.limit(limit);
  return cursor.toArray() as Promise<T[]>;
}

function uuidList(input: Array<string | undefined | null>): UUID[] {
  return input.filter((x): x is string => !!x && typeof x === 'string');
}

export async function getTimeline(params: {
  userId: UUID;
  page: number; // 0-based
  size: number;
}): Promise<PageResponse<FeedPost>> {
  const db = await getDb();

  const page = Math.max(0, params.page);
  const size = Math.max(1, params.size);

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const vis = ['PUBLIC', 'FOLLOWERS_ONLY'];

  // Followed artists
  const followedArtists = await db
    .collection('follows')
    .find({ followerId: params.userId }, { projection: { artistId: 1 } })
    .sort({ createdAt: -1 })
    .toArray();
  const followedArtistIds = uuidList(followedArtists.map((x: any) => x.artistId));

  // Followed users
  const followedUsers = await db
    .collection('user_follows')
    .find({ followerId: params.userId }, { projection: { followeeId: 1 } })
    .sort({ createdAt: -1 })
    .toArray();
  const followedUserIds = uuidList(followedUsers.map((x: any) => x.followeeId));

  // Famous artists: in Java uses Redis set. Here we approximate by computing from Mongo count.
  const famousThreshold = 500;
  const famousArtists = await db
    .collection('follows')
    .aggregate([
      { $group: { _id: '$artistId', count: { $sum: 1 } } },
      { $match: { count: { $gte: famousThreshold } } },
      { $project: { _id: 0, artistId: '$_id' } },
    ])
    .toArray();
  const famousArtistIds = uuidList(famousArtists.map((x: any) => x.artistId));

  const ownerIds = Array.from(
    new Set([...followedArtistIds, ...followedUserIds, ...famousArtistIds, params.userId])
  );

  const filter = {
    ownerId: { $in: ownerIds },
    visibility: { $in: vis },
    createdAt: { $gte: since },
  };

  const totalElements = await countDocs(db, 'feed_posts', filter as any);
  const skip = page * size;

  const posts = await findDocs<any>(db, 'feed_posts', {
    filter,
    sort: { createdAt: -1 },
    skip,
    limit: size,
  });

  const postIds = posts.map((p) => String(p._id ?? p.id)).filter(Boolean);
  const likes = await db
    .collection('feed_post_likes')
    .find(
      { userId: params.userId, postId: { $in: postIds } },
      { projection: { postId: 1 } }
    )
    .toArray();
  const likedPostIds = new Set(likes.map((l: any) => String(l.postId)));

  const content: FeedPost[] = posts.map((p: any) => ({
    id: String(p._id ?? p.id),
    ownerId: String(p.ownerId),
    ownerType: p.ownerType,
    ownerDisplayName: p.ownerDisplayName ?? null,
    contentType: p.contentType,
    contentId: p.contentId ? String(p.contentId) : undefined,
    title: p.title ?? null,
    caption: p.caption ?? null,
    coverImageUrl: p.coverImageUrl ?? null,
    visibility: p.visibility,
    likeCount: Number(p.likeCount ?? 0),
    commentCount: Number(p.commentCount ?? 0),
    shareCount: Number(p.shareCount ?? 0),
    likedByCurrentUser: likedPostIds.has(String(p._id ?? p.id)),
    createdAt: asIso(p.createdAt),
  }));

  return makePageResponse({ content, totalElements, page, size });
}

export async function getOwnerFeed(params: {
  ownerId: UUID;
  viewerId?: UUID | null;
  page: number; // 0-based
  size: number;
}): Promise<PageResponse<FeedPost>> {
  const db = await getDb();
  const page = Math.max(0, params.page);
  const size = Math.max(1, params.size);

  const isOwner = !!params.viewerId && params.viewerId === params.ownerId;

  let isFollowing = false;
  if (params.viewerId && !isOwner) {
    const followerArtist = await db.collection('follows').findOne({
      followerId: params.viewerId,
      artistId: params.ownerId,
    });
    const followerUser = await db.collection('user_follows').findOne({
      followerId: params.viewerId,
      followeeId: params.ownerId,
    });
    isFollowing = !!followerArtist || !!followerUser;
  }

  const allowed: string[] = ['PUBLIC'];
  if (isOwner || isFollowing) allowed.push('FOLLOWERS_ONLY');
  if (isOwner) allowed.push('PRIVATE');

  const filter = { ownerId: params.ownerId, visibility: { $in: allowed } };
  const totalElements = await countDocs(db, 'feed_posts', filter as any);
  const skip = page * size;

  const posts = await findDocs<any>(db, 'feed_posts', {
    filter,
    sort: { createdAt: -1 },
    skip,
    limit: size,
  });

  const postIds = posts.map((p) => String(p._id ?? p.id)).filter(Boolean);

  const likedPostIds =
    params.viewerId == null
      ? new Set<string>()
      : new Set(
          (
            await db
              .collection('feed_post_likes')
              .find(
                { userId: params.viewerId, postId: { $in: postIds } },
                { projection: { postId: 1 } }
              )
              .toArray()
          ).map((l: any) => String(l.postId))
        );

  const content: FeedPost[] = posts.map((p: any) => ({
    id: String(p._id ?? p.id),
    ownerId: String(p.ownerId),
    ownerType: p.ownerType,
    ownerDisplayName: p.ownerDisplayName ?? null,
    contentType: p.contentType,
    contentId: p.contentId ? String(p.contentId) : undefined,
    title: p.title ?? null,
    caption: p.caption ?? null,
    coverImageUrl: p.coverImageUrl ?? null,
    visibility: p.visibility,
    likeCount: Number(p.likeCount ?? 0),
    commentCount: Number(p.commentCount ?? 0),
    shareCount: Number(p.shareCount ?? 0),
    likedByCurrentUser: likedPostIds.has(String(p._id ?? p.id)),
    createdAt: asIso(p.createdAt),
  }));

  return makePageResponse({ content, totalElements, page, size });
}

export async function getPublicFeed(params: {
  page: number; // 0-based
  size: number;
}): Promise<PageResponse<FeedPost>> {
  const db = await getDb();
  const page = Math.max(0, params.page);
  const size = Math.max(1, params.size);

  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const vis = ['PUBLIC'];

  const filter = { visibility: { $in: vis }, createdAt: { $gte: since } };
  const totalElements = await countDocs(db, 'feed_posts', filter as any);
  const skip = page * size;

  const posts = await findDocs<any>(db, 'feed_posts', {
    filter,
    sort: { createdAt: -1 },
    skip,
    limit: size,
  });

  const content: FeedPost[] = posts.map((p: any) => ({
    id: String(p._id ?? p.id),
    ownerId: String(p.ownerId),
    ownerType: p.ownerType,
    ownerDisplayName: p.ownerDisplayName ?? null,
    contentType: p.contentType,
    contentId: p.contentId ? String(p.contentId) : undefined,
    title: p.title ?? null,
    caption: p.caption ?? null,
    coverImageUrl: p.coverImageUrl ?? null,
    visibility: p.visibility,
    likeCount: Number(p.likeCount ?? 0),
    commentCount: Number(p.commentCount ?? 0),
    shareCount: Number(p.shareCount ?? 0),
    likedByCurrentUser: false,
    createdAt: asIso(p.createdAt),
  }));

  return makePageResponse({ content, totalElements, page, size });
}

// ─────────────────────────────────────────────────────────────────────────────
// Comments
// ─────────────────────────────────────────────────────────────────────────────

export async function getSongComments(params: {
  songId: UUID;
  currentUserId?: UUID | null;
  page: number;
  size: number;
}): Promise<PageResponse<Comment>> {
  const db = await getDb();
  const page = Math.max(0, params.page);
  const size = Math.max(1, params.size);

  const filter = { songId: params.songId, parentId: null };
  const totalElements = await countDocs(db, 'comments', filter as any);
  const skip = page * size;

  const comments = await findDocs<any>(db, 'comments', {
    filter,
    sort: { createdAt: -1 },
    skip,
    limit: size,
  });

  const ids = comments.map((c) => String(c._id ?? c.id)).filter(Boolean);
  const replyCounts = new Map<string, number>();
  if (ids.length) {
    const grouped = await db
      .collection('comments')
      .aggregate([
        { $match: { parentId: { $in: ids } } },
        { $group: { _id: '$parentId', count: { $sum: 1 } } },
      ])
      .toArray();
    for (const g of grouped) replyCounts.set(String((g as any)._id), Number((g as any).count ?? 0));
  }

  const likedSet =
    params.currentUserId == null
      ? new Set<string>()
      : new Set(
          (
            await db
              .collection('comment_likes')
              .find(
                { userId: params.currentUserId, commentId: { $in: ids } },
                { projection: { commentId: 1 } }
              )
              .toArray()
          ).map((l: any) => String(l.commentId))
        );

  const content: Comment[] = comments.map((c: any) => ({
    id: String(c._id ?? c.id),
    userId: String(c.userId),
    songId: String(c.songId),
    parentId: c.parentId ? String(c.parentId) : null,
    content: c.content,
    likeCount: Number(c.likeCount ?? 0),
    edited: !!c.edited,
    likedByCurrentUser: likedSet.has(String(c._id ?? c.id)),
    replyCount: replyCounts.get(String(c._id ?? c.id)) ?? 0,
    createdAt: asIso(c.createdAt),
    updatedAt: c.updatedAt ? asIso(c.updatedAt) : null,
  }));

  return makePageResponse({ content, totalElements, page, size });
}

export async function getCommentReplies(params: {
  parentId: string;
  currentUserId?: UUID | null;
  page: number;
  size: number;
}): Promise<PageResponse<Comment>> {
  const db = await getDb();
  const page = Math.max(0, params.page);
  const size = Math.max(1, params.size);

  const filter = { parentId: params.parentId };
  const totalElements = await countDocs(db, 'comments', filter as any);
  const skip = page * size;

  const comments = await findDocs<any>(db, 'comments', {
    filter,
    sort: { createdAt: 1 },
    skip,
    limit: size,
  });

  const ids = comments.map((c) => String(c._id ?? c.id)).filter(Boolean);
  const replyCounts = new Map<string, number>();
  if (ids.length) {
    const grouped = await db
      .collection('comments')
      .aggregate([
        { $match: { parentId: { $in: ids } } },
        { $group: { _id: '$parentId', count: { $sum: 1 } } },
      ])
      .toArray();
    for (const g of grouped) replyCounts.set(String((g as any)._id), Number((g as any).count ?? 0));
  }

  const likedSet =
    params.currentUserId == null
      ? new Set<string>()
      : new Set(
          (
            await db
              .collection('comment_likes')
              .find(
                { userId: params.currentUserId, commentId: { $in: ids } },
                { projection: { commentId: 1 } }
              )
              .toArray()
          ).map((l: any) => String(l.commentId))
        );

  const content: Comment[] = comments.map((c: any) => ({
    id: String(c._id ?? c.id),
    userId: String(c.userId),
    songId: String(c.songId),
    parentId: c.parentId ? String(c.parentId) : null,
    content: c.content,
    likeCount: Number(c.likeCount ?? 0),
    edited: !!c.edited,
    likedByCurrentUser: likedSet.has(String(c._id ?? c.id)),
    replyCount: replyCounts.get(String(c._id ?? c.id)) ?? 0,
    createdAt: asIso(c.createdAt),
    updatedAt: c.updatedAt ? asIso(c.updatedAt) : null,
  }));

  return makePageResponse({ content, totalElements, page, size });
}

export async function getPostComments(params: {
  postId: string;
  currentUserId?: UUID | null;
  page: number;
  size: number;
}): Promise<PageResponse<Comment>> {
  const db = await getDb();
  const page = Math.max(0, params.page);
  const size = Math.max(1, params.size);

  const filter = { postId: params.postId, parentId: null };
  const totalElements = await countDocs(db, 'comments', filter as any);
  const skip = page * size;

  const comments = await findDocs<any>(db, 'comments', {
    filter,
    sort: { createdAt: -1 },
    skip,
    limit: size,
  });

  const ids = comments.map((c) => String(c._id ?? c.id)).filter(Boolean);
  const replyCounts = new Map<string, number>();
  if (ids.length) {
    const grouped = await db
      .collection('comments')
      .aggregate([
        { $match: { parentId: { $in: ids } } },
        { $group: { _id: '$parentId', count: { $sum: 1 } } },
      ])
      .toArray();
    for (const g of grouped) replyCounts.set(String((g as any)._id), Number((g as any).count ?? 0));
  }

  const likedSet =
    params.currentUserId == null
      ? new Set<string>()
      : new Set(
          (
            await db
              .collection('comment_likes')
              .find(
                { userId: params.currentUserId, commentId: { $in: ids } },
                { projection: { commentId: 1 } }
              )
              .toArray()
          ).map((l: any) => String(l.commentId))
        );

  const content: Comment[] = comments.map((c: any) => ({
    id: String(c._id ?? c.id),
    userId: String(c.userId),
    songId: c.songId ? String(c.songId) : undefined,
    parentId: c.parentId ? String(c.parentId) : null,
    content: c.content,
    likeCount: Number(c.likeCount ?? 0),
    edited: !!c.edited,
    likedByCurrentUser: likedSet.has(String(c._id ?? c.id)),
    replyCount: replyCounts.get(String(c._id ?? c.id)) ?? 0,
    createdAt: asIso(c.createdAt),
    updatedAt: c.updatedAt ? asIso(c.updatedAt) : null,
  }));

  return makePageResponse({ content, totalElements, page, size });
}

export async function getCommentCount(songId: UUID): Promise<number> {
  const db = await getDb();
  return db.collection('comments').countDocuments({ songId, parentId: null });
}

export async function getPostCommentCount(postId: string): Promise<number> {
  const db = await getDb();
  return db.collection('comments').countDocuments({ postId, parentId: null });
}

// ─────────────────────────────────────────────────────────────────────────────
// Hearts
// ─────────────────────────────────────────────────────────────────────────────

export async function isHearted(params: { userId: UUID; songId: UUID }): Promise<boolean> {
  const db = await getDb();
  const doc = await db.collection('hearts').findOne({ userId: params.userId, songId: params.songId });
  return !!doc;
}

export async function getMyHeartedSongIds(userId: UUID): Promise<string[]> {
  const db = await getDb();
  const docs = await db
    .collection('hearts')
    .find({ userId }, { projection: { songId: 1, _id: 0 } })
    .limit(5000)
    .toArray();
  return docs.map((d: any) => String(d.songId));
}

export async function checkHeartedBatch(params: { userId: UUID; songIds: string[] }): Promise<Record<string, boolean>> {
  const db = await getDb();
  const docs = await db
    .collection('hearts')
    .find({ userId: params.userId, songId: { $in: params.songIds } }, { projection: { songId: 1, _id: 0 } })
    .toArray();
  const heartedSet = new Set(docs.map((d: any) => String(d.songId)));
  const result: Record<string, boolean> = {};
  for (const id of params.songIds) result[id] = heartedSet.has(id);
  return result;
}

export async function getArtistStatsBatch(artistIds: string[]): Promise<any[]> {
  const db = await getDb();

  const [followerCounts, listenCounts, likeCounts, shareCounts] = await Promise.all([
    db.collection('follows').aggregate([
      { $match: { artistId: { $in: artistIds } } },
      { $group: { _id: '$artistId', count: { $sum: 1 } } },
    ]).toArray(),
    db.collection('listen_history').aggregate([
      { $match: { artistId: { $in: artistIds } } },
      { $group: { _id: '$artistId', count: { $sum: 1 } } },
    ]).toArray(),
    db.collection('reactions').aggregate([
      { $match: { artistId: { $in: artistIds }, type: 'LIKE' } },
      { $group: { _id: '$artistId', count: { $sum: 1 } } },
    ]).toArray(),
    db.collection('shares').aggregate([
      { $match: { artistId: { $in: artistIds } } },
      { $group: { _id: '$artistId', count: { $sum: 1 } } },
    ]).toArray(),
  ]);

  const toMap = (arr: any[]) => new Map(arr.map((g: any) => [String(g._id), Number(g.count)]));
  const fMap = toMap(followerCounts);
  const lMap = toMap(listenCounts);
  const liMap = toMap(likeCounts);
  const sMap = toMap(shareCounts);

  return artistIds.map((id) => ({
    artistId: id,
    followerCount: fMap.get(id) ?? 0,
    totalListens: lMap.get(id) ?? 0,
    totalLikes: liMap.get(id) ?? 0,
    totalShares: sMap.get(id) ?? 0,
  }));
}

export async function getHeartCount(songId: UUID): Promise<number> {
  const db = await getDb();
  return db.collection('hearts').countDocuments({ songId });
}

export async function getMyHearts(params: {
  userId: UUID;
  page: number;
  size: number;
}): Promise<PageResponse<HeartResponse>> {
  const db = await getDb();
  const page = Math.max(0, params.page);
  const size = Math.max(1, params.size);

  const filter = { userId: params.userId };
  const totalElements = await db.collection('hearts').countDocuments(filter);
  const skip = page * size;

  const hearts = await findDocs<any>(db, 'hearts', {
    filter,
    sort: { createdAt: -1 },
    skip,
    limit: size,
  });

  const songIds = hearts.map((h) => String(h.songId)).filter(Boolean);

  // Batch count total hearts per song.
  const counts = new Map<string, number>();
  if (songIds.length) {
    const grouped = await db
      .collection('hearts')
      .aggregate([
        { $match: { songId: { $in: songIds } } },
        { $group: { _id: '$songId', count: { $sum: 1 } } },
      ])
      .toArray();
    for (const g of grouped) counts.set(String((g as any)._id), Number((g as any).count ?? 0));
  }

  const content: HeartResponse[] = hearts.map((h: any) => {
    const songId = String(h.songId);
    return {
      id: String(h._id ?? h.id),
      userId: String(h.userId),
      songId,
      totalHearts: counts.get(songId) ?? 0,
      createdAt: asIso(h.createdAt),
    };
  });

  return makePageResponse({ content, totalElements, page, size });
}

// ─────────────────────────────────────────────────────────────────────────────
// Follows
// ─────────────────────────────────────────────────────────────────────────────

export async function isFollowing(params: { followerId: UUID; artistId: UUID }): Promise<boolean> {
  const db = await getDb();
  const doc = await db.collection('follows').findOne({ followerId: params.followerId, artistId: params.artistId });
  return !!doc;
}

export async function getFollowedArtists(params: {
  followerId: UUID;
  page: number;
  size: number;
}): Promise<PageResponse<FollowResponse>> {
  const db = await getDb();
  const page = Math.max(0, params.page);
  const size = Math.max(1, params.size);

  const filter = { followerId: params.followerId };
  const totalElements = await db.collection('follows').countDocuments(filter);
  const skip = page * size;

  const rows = await findDocs<any>(db, 'follows', {
    filter,
    sort: { createdAt: -1 },
    skip,
    limit: size,
  });

  const content: FollowResponse[] = rows.map((f: any) => ({
    id: String(f._id ?? f.id),
    followerId: String(f.followerId),
    artistId: String(f.artistId),
    createdAt: asIso(f.createdAt),
  }));

  return makePageResponse({ content, totalElements, page, size });
}

export async function getArtistFollowers(params: {
  artistId: UUID;
  page: number;
  size: number;
}): Promise<PageResponse<FollowResponse>> {
  const db = await getDb();
  const page = Math.max(0, params.page);
  const size = Math.max(1, params.size);

  const filter = { artistId: params.artistId };
  const totalElements = await db.collection('follows').countDocuments(filter);
  const skip = page * size;

  const rows = await findDocs<any>(db, 'follows', {
    filter,
    sort: { createdAt: -1 },
    skip,
    limit: size,
  });

  const content: FollowResponse[] = rows.map((f: any) => ({
    id: String(f._id ?? f.id),
    followerId: String(f.followerId),
    artistId: String(f.artistId),
    createdAt: asIso(f.createdAt),
  }));

  return makePageResponse({ content, totalElements, page, size });
}

export async function getArtistStats(params: {
  artistId: UUID;
}): Promise<ArtistStatsResponse> {
  const db = await getDb();
  const { artistId } = params;

  const followerCount = await db.collection('follows').countDocuments({ artistId });
  const totalListens = await db.collection('listen_history').countDocuments({ artistId });
  const totalLikes = await db
    .collection('reactions')
    .countDocuments({ artistId, type: 'LIKE' as ReactionType });
  const totalShares = await db.collection('song_shares').countDocuments({ artistId });

  return {
    artistId,
    followerCount,
    totalListens,
    totalLikes,
    totalShares,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Shares
// ─────────────────────────────────────────────────────────────────────────────

export async function getSongShareCount(songId: UUID): Promise<number> {
  const db = await getDb();
  return db.collection('song_shares').countDocuments({ songId });
}

export async function recordSongShare(params: {
  songId: UUID;
  artistId?: UUID | null;
  userId?: UUID | null;
  platform: string;
}): Promise<void> {
  const db = await getDb();
  await db.collection('song_shares').insertOne({
    songId: params.songId,
    artistId: params.artistId ?? null,
    userId: params.userId ?? null,
    platform: params.platform,
    createdAt: new Date(),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Reactions
// ─────────────────────────────────────────────────────────────────────────────

export async function getReactionSummary(songId: UUID): Promise<ReactionResponse> {
  const db = await getDb();
  const [likeCount, dislikeCount] = await Promise.all([
    db.collection('reactions').countDocuments({ songId, type: 'LIKE' }),
    db.collection('reactions').countDocuments({ songId, type: 'DISLIKE' }),
  ]);
  return { songId, likeCount, dislikeCount };
}

export async function getUserReaction(params: {
  userId: UUID;
  songId: UUID;
}): Promise<ReactionResponse | null> {
  const db = await getDb();
  const reaction = await db.collection('reactions').findOne({
    userId: params.userId,
    songId: params.songId,
  });
  if (!reaction) return null;

  const [likeCount, dislikeCount] = await Promise.all([
    db.collection('reactions').countDocuments({ songId: params.songId, type: 'LIKE' }),
    db.collection('reactions').countDocuments({ songId: params.songId, type: 'DISLIKE' }),
  ]);
  return {
    id: String(reaction._id),
    userId: String(reaction.userId),
    songId: String(reaction.songId),
    type: reaction.type as ReactionType,
    likeCount,
    dislikeCount,
    createdAt: asIso(reaction.createdAt),
    updatedAt: reaction.updatedAt ? asIso(reaction.updatedAt) : null,
  };
}

export async function getReactionLikers(params: {
  songId: UUID;
  page: number;
  size: number;
}): Promise<PageResponse<ReactionUserEntry>> {
  const db = await getDb();
  const page = Math.max(0, params.page);
  const size = Math.max(1, params.size);

  const filter = { songId: params.songId, type: 'LIKE' };
  const totalElements = await countDocs(db, 'reactions', filter);
  const skip = page * size;

  const rows = await findDocs<any>(db, 'reactions', {
    filter,
    sort: { createdAt: -1 },
    skip,
    limit: size,
  });

  const content: ReactionUserEntry[] = rows.map((r: any) => ({
    userId: String(r.userId),
    type: r.type as ReactionType,
    reactedAt: asIso(r.createdAt),
  }));

  return makePageResponse({ content, totalElements, page, size });
}

export async function getReactionDislikers(params: {
  songId: UUID;
  page: number;
  size: number;
}): Promise<PageResponse<ReactionUserEntry>> {
  const db = await getDb();
  const page = Math.max(0, params.page);
  const size = Math.max(1, params.size);

  const filter = { songId: params.songId, type: 'DISLIKE' };
  const totalElements = await countDocs(db, 'reactions', filter);
  const skip = page * size;

  const rows = await findDocs<any>(db, 'reactions', {
    filter,
    sort: { createdAt: -1 },
    skip,
    limit: size,
  });

  const content: ReactionUserEntry[] = rows.map((r: any) => ({
    userId: String(r.userId),
    type: r.type as ReactionType,
    reactedAt: asIso(r.createdAt),
  }));

  return makePageResponse({ content, totalElements, page, size });
}

// ─────────────────────────────────────────────────────────────────────────────
// Listen History (paginated, user-facing)
// ─────────────────────────────────────────────────────────────────────────────

export async function getUserListenHistory(params: {
  userId: UUID;
  page: number;
  size: number;
}): Promise<PageResponse<ListenHistoryResponse>> {
  const db = await getDb();
  const page = Math.max(0, params.page);
  const size = Math.max(1, params.size);

  const filter = { userId: params.userId };
  const totalElements = await countDocs(db, 'listen_history', filter);
  const skip = page * size;

  const docs = await findDocs<any>(db, 'listen_history', {
    filter,
    sort: { listenedAt: -1 },
    skip,
    limit: size,
  });

  const content: ListenHistoryResponse[] = docs.map((d: any) => ({
    id: String(d._id ?? d.id),
    userId: String(d.userId),
    songId: String(d.songId),
    artistId: String(d.artistId),
    playlistId: d.playlistId ? String(d.playlistId) : null,
    albumId: d.albumId ? String(d.albumId) : null,
    durationSeconds: Number(d.durationSeconds ?? 0),
    listenedAt: asIso(d.listenedAt),
  }));

  return makePageResponse({ content, totalElements, page, size });
}

export async function getSongListenCount(songId: UUID): Promise<number> {
  const db = await getDb();
  return db.collection('listen_history').countDocuments({ songId });
}

