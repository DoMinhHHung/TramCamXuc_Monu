import React, { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react';
import { getMyProfile, loginWithEmail, refreshToken, socialLogin } from '../services/auth';
import { attachAccessToken } from '../services/api';
import { AuthSession, SocialProvider } from '../types/auth';

interface AuthContextValue {
  authSession: AuthSession | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithSocialToken: (provider: SocialProvider, token: string) => Promise<void>;
  loginDirect: (accessToken: string, refreshToken: string) => Promise<void>; // ← thêm
  rehydrateByRefreshToken: (refreshTokenValue: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);

  const finalizeLogin = async (tokens: { accessToken: string; refreshToken: string; authenticated: boolean }) => {
    attachAccessToken(tokens.accessToken);
    const profile = await getMyProfile();
    setAuthSession({ tokens, profile });
  };

  const login = async (email: string, password: string) => {
    const tokens = await loginWithEmail({ email, password });
    await finalizeLogin(tokens);
  };

  const loginWithSocialToken = async (provider: SocialProvider, token: string) => {
    const tokens = await socialLogin({ provider, token });
    await finalizeLogin(tokens);
  };

  const loginDirect = async (accessToken: string, rt: string) => {
    attachAccessToken(accessToken);
    const profile = await getMyProfile();
    setAuthSession({
      tokens: { accessToken, refreshToken: rt, authenticated: true },
      profile,
    });
  };

  const rehydrateByRefreshToken = async (refreshTokenValue: string) => {
    const tokens = await refreshToken({ refreshToken: refreshTokenValue });
    await finalizeLogin(tokens);
  };

  const refreshProfile = async () => {
    if (!authSession) return;
    const profile = await getMyProfile();
    setAuthSession({ ...authSession, profile });
  };

  const logout = () => {
    setAuthSession(null);
    attachAccessToken(null);
  };

  const value = useMemo(
      () => ({ authSession, login, loginWithSocialToken, loginDirect, rehydrateByRefreshToken, refreshProfile, logout }),
      [authSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};