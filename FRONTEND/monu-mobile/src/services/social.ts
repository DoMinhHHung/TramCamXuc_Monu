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

export const getTimeline = async (params?: { page?: number; size?: number }): Promise<PageResponse<FeedPost>> => {
  const response = await apiClient.get<PageResponse<FeedPost>>('/social/feed', { params });
  return response.data;
};

export const createFeedPost = async (payload: FeedPostRequest): Promise<FeedPost> => {
  const response = await apiClient.post<FeedPost>('/social/feed', payload);
  return response.data;
};
