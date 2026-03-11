import axios, {
  AxiosError,
  AxiosHeaders,
  AxiosInstance,
  AxiosRequestConfig,
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

const REFRESH_ENDPOINT = '/auth/refresh';

let accessTokenInMemory: string | null = null;
let refreshTokenGetter: (() => Promise<string | null>) | null = null;
let persistTokensHandler: ((tokens: { accessToken: string; refreshToken: string }) => Promise<void>) | null = null;
let logoutHandler: (() => Promise<void> | void) | null = null;

let isRefreshing = false;
let failedQueue: QueuedRequest[] = [];

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

const refreshClient: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

export const apiClient: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

apiClient.interceptors.request.use((config) => {
  if (accessTokenInMemory) {
    setAuthorizationHeader(config, accessTokenInMemory);
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === 'object' && 'result' in response.data) {
      response.data = (response.data as ApiResponse<unknown>).result;
    }

    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const status = error.response?.status;
    const requestUrl = originalRequest?.url ?? '';
    const isRefreshRequest = requestUrl.includes(REFRESH_ENDPOINT);

    if (!originalRequest || status !== 401 || originalRequest._retry || isRefreshRequest) {
      const backendMessage = (error.response?.data as { message?: string } | undefined)?.message;
      if (backendMessage) {
        error.message = backendMessage;
      }
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
      if (!currentRefreshToken) {
        throw new Error('Missing refresh token.');
      }

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
      await persistTokensHandler?.({
        accessToken: refreshedTokens.accessToken,
        refreshToken: refreshedTokens.refreshToken,
      });
      attachAccessToken(refreshedTokens.accessToken);

      processQueue(null, refreshedTokens.accessToken);
      setAuthorizationHeader(originalRequest, refreshedTokens.accessToken);

      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      attachAccessToken(null);
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
