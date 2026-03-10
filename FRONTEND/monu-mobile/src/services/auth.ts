import {
  ApiResponse,
  AuthenticationResponse,
  ExchangeTokenPayload,
  LoginPayload,
  PasswordResetPayload,
  RefreshPayload,
  UserProfile,
  UserRegistrationPayload,
  VerifyOtpPayload
} from '../types/auth';
import { apiClient } from './api';

const readData = <T>(data: ApiResponse<T> | T): T => {
  if (data && typeof data === 'object' && 'result' in (data as ApiResponse<T>)) {
    return (data as ApiResponse<T>).result;
  }

  return data as T;
};

export const loginWithEmail = async (payload: LoginPayload): Promise<AuthenticationResponse> => {
  const response = await apiClient.post<ApiResponse<AuthenticationResponse> | AuthenticationResponse>('/auth/login', payload);
  return readData(response.data);
};

export const socialLogin = async (payload: ExchangeTokenPayload): Promise<AuthenticationResponse> => {
  const response = await apiClient.post<ApiResponse<AuthenticationResponse> | AuthenticationResponse>('/auth/social', payload);
  return readData(response.data);
};

export const refreshToken = async (payload: RefreshPayload): Promise<AuthenticationResponse> => {
  const response = await apiClient.post<ApiResponse<AuthenticationResponse> | AuthenticationResponse>('/auth/refresh', payload);
  return readData(response.data);
};

export const createUser = async (payload: UserRegistrationPayload): Promise<UserProfile> => {
  const response = await apiClient.post<ApiResponse<UserProfile> | UserProfile>('/auth/registration', payload);
  return readData(response.data);
};

export const verifyOtp = async (payload: VerifyOtpPayload): Promise<void> => {
  await apiClient.post('/auth/verify', payload);
};

export const resendOtp = async (email: string): Promise<void> => {
  await apiClient.post('/auth/resend-otp', null, { params: { email } });
};

export const forgotPassword = async (email: string): Promise<void> => {
  await apiClient.post('/auth/forgot-password', null, { params: { email } });
};

export const resetPassword = async (payload: PasswordResetPayload): Promise<void> => {
  await apiClient.post('/auth/reset-password', payload);
};

export const getMyProfile = async (): Promise<UserProfile> => {
  const response = await apiClient.get<ApiResponse<UserProfile> | UserProfile>('/users/my-profile');
  return readData(response.data);
};
