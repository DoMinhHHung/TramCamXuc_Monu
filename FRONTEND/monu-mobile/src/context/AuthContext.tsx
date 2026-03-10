import React, { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react';

import { exchangeFacebookCode, exchangeGoogleCode, loginWithEmail } from '../services/auth';
import { attachAccessToken } from '../services/api';
import { AuthResponse } from '../types/auth';

interface AuthContextValue {
  authData: AuthResponse | null;
  login: (email: string, password: string) => Promise<void>;
  loginByGoogleCode: (code: string, redirectUri: string) => Promise<void>;
  loginByFacebookCode: (code: string, redirectUri: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const setAuthSession = (data: AuthResponse | null) => {
  attachAccessToken(data?.accessToken ?? null);
};

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [authData, setAuthData] = useState<AuthResponse | null>(null);

  const saveAuth = (data: AuthResponse) => {
    setAuthData(data);
    setAuthSession(data);
  };

  const login = async (email: string, password: string) => {
    const data = await loginWithEmail({ email, password });
    saveAuth(data);
  };

  const loginByGoogleCode = async (code: string, redirectUri: string) => {
    const data = await exchangeGoogleCode(code, redirectUri);
    saveAuth(data);
  };

  const loginByFacebookCode = async (code: string, redirectUri: string) => {
    const data = await exchangeFacebookCode(code, redirectUri);
    saveAuth(data);
  };

  const logout = () => {
    setAuthData(null);
    setAuthSession(null);
  };

  const value = useMemo(
    () => ({ authData, login, loginByGoogleCode, loginByFacebookCode, logout }),
    [authData]
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
