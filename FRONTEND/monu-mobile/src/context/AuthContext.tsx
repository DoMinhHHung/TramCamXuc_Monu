import * as SecureStore from 'expo-secure-store';
import React, { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import { attachAccessToken, configureApiAuthHandlers } from '../services/api';
import { getMyProfile, loginWithEmail, refreshToken, socialLogin } from '../services/auth';
import { AuthSession, SocialProvider, UserProfile } from '../types/auth';

const ACCESS_TOKEN_STORAGE_KEY = 'auth.accessToken';
const REFRESH_TOKEN_STORAGE_KEY = 'auth.refreshToken';

interface AuthContextValue {
  authSession: AuthSession | null;
  isInitializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithSocialToken: (provider: SocialProvider, token: string) => Promise<void>;
  loginDirect: (accessToken: string, refreshTokenValue: string) => Promise<void>;
  rehydrateByRefreshToken: (refreshTokenValue: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const saveTokens = async (tokens: { accessToken: string; refreshToken: string }): Promise<void> => {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_STORAGE_KEY, tokens.accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_STORAGE_KEY, tokens.refreshToken),
  ]);
};

const clearTokens = async (): Promise<void> => {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_STORAGE_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_STORAGE_KEY),
  ]);
};

const loadStoredTokens = async (): Promise<{ accessToken: string | null; refreshToken: string | null }> => {
  const [accessToken, refreshTokenValue] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_TOKEN_STORAGE_KEY),
    SecureStore.getItemAsync(REFRESH_TOKEN_STORAGE_KEY),
  ]);

  return { accessToken, refreshToken: refreshTokenValue };
};

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  const hydrateProfileNonBlocking = async (): Promise<UserProfile | null> => {
    try {
      return await getMyProfile();
    } catch {
      return null;
    }
  };

  const finalizeLogin = async (tokens: { accessToken: string; refreshToken: string; authenticated: boolean }): Promise<void> => {
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

  const logout = async (): Promise<void> => {
    await clearTokens();
    setAuthSession(null);
    attachAccessToken(null);
  };

  useEffect(() => {
    configureApiAuthHandlers({
      getRefreshToken: async () => {
        const storedRefreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_STORAGE_KEY);
        return storedRefreshToken;
      },
      persistTokens: async ({ accessToken, refreshToken: refreshedToken }) => {
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

        attachAccessToken(accessToken);
        setAuthSession({
          tokens: {
            accessToken,
            refreshToken: refreshTokenValue,
            authenticated: true,
          },
          profile: null,
        });

        const profile = await hydrateProfileNonBlocking();
        if (profile) {
          setAuthSession((prevSession) => {
            if (!prevSession) return prevSession;
            return { ...prevSession, profile };
          });
          return;
        }

        const refreshedTokens = await refreshToken({ refreshToken: refreshTokenValue });
        await finalizeLogin(refreshedTokens);
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
