import { Platform } from 'react-native';

const SDK_URL = 'https://sdk.scdn.co/spotify-player.js';

export const isWebPlaybackSdkSupported = (): boolean => Platform.OS === 'web';

export const loadSpotifyWebPlaybackSdk = async (): Promise<void> => {
  if (!isWebPlaybackSdkSupported()) {
    throw new Error('Spotify Web Playback SDK chỉ hỗ trợ môi trường web browser.');
  }

  const g: any = globalThis as any;
  if (g?.Spotify) return;

  await new Promise<void>((resolve, reject) => {
    const doc = g?.document;
    if (!doc) {
      reject(new Error('Không tìm thấy document để load Spotify SDK.'));
      return;
    }

    const existing = doc.querySelector?.(`script[src="${SDK_URL}"]`);
    if (existing) {
      g.onSpotifyWebPlaybackSDKReady = () => resolve();
      return;
    }

    const script = doc.createElement('script');
    script.src = SDK_URL;
    script.async = true;
    script.onerror = () => reject(new Error('Không tải được Spotify Web Playback SDK.'));

    g.onSpotifyWebPlaybackSDKReady = () => resolve();
    doc.body?.appendChild(script);
  });
};

export const createSpotifyWebPlayer = async (accessToken: string, name = 'Trạm Cảm Xúc Web Player') => {
  if (!accessToken) throw new Error('Thiếu access token cho Spotify player.');
  await loadSpotifyWebPlaybackSdk();

  const g: any = globalThis as any;
  const SpotifyCtor = g?.Spotify;
  if (!SpotifyCtor) throw new Error('Spotify SDK chưa sẵn sàng.');

  return new SpotifyCtor.Player({
    name,
    getOAuthToken: (cb: (token: string) => void) => cb(accessToken),
    volume: 0.8,
  });
};
