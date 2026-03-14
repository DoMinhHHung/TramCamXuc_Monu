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
  visibility: 'PUBLIC' | 'PRIVATE' | 'FOLLOWERS';
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
  visibility: 'PUBLIC' | 'PRIVATE' | 'FOLLOWERS';
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
