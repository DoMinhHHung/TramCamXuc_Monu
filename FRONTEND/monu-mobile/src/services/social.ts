import { apiClient } from './api';

export interface FeedPost {
  id: string;
  ownerId: string;
  ownerType: 'ARTIST' | 'USER';
  contentType: 'SONG' | 'ALBUM' | 'PLAYLIST';
  contentId?: string;
  title?: string;
  caption?: string;
  coverImageUrl?: string;
  visibility: 'PUBLIC' | 'PRIVATE' | 'FOLLOWERS_ONLY';
  likeCount: number;
  commentCount: number;
  shareCount: number;
  likedByCurrentUser: boolean;
  createdAt: string;
}

export interface Comment {
  id: string;
  userId: string;
  songId?: string;
  parentId?: string;
  content: string;
  likeCount: number;
  edited: boolean;
  likedByCurrentUser: boolean;
  replyCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface FeedPostRequest {
  visibility: 'PUBLIC' | 'PRIVATE' | 'FOLLOWERS_ONLY';
  caption?: string;
  contentId?: string;
  contentType?: 'SONG' | 'ALBUM' | 'PLAYLIST';
  title?: string;
  coverImageUrl?: string;
}

export interface ShareResponse {
  shareUrl: string;
  qrCodeBase64?: string;
  platform?: string;
  shareCount?: number;
}

export const getTimeline = async (params?: { page?: number; size?: number }): Promise<PageResponse<FeedPost>> => {
  const response = await apiClient.get<PageResponse<FeedPost>>('/social/feed', { params });
  return response.data;
};

export const createFeedPost = async (payload: FeedPostRequest): Promise<FeedPost> => {
  const response = await apiClient.post<FeedPost>('/social/feed', payload);
  return response.data;
};

export const updateFeedPost = async (postId: string, payload: FeedPostRequest): Promise<FeedPost> => {
  const response = await apiClient.patch<FeedPost>(`/social/feed/${postId}`, payload);
  return response.data;
};

export const deleteFeedPost = async (postId: string): Promise<void> => {
  await apiClient.delete(`/social/feed/${postId}`);
};

export const likeFeedPost = async (postId: string): Promise<void> => {
  await apiClient.post(`/social/feed/${postId}/like`);
};

export const unlikeFeedPost = async (postId: string): Promise<void> => {
  await apiClient.delete(`/social/feed/${postId}/like`);
};

// comments for feed post
export const getPostComments = async (postId: string, params?: { page?: number; size?: number }): Promise<PageResponse<Comment>> => {
  const response = await apiClient.get<PageResponse<Comment>>('/social/comments/post', { params: { postId, ...params } });
  return response.data;
};

export const createPostComment = async (payload: { postId: string; content: string; parentId?: string }): Promise<Comment> => {
  const response = await apiClient.post<Comment>('/social/comments/post', payload);
  return response.data;
};

export const getCommentReplies = async (
    parentId: string,
    params?: { page?: number; size?: number },
): Promise<PageResponse<Comment>> => {
  const response = await apiClient.get<PageResponse<Comment>>(`/social/comments/${parentId}/replies`, { params });
  return response.data;
};

export const updateComment = async (commentId: string, content: string): Promise<Comment> => {
  const response = await apiClient.patch<Comment>(`/social/comments/${commentId}`, { content });
  return response.data;
};

export const deleteComment = async (commentId: string): Promise<void> => {
  await apiClient.delete(`/social/comments/${commentId}`);
};

export const likeComment = async (commentId: string): Promise<void> => {
  await apiClient.post(`/social/comments/${commentId}/like`);
};

export const unlikeComment = async (commentId: string): Promise<void> => {
  await apiClient.delete(`/social/comments/${commentId}/like`);
};

// share-service (song endpoint) + playlist link/qr helper
export const getSongShareLink = async (songId: string, platform = 'direct'): Promise<ShareResponse> => {
  const response = await apiClient.get<ShareResponse>('/social/share', { params: { songId, platform } });
  return response.data;
};

export const getSongShareQr = async (songId: string): Promise<ShareResponse> => {
  const response = await apiClient.get<ShareResponse>('/social/share/qr', { params: { songId } });
  return response.data;
};

export const getPlaylistShareLink = async (playlistId: string, platform = 'direct'): Promise<ShareResponse> => {
  const response = await apiClient.get<ShareResponse>('/social/share/playlist', { params: { playlistId, platform } });
  return response.data;
};

export const getPlaylistShareQr = async (playlistId: string): Promise<ShareResponse> => {
  const response = await apiClient.get<ShareResponse>('/social/share/playlist/qr', { params: { playlistId } });
  return response.data;
};

export const getAlbumShareLink = async (albumId: string, platform = 'direct'): Promise<ShareResponse> => {
  const response = await apiClient.get<ShareResponse>('/social/share/album', { params: { albumId, platform } });
  return response.data;
};

export const getAlbumShareQr = async (albumId: string): Promise<ShareResponse> => {
  const response = await apiClient.get<ShareResponse>('/social/share/album/qr', { params: { albumId } });
  return response.data;
};

// ─── Counts (artist stats) ────────────────────────────────────────────────────

export const getSongListenCount = async (songId: string): Promise<number> => {
  const response = await apiClient.get<number>(`/social/listen-history/count/${songId}`);
  return Number(response.data ?? 0);
};

export const getSongHeartCount = async (songId: string): Promise<number> => {
  const response = await apiClient.get<number>(`/social/hearts/count/${songId}`);
  return Number(response.data ?? 0);
};

export const getSongShareCount = async (songId: string): Promise<number> => {
  const response = await apiClient.get<number>('/social/share/count', { params: { songId } });
  return Number(response.data ?? 0);
};

export interface HeartResponse {
  id: string;
  userId: string;
  songId: string;
  totalHearts: number;
  createdAt: string;
}

export const heartSong = async (songId: string): Promise<HeartResponse> => {
  const response = await apiClient.post<HeartResponse>('/social/hearts', { songId });
  return response.data;
};

export const unheartSong = async (songId: string): Promise<void> => {
  await apiClient.delete(`/social/hearts/${songId}`);
};

export const checkHearted = async (songId: string): Promise<boolean> => {
  const response = await apiClient.get<boolean>(`/social/hearts/check/${songId}`);
  return response.data;
};

export const getMyHeartedIds = async (): Promise<string[]> => {
  const response = await apiClient.get<string[]>('/social/hearts/my-ids');
  return Array.isArray(response.data) ? response.data : [];
};

export const checkHeartedBatch = async (songIds: string[]): Promise<Record<string, boolean>> => {
  const response = await apiClient.post<Record<string, boolean>>('/social/hearts/check-batch', { songIds });
  return response.data;
};

export const getMyHearts = async (params?: { page?: number; size?: number }): Promise<PageResponse<HeartResponse>> => {
  const response = await apiClient.get<PageResponse<HeartResponse>>('/social/hearts/my', { params });
  return response.data;
};

export const getHeartCount = async (songId: string): Promise<number> => {
  const response = await apiClient.get<number>(`/social/hearts/count/${songId}`);
  return response.data;
};

// ─── FOLLOW ───────────────────────────────────────────────────────────────────

export interface FollowResponse {
  id: string;
  followerId: string;
  artistId: string;
  createdAt: string;
}

export interface ArtistStatsResponse {
  artistId: string;
  followerCount: number;
  totalListens: number;
  totalLikes: number;
  totalShares: number;
}

export interface ListenHistoryItem {
  id: string;
  userId: string;
  songId: string;
  artistId?: string;
  playlistId?: string;
  albumId?: string;
  durationSeconds: number;
  listenedAt: string;
}

export const followArtist = async (artistId: string): Promise<FollowResponse> => {
  const response = await apiClient.post<FollowResponse>('/social/follows', { artistId });
  return response.data;
};

export const unfollowArtist = async (artistId: string): Promise<void> => {
  await apiClient.delete(`/social/follows/${artistId}`);
};

export const checkFollowing = async (artistId: string): Promise<boolean> => {
  const response = await apiClient.get<boolean>(`/social/follows/check/${artistId}`);
  return response.data;
};

export const getMyFollowedArtists = async (params?: { page?: number; size?: number }): Promise<PageResponse<FollowResponse>> => {
  const response = await apiClient.get<PageResponse<FollowResponse>>('/social/follows/my-artists', { params });
  return response.data;
};

export const getArtistFollowers = async (artistId: string, params?: { page?: number; size?: number }): Promise<PageResponse<FollowResponse>> => {
  const response = await apiClient.get<PageResponse<FollowResponse>>(`/social/artists/${artistId}/followers`, { params });
  return response.data;
};

export const getArtistStats = async (artistId: string): Promise<ArtistStatsResponse> => {
  const response = await apiClient.get<ArtistStatsResponse>(`/social/artists/${artistId}/stats`);
  return response.data;
};

export const getArtistStatsBatch = async (artistIds: string[]): Promise<ArtistStatsResponse[]> => {
  const response = await apiClient.post<ArtistStatsResponse[]>('/social/artists/stats-batch', { artistIds });
  return Array.isArray(response.data) ? response.data : [];
};

export const getMyListenHistory = async (params?: { page?: number; size?: number }): Promise<PageResponse<ListenHistoryItem>> => {
  const response = await apiClient.get<PageResponse<ListenHistoryItem>>('/social/listen-history/my', { params });
  return response.data;
};

export const getArtistByUserId = async (
    userId: string,
): Promise<{ id: string; stageName: string; avatarUrl?: string } | null> => {
  try {
    const res = await apiClient.get<{ id: string; stageName: string; avatarUrl?: string }>(`/artists/by-user/${userId}`);
    const d = res.data;
    if (d?.id) return { id: d.id, stageName: d.stageName, avatarUrl: d.avatarUrl };
    return null;
  } catch {
    return null;
  }
};

export const getPublicFeed = async (params?: { page?: number; size?: number }): Promise<PageResponse<FeedPost>> => {
  const response = await apiClient.get<PageResponse<FeedPost>>('/social/feed/public', { params });
  return response.data;
};

export const getOwnerFeed = async (
  ownerId: string,
  params?: { page?: number; size?: number },
): Promise<PageResponse<FeedPost>> => {
  const response = await apiClient.get<PageResponse<FeedPost>>(`/social/feed/owner/${ownerId}`, { params });
  return response.data;
};