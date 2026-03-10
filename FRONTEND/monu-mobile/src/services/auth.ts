import {
  ApiResponse,
  AuthenticationResponse,
  ExchangeTokenPayload,
  LoginPayload,
  RefreshPayload,
  UserProfile
} from '../types/auth';
import { apiClient } from './api';

export const loginWithEmail = async (payload: LoginPayload): Promise<AuthenticationResponse> => {
  const response = await apiClient.post<ApiResponse<AuthenticationResponse>>('/auth/login', payload);
  return response.data.result;
};

export const socialLogin = async (payload: ExchangeTokenPayload): Promise<AuthenticationResponse> => {
  const response = await apiClient.post<ApiResponse<AuthenticationResponse>>('/auth/social', payload);
  return response.data.result;
};

export const refreshToken = async (payload: RefreshPayload): Promise<AuthenticationResponse> => {
  const response = await apiClient.post<ApiResponse<AuthenticationResponse>>('/auth/refresh', payload);
  return response.data.result;
};

export const getMyProfile = async (): Promise<UserProfile> => {
  const response = await apiClient.get<ApiResponse<UserProfile>>('/users/my-profile');
  return response.data.result;
};
