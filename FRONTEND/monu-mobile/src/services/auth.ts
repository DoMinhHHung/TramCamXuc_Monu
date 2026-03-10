import {
  AuthenticationResponse,
  ExchangeTokenPayload,
  LoginPayload,
  RefreshPayload,
  UserProfile
} from '../types/auth';
import { apiClient } from './api';

export const loginWithEmail = async (payload: LoginPayload): Promise<AuthenticationResponse> => {
  const response = await apiClient.post<AuthenticationResponse>('/auth/login', payload);
  return response.data;
};

export const socialLogin = async (payload: ExchangeTokenPayload): Promise<AuthenticationResponse> => {
  const response = await apiClient.post<AuthenticationResponse>('/auth/social', payload);
  return response.data;
};

export const refreshToken = async (payload: RefreshPayload): Promise<AuthenticationResponse> => {
  const response = await apiClient.post<AuthenticationResponse>('/auth/refresh', payload);
  return response.data;
};

export const getMyProfile = async (): Promise<UserProfile> => {
  const response = await apiClient.get<UserProfile>('/users/my-profile');
  return response.data;
};
