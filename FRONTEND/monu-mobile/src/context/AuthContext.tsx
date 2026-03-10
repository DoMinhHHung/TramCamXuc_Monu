import React, { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react';

import { getMyProfile, loginWithEmail, refreshToken, socialLogin } from '../services/auth';
import { attachAccessToken } from '../services/api';
import { AuthSession, SocialProvider } from '../types/auth';

interface AuthContextValue {
  authSession: AuthSession | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithSocialToken: (provider: SocialProvider, token: string) => Promise<void>;
  rehydrateByRefreshToken: (refreshTokenValue: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const setAccessToken = (token: string | null) => {
  attachAccessToken(token);
};

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);

  const finalizeLogin = async (tokens: { accessToken: string; refreshToken: string; authenticated: boolean }) => {
    setAccessToken(tokens.accessToken);
    const profile = await getMyProfile();
    setAuthSession({ tokens, profile });
  };

  const login = async (email: string, password: string) => {
    const tokens = await loginWithEmail({ email, password });
    await finalizeLogin(tokens);
  };

  const loginWithSocialToken = async (provider: SocialProvider, token: string) => {
    const tokens = await socialLogin({
      provider,
      token
    });
    await finalizeLogin(tokens);
  };

  const rehydrateByRefreshToken = async (refreshTokenValue: string) => {
    const tokens = await refreshToken({ refreshToken: refreshTokenValue });
    await finalizeLogin(tokens);
  };

  const logout = () => {
    setAuthSession(null);
    setAccessToken(null);
  };

  const value = useMemo(
    () => ({ authSession, login, loginWithSocialToken, rehydrateByRefreshToken, logout }),
    [authSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
};
