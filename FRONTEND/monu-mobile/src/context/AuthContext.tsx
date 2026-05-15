import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';
import React, { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import { attachAccessToken, configureApiAuthHandlers } from '../services/api';
import { getMyProfile, loginWithEmail, logoutApi, refreshToken, socialLogin } from '../services/auth';
import { AuthSession, SocialProvider, UserProfile } from '../types/auth';

const ACCESS_TOKEN_STORAGE_KEY  = 'auth.accessToken';
const REFRESH_TOKEN_STORAGE_KEY = 'auth.refreshToken';
const AUTH_TOKENS_KEY = 'auth.tokens';

interface AuthContextValue {
  authSession: AuthSession | null;
  isInitializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithSocialToken: (provider: SocialProvider, token: string) => Promise<void>;
  loginDirect: (accessToken: string, refreshTokenValue: string) => Promise<void>;
  rehydrateByRefreshToken: (refreshTokenValue: string) => Promise<void>;
  refreshSession: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const saveTokens = async (tokens: { accessToken: string; refreshToken: string }): Promise<void> => {
  await SecureStore.setItemAsync(AUTH_TOKENS_KEY, JSON.stringify(tokens));
};

const clearTokens = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(AUTH_TOKENS_KEY);
  await Promise.allSettled([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_STORAGE_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_STORAGE_KEY),
  ]);
};

const loadStoredTokens = async (): Promise<{ accessToken: string | null; refreshToken: string | null }> => {
  // Attempt atomic key first
  const combined = await SecureStore.getItemAsync(AUTH_TOKENS_KEY);
  if (combined) {
    try {
      const parsed = JSON.parse(combined) as { accessToken?: unknown; refreshToken?: unknown };
      const at = typeof parsed.accessToken === 'string' ? parsed.accessToken : null;
      const rt = typeof parsed.refreshToken === 'string' ? parsed.refreshToken : null;
      if (at && rt) return { accessToken: at, refreshToken: rt };
    } catch { /* malformed — fall through to legacy */ }
  }

  // Migration: read legacy individual keys (users upgrading from older version)
  const [accessToken, refreshTokenValue] = await Promise.allSettled([
    SecureStore.getItemAsync(ACCESS_TOKEN_STORAGE_KEY),
    SecureStore.getItemAsync(REFRESH_TOKEN_STORAGE_KEY),
  ]);
  const at = accessToken.status === 'fulfilled' ? accessToken.value : null;
  const rt = refreshTokenValue.status === 'fulfilled' ? refreshTokenValue.value : null;
  if (at && rt) {
    // Migrate to combined key immediately so next launch uses atomic path
    await saveTokens({ accessToken: at, refreshToken: rt });
    return { accessToken: at, refreshToken: rt };
  }
  return { accessToken: null, refreshToken: null };
};

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;

    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '=');
    const decoded = globalThis.atob ? globalThis.atob(base64) : null;
    if (!decoded) return null;

    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const isAdminRoleFromAccessToken = (accessToken: string): boolean => {
  const payload = decodeJwtPayload(accessToken);
  return payload?.role === 'ADMIN';
};

const isTokenExpired = (token: string): boolean => {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return true;
  return payload.exp * 1000 < Date.now() + 10_000; // 10 s grace period
};

const isAuthFailure = (err: unknown): boolean => {
  const status = (err as { response?: { status?: number } } | null)?.response?.status;
  return status === 401 || status === 403;
};

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  const logout = async (): Promise<void> => {
    const { refreshToken: storedRefreshToken } = await loadStoredTokens();
    if (storedRefreshToken) {
      try {
        await logoutApi({ refreshToken: storedRefreshToken });
      } catch {
        // no-op: local cleanup still must execute
      }
    }

    await clearTokens();
    setAuthSession(null);
    attachAccessToken(null);
  };

  const hydrateProfileNonBlocking = async (): Promise<UserProfile | null> => {
    try {
      return await getMyProfile();
    } catch {
      return null;
    }
  };

  const ensureNotAdmin = async (accessToken: string): Promise<void> => {
    if (!isAdminRoleFromAccessToken(accessToken)) return;

    await clearTokens();
    attachAccessToken(null);
    setAuthSession(null);
    Alert.alert('Truy cập bị từ chối', 'Admins cannot use the mobile client');
    throw new Error('Admins cannot use the mobile client');
  };

  const finalizeLogin = async (tokens: { accessToken: string; refreshToken: string; authenticated: boolean }): Promise<void> => {
    await ensureNotAdmin(tokens.accessToken);
    await saveTokens(tokens);
    attachAccessToken(tokens.accessToken);

    setAuthSession((prevSession) => ({
      tokens,
      profile: prevSession?.profile ?? null,
    }));

    void hydrateProfileNonBlocking().then((profile) => {
      if (!profile) return;

      setAuthSession((prevSession) => {
        if (!prevSession) return prevSession;
        return { ...prevSession, profile };
      });
    });
  };

  useEffect(() => {
    configureApiAuthHandlers({
      getRefreshToken: async () => {
        const combined = await SecureStore.getItemAsync(AUTH_TOKENS_KEY);
        if (combined) {
          try {
            const parsed = JSON.parse(combined) as { refreshToken?: unknown };
            if (typeof parsed.refreshToken === 'string') return parsed.refreshToken;
          } catch { /* fall through */ }
        }
        return SecureStore.getItemAsync(REFRESH_TOKEN_STORAGE_KEY); // legacy fallback
      },
      persistTokens: async ({ accessToken, refreshToken: refreshedToken }) => {
        await ensureNotAdmin(accessToken);
        await saveTokens({ accessToken, refreshToken: refreshedToken });
        setAuthSession((prevSession) => {
          if (!prevSession) return prevSession;
          return {
            ...prevSession,
            tokens: {
              ...prevSession.tokens,
              accessToken,
              refreshToken: refreshedToken,
            },
          };
        });
      },
      onRefreshAuthFailure: logout,
    });
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { accessToken, refreshToken: refreshTokenValue } = await loadStoredTokens();

        if (!accessToken || !refreshTokenValue) {
          await clearTokens();
          return;
        }

        await ensureNotAdmin(accessToken);

        attachAccessToken(accessToken);
        setAuthSession({
          tokens: {
            accessToken,
            refreshToken: refreshTokenValue,
            authenticated: true,
          },
          profile: null,
        });

        // Unblock UI first, then hydrate in background.
        setIsInitializing(false);
        void (async () => {
          // If the access token is already expired locally, refresh it proactively
          // BEFORE making any API call, to avoid the 401 → interceptor-refresh → race.
          if (isTokenExpired(accessToken)) {
            try {
              const refreshedTokens = await refreshToken({ refreshToken: refreshTokenValue });
              await finalizeLogin(refreshedTokens);
              return; // finalizeLogin also fetches the profile
            } catch (err) {
              if (isAuthFailure(err)) {
                // Refresh token invalid/expired — force logout
                await logout();
                return;
              }
              // Network/server error: keep stored session, interceptor will retry later
            }
          }

          // Access token is still valid — just hydrate the profile silently.
          // The API interceptor handles any 401 that may arise and will either
          // refresh the token or call logout() if the refresh token is invalid.
          // We do NOT call refreshToken() here to avoid consuming the refresh
          // token a second time if the interceptor already rotated it.
          const profile = await hydrateProfileNonBlocking();
          if (profile) {
            setAuthSession((prevSession) => {
              if (!prevSession) return prevSession;
              return { ...prevSession, profile };
            });
          }
          // If profile is null (network/server error): session stays alive with stored tokens.
          // Offline downloads and cached content remain accessible.
        })();
        return;
      } catch {
        await logout();
      } finally {
        setIsInitializing(false);
      }
    };

    void initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    const tokens = await loginWithEmail({ email, password });
    await finalizeLogin(tokens);
  };

  const loginWithSocialToken = async (provider: SocialProvider, token: string): Promise<void> => {
    const tokens = await socialLogin({ provider, token });
    await finalizeLogin(tokens);
  };

  const loginDirect = async (accessToken: string, refreshTokenValue: string): Promise<void> => {
    await finalizeLogin({ accessToken, refreshToken: refreshTokenValue, authenticated: true });
  };

  const rehydrateByRefreshToken = async (refreshTokenValue: string): Promise<void> => {
    const tokens = await refreshToken({ refreshToken: refreshTokenValue });
    await finalizeLogin(tokens);
  };

  const refreshSession = async (): Promise<void> => {
    const { refreshToken: storedRefreshToken } = await loadStoredTokens();
    if (!storedRefreshToken) return;
    const tokens = await refreshToken({ refreshToken: storedRefreshToken });
    await finalizeLogin(tokens);
  };

  const refreshProfile = async (): Promise<void> => {
    if (!authSession) return;

    const profile = await getMyProfile();
    setAuthSession((prevSession) => {
      if (!prevSession) return prevSession;
      return { ...prevSession, profile };
    });
  };

  const value = useMemo(
    () => ({
      authSession,
      isInitializing,
      login,
      loginWithSocialToken,
      loginDirect,
      rehydrateByRefreshToken,
      refreshSession,
      refreshProfile,
      logout,
    }),
    [authSession, isInitializing],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
