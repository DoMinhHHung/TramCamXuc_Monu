import { apiClient } from './api';
import { Artist, Favorites, Genre, UpdateFavoritesRequest } from '../types/favorites';

// ─── Favorites API ────────────────────────────────────────────────────────────

/** GET /users/my-favorites */
export const getMyFavorites = async (): Promise<Favorites> => {
  const response = await apiClient.get<Favorites>('/users/my-favorites');
  return response.data;
};

/** PUT /users/my-favorites */
export const updateMyFavorites = async (data: UpdateFavoritesRequest): Promise<Favorites> => {
  const response = await apiClient.put<Favorites>('/users/my-favorites', data);
  return response.data;
};

// ─── Music API - Genres & Artists ─────────────────────────────────────────────

/** GET /genres/popular?limit=10 */
export const getPopularGenres = async (limit: number = 10): Promise<Genre[]> => {
  const response = await apiClient.get<Genre[]>(`/genres/popular`, {
    params: { limit }
  });
  return response.data;
};

/** GET /artists/popular?limit=10 */
export const getPopularArtists = async (limit: number = 10): Promise<Artist[]> => {
  const response = await apiClient.get<Artist[]>(`/artists/popular`, {
    params: { limit }
  });
  return response.data;
};
