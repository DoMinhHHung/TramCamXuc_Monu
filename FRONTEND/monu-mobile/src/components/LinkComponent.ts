import * as Linking from 'expo-linking';

export const EXTERNAL_LINKS = {
  gateway: 'https://phazelsound.oopsgolden.id.vn',
  minioPublicSongs: 'https://minio.oopsgolden.id.vn/public-songs',
} as const;

export const buildFeedPostUrl = (postId: string): string =>
  `${EXTERNAL_LINKS.gateway}/feed/${postId}`;

export const buildOAuthUrl = (provider: 'google' | 'facebook'): string =>
  `${EXTERNAL_LINKS.gateway}/auth/oauth/${provider}`;

export const openExternalLink = async (url: string): Promise<void> => {
  await Linking.openURL(url);
};
