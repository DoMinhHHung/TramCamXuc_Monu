import {
  AuthenticationResponse,
  ExchangeTokenPayload,
  LoginPayload,
  RefreshPayload,
  UserProfile,
} from '../types/auth';
import { apiClient } from './api';

export interface UserRegistrationRequest {
  email: string;
  password: string;
  fullName: string;
  dob: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

export interface PasswordResetRequest {
  email: string;
  otp: string;
  newPassword: string;
}

export interface ProfileUpdateRequest {
  fullName?: string;
  dob?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
}

export interface UserResponse {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  dob?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  role: 'USER' | 'ADMIN' | 'ARTIST';
  status: 'PENDING_VERIFICATION' | 'ACTIVE' | 'BANNED';
}

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

export const logoutApi = async (payload: RefreshPayload): Promise<void> => {
  await apiClient.post('/auth/logout', payload);
};

export const getMyProfile = async (): Promise<UserProfile> => {
  const response = await apiClient.get<UserProfile>('/users/my-profile');
  return response.data;
};

export const updateMyProfile = async (payload: ProfileUpdateRequest): Promise<UserProfile> => {
  const response = await apiClient.put<UserProfile>('/users/my-profile', payload);
  return response.data;
};

export const uploadAvatar = async (uri: string): Promise<UserProfile> => {
  const fileName = uri.split('/').pop() ?? `avatar-${Date.now()}.jpg`;
  const extension = fileName.split('.').pop()?.toLowerCase();
  const type = extension === 'png' ? 'image/png' : 'image/jpeg';

  const formData = new FormData();
  formData.append('file', {
    uri,
    type,
    name: fileName,
  } as unknown as Blob);

  const response = await apiClient.post<UserProfile>('/users/upload-avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

export const deleteMyProfile = async (): Promise<void> => {
  await apiClient.delete('/users/my-profile');
};

export const registerUser = async (data: UserRegistrationRequest): Promise<UserResponse> => {
  const res = await apiClient.post('/auth/registration', data);
  return res.data;
};

export const verifyOtp = async (data: VerifyOtpRequest): Promise<void> => {
  await apiClient.post('/auth/verify', data);
};

export const resendOtp = async (email: string): Promise<void> => {
  await apiClient.post('/auth/resend-otp', null, { params: { email } });
};

export const forgotPassword = async (email: string): Promise<void> => {
  await apiClient.post('/auth/forgot-password', null, { params: { email } });
};

export const resetPassword = async (data: PasswordResetRequest): Promise<void> => {
  await apiClient.post('/auth/reset-password', data);
};
