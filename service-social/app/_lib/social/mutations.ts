import { ObjectId } from 'mongodb';
import { getDb } from '../mongo';
import { deleteKey, sAdd, sRem, setJson, getJson } from '../cache';
import { AppError } from '../helpers';
import type {
  UUID, FeedPost, FeedVisibility, FeedContentType,
  Comment, FollowResponse, HeartResponse, ReactionType,
  ReactionResponse, SongListenEvent, FeedContentEvent,
} from './types';

function asIso(d: unknown): string {
  if (!d) return '';
  if (d instanceof Date) return d.toISOString();
  if (typeof d === 'string') return d;
  return '';
}

function mapFeedPost(p: any, likedByCurrentUser: boolean): FeedPost {
  return {
    id: String(p._id ?? p.id),
    ownerId: String(p.ownerId),
    ownerType: p.ownerType,
    ownerDisplayName: p.ownerDisplayName ?? null,
    ownerAvatarUrl: p.ownerAvatarUrl ?? null,
    contentType: p.contentType,
    contentId: p.contentId ? String(p.contentId) : undefined,
    title: p.title ?? null,
    caption: p.caption ?? null,
    coverImageUrl: p.coverImageUrl ?? null,
    visibility: p.visibility,
    likeCount: Number(p.likeCount ?? 0),
    commentCount: Number(p.commentCount ?? 0),
    shareCount: Number(p.shareCount ?? 0),
    likedByCurrentUser,
    createdAt: asIso(p.createdAt),
  };
}

function mapComment(c: any, likedByCurrentUser: boolean, replyCount: number): Comment {
  return {
    id: String(c._id ?? c.id),
    userId: String(c.userId),
    songId: c.songId ? String(c.songId) : undefined,
    postId: c.postId ? String(c.postId) : undefined,
    parentId: c.parentId ? String(c.parentId) : null,
    content: c.content,
    likeCount: Number(c.likeCount ?? 0),
    edited: !!c.edited,
    likedByCurrentUser,
    replyCount,
    createdAt: asIso(c.createdAt),
    updatedAt: c.updatedAt ? asIso(c.updatedAt) : null,
  };
}

// ── Famous artists cache ──────────────────────────────────────────────────

const FAMOUS_THRESHOLD = 500;
const FAMOUS_ARTISTS_KEY = 'social:famous:artists';

export async function rebuildFamousArtistsCache(): Promise<void> {
  try {
    const db = await getDb();
    await deleteKey(FAMOUS_ARTISTS_KEY);

    const rows = await db
      .collection('follows')
      .aggregate([
        { $group: { _id: '$artistId', count: { $sum: 1 } } },
        { $match: { count: { $gte: FAMOUS_THRESHOLD } } },
      ])
      .toArray();

    if (rows.length > 0) {
      await sAdd(FAMOUS_ARTISTS_KEY, ...rows.map((r: any) => String(r._id)));
      console.log(`[famous-cache] Rebuilt: ${rows.length} artists`);
    } else {
      console.log('[famous-cache] No famous artists found');
    }
  } catch (err) {
    console.warn('[famous-cache] Rebuild failed:', err);
  }
}

async function updateFamousStatus(artistId: string): Promise<void> {
  try {
    const db = await getDb();
    const count = await db.collection('follows').countDocuments({ artistId });
    if (count >= FAMOUS_THRESHOLD) {
      await sAdd(FAMOUS_ARTISTS_KEY, artistId);
    } else {
      await sRem(FAMOUS_ARTISTS_KEY, artistId);
    }
  } catch {}
}

async function evictFollowCache(followerId: string): Promise<void> {
  try { await deleteKey(`rec:follows:artists:${followerId}`); } catch {}
}

// ── Feed mutations ────────────────────────────────────────────────────────

export async function createFeedPost(params: {
  ownerId: UUID;
  ownerType: string;
  ownerDisplayName?: string | null;
  ownerAvatarUrl?: string | null;
  contentType?: string;
  contentId?: string;
  title?: string;
  caption?: string;
  coverImageUrl?: string;
  visibility?: FeedVisibility;
}): Promise<FeedPost> {
  const db = await getDb();
  const now = new Date();

  const doc = {
    ownerId: params.ownerId,
    ownerType: params.ownerType,
    ownerDisplayName: params.ownerDisplayName ?? null,
    ownerAvatarUrl: params.ownerAvatarUrl ?? null,
    contentType: params.contentType ?? 'TEXT',
    contentId: params.contentId ?? null,
    title: params.title ?? null,
    caption: params.caption ?? null,
    coverImageUrl: params.coverImageUrl ?? null,
    visibility: params.visibility ?? 'PUBLIC',
    likeCount: 0,
    commentCount: 0,
    shareCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection('feed_posts').insertOne(doc);
  return mapFeedPost({ ...doc, _id: result.insertedId }, false);
}

export async function updateFeedPost(params: {
  userId: UUID;
  postId: string;
  caption?: string;
  visibility?: FeedVisibility;
}): Promise<FeedPost> {
  const db = await getDb();
  let oid: ObjectId;
  try { oid = new ObjectId(params.postId); } catch { throw new AppError(4052, 'Feed post not found', 404); }

  const post = await db.collection('feed_posts').findOne({ _id: oid });
  if (!post) throw new AppError(4052, 'Feed post not found', 404);
  if (String(post.ownerId) !== params.userId) throw new AppError(9996, 'Access denied', 403);

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (params.caption !== undefined) update.caption = params.caption;
  if (params.visibility !== undefined) update.visibility = params.visibility;

  await db.collection('feed_posts').updateOne({ _id: oid }, { $set: update });
  const updated = await db.collection('feed_posts').findOne({ _id: oid });
  const liked = await db.collection('feed_post_likes').findOne({
    userId: params.userId, postId: params.postId,
  });
  return mapFeedPost(updated!, !!liked);
}

export async function deleteFeedPost(params: { userId: UUID; postId: string }): Promise<void> {
  const db = await getDb();
  let oid: ObjectId;
  try { oid = new ObjectId(params.postId); } catch { throw new AppError(4052, 'Feed post not found', 404); }

  const post = await db.collection('feed_posts').findOne({ _id: oid });
  if (!post) throw new AppError(4052, 'Feed post not found', 404);
  if (String(post.ownerId) !== params.userId) throw new AppError(9996, 'Access denied', 403);

  await Promise.all([
    db.collection('comments').deleteMany({ postId: params.postId }),
    db.collection('feed_post_likes').deleteMany({ postId: params.postId }),
    db.collection('feed_posts').deleteOne({ _id: oid }),
  ]);
}

export async function likeFeedPost(params: { userId: UUID; postId: string }): Promise<void> {
  const db = await getDb();
  let oid: ObjectId;
  try { oid = new ObjectId(params.postId); } catch { throw new AppError(4052, 'Feed post not found', 404); }

  const post = await db.collection('feed_posts').findOne({ _id: oid });
  if (!post) throw new AppError(4052, 'Feed post not found', 404);

  const existing = await db.collection('feed_post_likes').findOne({
    userId: params.userId, postId: params.postId,
  });
  if (existing) throw new AppError(4053, 'Already liked this post', 409);

  await db.collection('feed_post_likes').insertOne({
    userId: params.userId,
    postId: params.postId,
    createdAt: new Date(),
  });
  await db.collection('feed_posts').updateOne({ _id: oid }, { $inc: { likeCount: 1 } });
}

export async function unlikeFeedPost(params: { userId: UUID; postId: string }): Promise<void> {
  const db = await getDb();
  let oid: ObjectId;
  try { oid = new ObjectId(params.postId); } catch { throw new AppError(4052, 'Feed post not found', 404); }

  const post = await db.collection('feed_posts').findOne({ _id: oid });
  if (!post) throw new AppError(4052, 'Feed post not found', 404);

  const existing = await db.collection('feed_post_likes').findOne({
    userId: params.userId, postId: params.postId,
  });
  if (!existing) return;

  await db.collection('feed_post_likes').deleteOne({ userId: params.userId, postId: params.postId });
  await db.collection('feed_posts').updateOne(
    { _id: oid, likeCount: { $gt: 0 } },
    { $inc: { likeCount: -1 } },
  );
}

export async function createFeedPostFromEvent(event: FeedContentEvent): Promise<void> {
  const db = await getDb();
  const contentType = event.contentType ?? 'ALBUM';

  const exists = await db.collection('feed_posts').findOne({
    contentId: event.contentId,
    contentType,
    ownerId: event.artistId,
  });
  if (exists) return;

  await db.collection('feed_posts').insertOne({
    ownerId: event.artistId,
    ownerType: 'ARTIST',
    contentType,
    contentId: event.contentId,
    title: event.title ?? null,
    coverImageUrl: event.coverImageUrl ?? null,
    visibility: 'PUBLIC',
    likeCount: 0,
    commentCount: 0,
    shareCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

// ── Comment mutations ─────────────────────────────────────────────────────

const EDIT_WINDOW_MS = 15 * 60 * 1000;

export async function addComment(params: {
  userId: UUID;
  songId: UUID;
  parentId?: string | null;
  content: string;
}): Promise<Comment> {
  const db = await getDb();

  if (params.parentId) {
    const parent = await db.collection('comments').findOne({ _id: new ObjectId(params.parentId) });
    if (!parent) throw new AppError(4031, 'Comment not found', 404);
  }

  const now = new Date();
  const doc = {
    userId: params.userId,
    songId: params.songId,
    postId: null,
    parentId: params.parentId ?? null,
    content: params.content,
    likeCount: 0,
    edited: false,
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection('comments').insertOne(doc);
  return mapComment({ ...doc, _id: result.insertedId }, false, 0);
}

export async function updateComment(params: {
  userId: UUID;
  commentId: string;
  content: string;
}): Promise<Comment> {
  const db = await getDb();
  let oid: ObjectId;
  try { oid = new ObjectId(params.commentId); } catch { throw new AppError(4031, 'Comment not found', 404); }

  const comment = await db.collection('comments').findOne({ _id: oid });
  if (!comment) throw new AppError(4031, 'Comment not found', 404);
  if (String(comment.userId) !== params.userId) throw new AppError(9996, 'Access denied', 403);

  const createdAt = comment.createdAt instanceof Date ? comment.createdAt.getTime() : new Date(comment.createdAt).getTime();
  if (Date.now() - createdAt > EDIT_WINDOW_MS) {
    throw new AppError(9995, 'Edit window expired (15 min)', 403);
  }

  const now = new Date();
  await db.collection('comments').updateOne(
    { _id: oid },
    { $set: { content: params.content, edited: true, updatedAt: now } },
  );

  const updated = await db.collection('comments').findOne({ _id: oid });
  const liked = await db.collection('comment_likes').findOne({
    userId: params.userId, commentId: params.commentId,
  });
  const replyCount = await db.collection('comments').countDocuments({ parentId: params.commentId });
  return mapComment(updated!, !!liked, replyCount);
}

export async function deleteComment(params: { userId: UUID; commentId: string }): Promise<void> {
  const db = await getDb();
  let oid: ObjectId;
  try { oid = new ObjectId(params.commentId); } catch { throw new AppError(4031, 'Comment not found', 404); }

  const comment = await db.collection('comments').findOne({ _id: oid });
  if (!comment) throw new AppError(4031, 'Comment not found', 404);
  if (String(comment.userId) !== params.userId) throw new AppError(9996, 'Access denied', 403);

  await db.collection('comments').deleteOne({ _id: oid });
}

export async function likeComment(params: { userId: UUID; commentId: string }): Promise<void> {
  const db = await getDb();
  let oid: ObjectId;
  try { oid = new ObjectId(params.commentId); } catch { throw new AppError(4031, 'Comment not found', 404); }

  const comment = await db.collection('comments').findOne({ _id: oid });
  if (!comment) throw new AppError(4031, 'Comment not found', 404);

  const existing = await db.collection('comment_likes').findOne({
    userId: params.userId, commentId: params.commentId,
  });
  if (existing) throw new AppError(4032, 'Already liked this comment', 409);

  await db.collection('comment_likes').insertOne({
    userId: params.userId,
    commentId: params.commentId,
    createdAt: new Date(),
  });
  await db.collection('comments').updateOne({ _id: oid }, { $inc: { likeCount: 1 } });
}

export async function unlikeComment(params: { userId: UUID; commentId: string }): Promise<void> {
  const db = await getDb();
  let oid: ObjectId;
  try { oid = new ObjectId(params.commentId); } catch { throw new AppError(4031, 'Comment not found', 404); }

  const comment = await db.collection('comments').findOne({ _id: oid });
  if (!comment) throw new AppError(4031, 'Comment not found', 404);

  const existing = await db.collection('comment_likes').findOne({
    userId: params.userId, commentId: params.commentId,
  });
  if (!existing) return;

  await db.collection('comment_likes').deleteOne({ userId: params.userId, commentId: params.commentId });
  await db.collection('comments').updateOne(
    { _id: oid, likeCount: { $gt: 0 } },
    { $inc: { likeCount: -1 } },
  );
}

export async function addPostComment(params: {
  userId: UUID;
  postId: string;
  parentId?: string | null;
  content: string;
}): Promise<Comment> {
  const db = await getDb();

  if (params.parentId) {
    let oid: ObjectId;
    try { oid = new ObjectId(params.parentId); } catch { throw new AppError(4031, 'Comment not found', 404); }
    const parent = await db.collection('comments').findOne({ _id: oid });
    if (!parent) throw new AppError(4031, 'Comment not found', 404);
  }

  const now = new Date();
  const doc = {
    userId: params.userId,
    songId: null,
    postId: params.postId,
    parentId: params.parentId ?? null,
    content: params.content,
    likeCount: 0,
    edited: false,
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection('comments').insertOne(doc);

  let postOid: ObjectId | undefined;
  try { postOid = new ObjectId(params.postId); } catch {}
  if (postOid) {
    await db.collection('feed_posts').updateOne(
      { _id: postOid },
      { $inc: { commentCount: 1 } },
    );
  }

  return mapComment({ ...doc, _id: result.insertedId }, false, 0);
}

// ── Reaction mutations ────────────────────────────────────────────────────

async function buildReactionSummary(
  db: any, userId: UUID | null, songId: UUID, reaction: any | null,
): Promise<ReactionResponse> {
  const [likeCount, dislikeCount] = await Promise.all([
    db.collection('reactions').countDocuments({ songId, type: 'LIKE' }),
    db.collection('reactions').countDocuments({ songId, type: 'DISLIKE' }),
  ]);
  return {
    id: reaction ? String(reaction._id ?? reaction.id) : null,
    userId,
    songId,
    type: reaction?.type ?? null,
    likeCount,
    dislikeCount,
    createdAt: reaction ? asIso(reaction.createdAt) : null,
    updatedAt: reaction ? asIso(reaction.updatedAt) : null,
  };
}

export async function likeReaction(params: {
  userId: UUID; songId: UUID; artistId?: UUID;
}): Promise<ReactionResponse> {
  const db = await getDb();
  const existing = await db.collection('reactions').findOne({
    userId: params.userId, songId: params.songId,
  });

  if (existing) {
    if (existing.type === 'LIKE') {
      await db.collection('reactions').deleteOne({ _id: existing._id });
      return buildReactionSummary(db, params.userId, params.songId, null);
    }
    await db.collection('reactions').updateOne(
      { _id: existing._id },
      { $set: { type: 'LIKE', updatedAt: new Date() } },
    );
    const updated = await db.collection('reactions').findOne({ _id: existing._id });
    return buildReactionSummary(db, params.userId, params.songId, updated);
  }

  const now = new Date();
  const result = await db.collection('reactions').insertOne({
    userId: params.userId,
    songId: params.songId,
    artistId: params.artistId ?? null,
    type: 'LIKE',
    createdAt: now,
    updatedAt: now,
  });
  const created = await db.collection('reactions').findOne({ _id: result.insertedId });
  return buildReactionSummary(db, params.userId, params.songId, created);
}

export async function dislikeReaction(params: {
  userId: UUID; songId: UUID; artistId?: UUID;
}): Promise<ReactionResponse> {
  const db = await getDb();
  const existing = await db.collection('reactions').findOne({
    userId: params.userId, songId: params.songId,
  });

  if (existing) {
    if (existing.type === 'DISLIKE') {
      await db.collection('reactions').deleteOne({ _id: existing._id });
      return buildReactionSummary(db, params.userId, params.songId, null);
    }
    await db.collection('reactions').updateOne(
      { _id: existing._id },
      { $set: { type: 'DISLIKE', updatedAt: new Date() } },
    );
    const updated = await db.collection('reactions').findOne({ _id: existing._id });
    return buildReactionSummary(db, params.userId, params.songId, updated);
  }

  const now = new Date();
  const result = await db.collection('reactions').insertOne({
    userId: params.userId,
    songId: params.songId,
    artistId: params.artistId ?? null,
    type: 'DISLIKE',
    createdAt: now,
    updatedAt: now,
  });
  const created = await db.collection('reactions').findOne({ _id: result.insertedId });
  return buildReactionSummary(db, params.userId, params.songId, created);
}

export async function removeReaction(params: { userId: UUID; songId: UUID }): Promise<void> {
  const db = await getDb();
  const existing = await db.collection('reactions').findOne({
    userId: params.userId, songId: params.songId,
  });
  if (!existing) throw new AppError(4021, 'Reaction not found', 404);
  await db.collection('reactions').deleteOne({ _id: existing._id });
}

// ── Heart mutations ───────────────────────────────────────────────────────

export async function heartSong(params: { userId: UUID; songId: UUID }): Promise<HeartResponse> {
  const db = await getDb();
  const existing = await db.collection('hearts').findOne({
    userId: params.userId, songId: params.songId,
  });
  if (existing) throw new AppError(4011, 'Already hearted this song', 409);

  const now = new Date();
  const result = await db.collection('hearts').insertOne({
    userId: params.userId,
    songId: params.songId,
    createdAt: now,
  });
  const total = await db.collection('hearts').countDocuments({ songId: params.songId });
  return {
    id: result.insertedId.toString(),
    userId: params.userId,
    songId: params.songId,
    totalHearts: total,
    createdAt: now.toISOString(),
  };
}

export async function unheartSong(params: { userId: UUID; songId: UUID }): Promise<void> {
  const db = await getDb();
  const existing = await db.collection('hearts').findOne({
    userId: params.userId, songId: params.songId,
  });
  if (!existing) throw new AppError(4012, 'Not hearted this song', 400);
  await db.collection('hearts').deleteOne({ _id: existing._id });
}

// ── Follow mutations ──────────────────────────────────────────────────────

export async function followArtist(params: {
  followerId: UUID; artistId: UUID;
}): Promise<FollowResponse> {
  const db = await getDb();
  const existing = await db.collection('follows').findOne({
    followerId: params.followerId, artistId: params.artistId,
  });
  if (existing) throw new AppError(4001, 'Already following this artist', 409);

  const now = new Date();
  const result = await db.collection('follows').insertOne({
    followerId: params.followerId,
    artistId: params.artistId,
    createdAt: now,
  });

  evictFollowCache(params.followerId);
  updateFamousStatus(params.artistId);

  return {
    id: result.insertedId.toString(),
    followerId: params.followerId,
    artistId: params.artistId,
    createdAt: now.toISOString(),
  };
}

export async function unfollowArtist(params: {
  followerId: UUID; artistId: UUID;
}): Promise<void> {
  const db = await getDb();
  const existing = await db.collection('follows').findOne({
    followerId: params.followerId, artistId: params.artistId,
  });
  if (!existing) throw new AppError(4002, 'Not following this artist', 400);
  await db.collection('follows').deleteOne({ _id: existing._id });

  evictFollowCache(params.followerId);
  updateFamousStatus(params.artistId);
}

// ── Listen history ────────────────────────────────────────────────────────

export async function recordListenFromEvent(event: SongListenEvent): Promise<void> {
  const db = await getDb();
  const listenedAt = event.listenedAt ? new Date(event.listenedAt) : new Date();

  await db.collection('listen_history').insertOne({
    userId: event.userId,
    songId: event.songId,
    artistId: event.artistId,
    playlistId: event.playlistId ?? null,
    albumId: event.albumId ?? null,
    durationSeconds: event.durationSeconds ?? 0,
    listenedAt,
    meta: { userId: event.userId },
  });
}

// ── Share: build platform URLs ────────────────────────────────────────────

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000';

export function buildShareUrl(songId: string, platform: string | null): string {
  const url = `${FRONTEND_URL}/songs/${songId}`;
  return wrapPlatform(platform, url);
}

export function buildPlaylistShareUrl(playlistId: string, platform: string | null): string {
  const url = `${FRONTEND_URL}/playlist/${playlistId}`;
  return wrapPlatform(platform, url);
}

export function buildAlbumShareUrl(albumId: string, platform: string | null): string {
  const url = `${FRONTEND_URL}/album/${albumId}`;
  return wrapPlatform(platform, url);
}

function wrapPlatform(platform: string | null, url: string): string {
  if (!platform) return url;
  switch (platform.toLowerCase()) {
    case 'facebook': return `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    case 'twitter': return `https://twitter.com/intent/tweet?url=${url}`;
    case 'telegram': return `https://t.me/share/url?url=${url}`;
    default: return url;
  }
}

export function rawSongUrl(songId: string): string {
  return `${FRONTEND_URL}/songs/${songId}`;
}

export function rawPlaylistUrl(playlistId: string): string {
  return `${FRONTEND_URL}/playlist/${playlistId}`;
}

export function rawAlbumUrl(albumId: string): string {
  return `${FRONTEND_URL}/album/${albumId}`;
}
