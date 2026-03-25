export type UUID = string;

export type FeedContentType = 'SONG' | 'ALBUM' | 'PLAYLIST' | 'TEXT';
export type FeedVisibility = 'PUBLIC' | 'FOLLOWERS_ONLY' | 'PRIVATE';
export type ReactionType = 'LIKE' | 'DISLIKE';

export type FeedPost = {
  id: string;
  ownerId: UUID;
  ownerType: string;
  contentType: string;
  contentId?: UUID;
  title?: string | null;
  caption?: string | null;
  coverImageUrl?: string | null;
  visibility: FeedVisibility;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  likedByCurrentUser: boolean;
  createdAt: string;
};

export type Comment = {
  id: string;
  userId: UUID;
  songId?: UUID;
  postId?: string;
  parentId?: string | null;
  content: string;
  likeCount: number;
  edited: boolean;
  likedByCurrentUser: boolean;
  replyCount: number;
  createdAt: string;
  updatedAt?: string | null;
};

export type ReactionResponse = {
  id?: string | null;
  userId?: UUID | null;
  songId: UUID;
  type?: ReactionType | null;
  likeCount: number;
  dislikeCount: number;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ReactionUserEntry = {
  userId: UUID;
  type: ReactionType;
  reactedAt: string;
};

export type HeartResponse = {
  id?: string;
  userId: UUID;
  songId: UUID;
  totalHearts: number;
  createdAt: string;
};

export type FollowResponse = {
  id: string;
  followerId: UUID;
  artistId: UUID;
  createdAt: string;
};

export type ArtistStatsResponse = {
  artistId: UUID;
  followerCount: number;
  totalListens: number;
  totalLikes: number;
  totalShares: number;
};

export type ShareResponse = {
  shareUrl: string;
  qrCodeBase64?: string;
  platform?: string;
  shareCount?: number;
};

export type ListenHistoryResponse = {
  id: string;
  userId: UUID;
  songId: UUID;
  artistId: UUID;
  playlistId?: UUID | null;
  albumId?: UUID | null;
  durationSeconds: number;
  listenedAt: string;
};

export type SongListenEvent = {
  songId: string;
  artistId: string;
  userId: string;
  playlistId?: string | null;
  albumId?: string | null;
  durationSeconds: number;
  listenedAt?: string | null;
};

export type FeedContentEvent = {
  contentId: string;
  contentType: string;
  artistId: string;
  title?: string;
  coverImageUrl?: string;
  visibility?: string;
  publishedAt?: string;
};
