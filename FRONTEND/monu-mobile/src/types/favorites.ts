/**
 * Types cho Favorites feature - Pick Favorites Onboarding
 */

export interface Genre {
  id: string;
  name: string;
  description?: string;
}

export interface Artist {
  id: string;
  stageName: string;
  bio?: string;
  avatarUrl?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

export interface Favorites {
  pickFavorite: boolean;
  favoriteGenreIds: string[];
  favoriteArtistIds: string[];
}

export interface UpdateFavoritesRequest {
  favoriteGenreIds: string[];
  favoriteArtistIds: string[];
}
