import axios, {
  AxiosAdapter,
  AxiosError,
  AxiosHeaders,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';

import { env } from '../config/env';

interface ApiResponse<T> {
  code?: number;
  message?: string;
  result: T;
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  authenticated: boolean;
}

interface QueuedRequest {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

interface CachedEntry {
  expiresAt: number;
  response: AxiosResponse;
}

const REFRESH_ENDPOINT = '/auth/refresh';
const DEFAULT_GET_CACHE_TTL_MS = 15000;
const DISABLE_CACHE_TTL_MS = 0;

let accessTokenInMemory: string | null = null;
let refreshTokenGetter: (() => Promise<string | null>) | null = null;
let persistTokensHandler: ((tokens: { accessToken: string; refreshToken: string }) => Promise<void>) | null = null;
let logoutHandler: (() => Promise<void> | void) | null = null;

let isRefreshing = false;
let failedQueue: QueuedRequest[] = [];

const getCacheStore = new Map<string, CachedEntry>();

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach((queuedRequest) => {
    if (error || !token) {
      queuedRequest.reject(error ?? new Error('Unable to refresh access token.'));
      return;
    }

    queuedRequest.resolve(token);
  });

  failedQueue = [];
};

const setAuthorizationHeader = (request: AxiosRequestConfig, token: string) => {
  if (request.headers instanceof AxiosHeaders) {
    request.headers.set('Authorization', `Bearer ${token}`);
    return;
  }

  request.headers = {
    ...(request.headers ?? {}),
    Authorization: `Bearer ${token}`,
  };
};

const buildCacheKey = (config: InternalAxiosRequestConfig): string => {
  const method = (config.method ?? 'get').toUpperCase();
  const url = config.baseURL ? `${config.baseURL}${config.url ?? ''}` : `${config.url ?? ''}`;
  const params = config.params ? JSON.stringify(config.params) : '';
  const auth = accessTokenInMemory ?? '';
  return `${method}|${url}|${params}|${auth}`;
};

const cacheHitAdapter = (cached: AxiosResponse): AxiosAdapter => {
  return async () => ({ ...cached, request: { fromCache: true } });
};

const clearGetCache = () => {
  getCacheStore.clear();
};

const normalizeUrlPath = (url?: string): string => {
  if (!url) return '';
  const withoutQuery = url.split('?')[0] ?? '';
  return withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;
};

const resolveGetCacheTtlMs = (config: InternalAxiosRequestConfig): number => {
  const path = normalizeUrlPath(config.url);

  if (!path) return DEFAULT_GET_CACHE_TTL_MS;

  if (/^\/songs\/[^/]+\/stream$/i.test(path)) return DISABLE_CACHE_TTL_MS;

  if (path === '/social/feed') return 20000;
  if (path.startsWith('/social/comments')) return 15000;

  if (
    path === '/songs/trending'
    || path === '/songs/newest'
    || path === '/artists/popular'
    || path === '/genres/popular'
  ) {
    return 120000;
  }

  if (
    path === '/playlists/my-playlists'
    || path === '/songs/my-songs'
    || path === '/albums/my'
    || path === '/social/listen-history/my'
    || path === '/recommendations/insights'
    || path === '/social/hearts/my'
    || path === '/social/follows/my-artists'
    || /^\/social\/artists\/[^/]+\/followers$/i.test(path)
  ) {
    return 300000;
  }

  if (
    path === '/subscriptions/plans'
  ) {
    return 300000;
  }

  if (
    path === '/subscriptions/my'
    || path === '/subscriptions/my/history'
  ) {
    return 30000;
  }

  if (
    /^\/songs\/[^/]+$/i.test(path)
    || /^\/albums\/(my\/)?[^/]+$/i.test(path)
    || /^\/playlists\/(id\/)?[^/]+$/i.test(path)
    || /^\/artists\/[^/]+$/i.test(path)
    || path === '/artists/me'
    || /^\/social\/artists\/[^/]+\/stats$/i.test(path)
  ) {
    return 180000;
  }

  if (path === '/songs' || path === '/artists') {
    return 90000;
  }

  return DEFAULT_GET_CACHE_TTL_MS;
};

const refreshClient: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

export const apiClient: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

apiClient.interceptors.request.use((config) => {
  if (accessTokenInMemory) setAuthorizationHeader(config, accessTokenInMemory);

  const method = (config.method ?? 'get').toLowerCase();
  if (method === 'get') {
    const ttlMs = resolveGetCacheTtlMs(config);
    if (ttlMs <= 0) return config;

    const key = buildCacheKey(config);
    const cached = getCacheStore.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      config.adapter = cacheHitAdapter(cached.response);
      return config;
    }
  } else {
    clearGetCache();
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === 'object' && 'result' in response.data) {
      response.data = (response.data as ApiResponse<unknown>).result;
    }

    const method = (response.config.method ?? 'get').toLowerCase();
    if (method === 'get') {
      const key = buildCacheKey(response.config as InternalAxiosRequestConfig);
      const ttlMs = resolveGetCacheTtlMs(response.config as InternalAxiosRequestConfig);
      if (ttlMs <= 0) return response;

      getCacheStore.set(key, {
        expiresAt: Date.now() + ttlMs,
        response,
      });
    }

    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const status = error.response?.status;
    const requestUrl = originalRequest?.url ?? '';
    const isRefreshRequest = requestUrl.includes(REFRESH_ENDPOINT);

    if (status === 429) {
      const retryAfter = error.response?.headers?.['retry-after'];
      const backendMessage = (error.response?.data as { message?: string } | undefined)?.message;
      error.message = backendMessage
        ?? (retryAfter
          ? `Bạn thao tác quá nhanh. Vui lòng thử lại sau ${retryAfter} giây.`
          : 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.');
      return Promise.reject(error);
    }

    if (!originalRequest || status !== 401 || originalRequest._retry || isRefreshRequest) {
      const backendMessage = (error.response?.data as { message?: string } | undefined)?.message;
      if (backendMessage) error.message = backendMessage;
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (newToken: string) => {
            setAuthorizationHeader(originalRequest, newToken);
            resolve(apiClient(originalRequest));
          },
          reject,
        });
      });
    }

    isRefreshing = true;

    try {
      const currentRefreshToken = await refreshTokenGetter?.();
      if (!currentRefreshToken) throw new Error('Missing refresh token.');

      const refreshResponse = await refreshClient.post<ApiResponse<RefreshResponse>>(
        REFRESH_ENDPOINT,
        { refreshToken: currentRefreshToken },
      );

      const refreshedTokens =
        refreshResponse.data && 'result' in refreshResponse.data
          ? refreshResponse.data.result
          : (refreshResponse.data as unknown as RefreshResponse);

      if (!refreshedTokens?.accessToken || !refreshedTokens?.refreshToken) {
        throw new Error('Invalid refresh response.');
      }

      accessTokenInMemory = refreshedTokens.accessToken;
      await persistTokensHandler?.({ accessToken: refreshedTokens.accessToken, refreshToken: refreshedTokens.refreshToken });
      attachAccessToken(refreshedTokens.accessToken);

      clearGetCache();
      processQueue(null, refreshedTokens.accessToken);
      setAuthorizationHeader(originalRequest, refreshedTokens.accessToken);

      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      attachAccessToken(null);
      clearGetCache();
      await logoutHandler?.();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export const attachAccessToken = (token: string | null): void => {
  accessTokenInMemory = token;

  if (!token) {
    delete apiClient.defaults.headers.common.Authorization;
    clearGetCache();
    return;
  }

  apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
};

export const configureApiAuthHandlers = (handlers: {
  getRefreshToken: () => Promise<string | null>;
  persistTokens: (tokens: { accessToken: string; refreshToken: string }) => Promise<void>;
  onRefreshAuthFailure: () => Promise<void> | void;
}): void => {
  refreshTokenGetter = handlers.getRefreshToken;
  persistTokensHandler = handlers.persistTokens;
  logoutHandler = handlers.onRefreshAuthFailure;
};
