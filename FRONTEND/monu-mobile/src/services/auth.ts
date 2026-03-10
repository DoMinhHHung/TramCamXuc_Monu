import { AuthResponse, LoginPayload } from '../types/auth';
import { apiClient } from './api';

export const loginWithEmail = async (payload: LoginPayload): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>('/auth/login', payload);
  return response.data;
};

export const exchangeGoogleCode = async (code: string, redirectUri: string): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>('/auth/oauth/google/mobile', {
    code,
    redirectUri
  });

  return response.data;
};

export const exchangeFacebookCode = async (code: string, redirectUri: string): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>('/auth/oauth/facebook/mobile', {
    code,
    redirectUri
  });

  return response.data;
};
