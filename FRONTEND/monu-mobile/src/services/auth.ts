import {
  AuthenticationResponse,
  ExchangeTokenPayload,
  LoginPayload,
  RefreshPayload,
  UserProfile
} from '../types/auth';
import { apiClient } from './api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserRegistrationRequest {
    email: string;
    password: string;
    fullName: string;
    dob: string;           // ISO date: "YYYY-MM-DD"
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

// ─── Auth API ─────────────────────────────────────────────────────────────────

/** POST /auth/login */
export const loginWithEmail = async (payload: LoginPayload): Promise<AuthenticationResponse> => {
  const response = await apiClient.post<AuthenticationResponse>('/auth/login', payload);
  return response.data;
};

/** POST /auth/social */
export const socialLogin = async (payload: ExchangeTokenPayload): Promise<AuthenticationResponse> => {
  const response = await apiClient.post<AuthenticationResponse>('/auth/social', payload);
  return response.data;
};

/** POST /auth/refresh */
export const refreshToken = async (payload: RefreshPayload): Promise<AuthenticationResponse> => {
  const response = await apiClient.post<AuthenticationResponse>('/auth/refresh', payload);
  return response.data;
};

/** GET /users/my-profile */
export const getMyProfile = async (): Promise<UserProfile> => {
  const response = await apiClient.get<UserProfile>('/users/my-profile');
  return response.data;
};

/** POST /auth/registration */
export const registerUser = async (data: UserRegistrationRequest): Promise<UserResponse> => {
    const res = await apiClient.post('/auth/registration', data);
    return res.data;
};

/** POST /auth/verify */
export const verifyOtp = async (data: VerifyOtpRequest): Promise<void> => {
    await apiClient.post('/auth/verify', data);
};

/** POST /auth/resend-otp?email= */
export const resendOtp = async (email: string): Promise<void> => {
    await apiClient.post('/auth/resend-otp', null, { params: { email } });
};

/** POST /auth/forgot-password?email= */
export const forgotPassword = async (email: string): Promise<void> => {
    await apiClient.post('/auth/forgot-password', null, { params: { email } });
};

/** POST /auth/reset-password */
export const resetPassword = async (data: PasswordResetRequest): Promise<void> => {
    await apiClient.post('/auth/reset-password', data);
};
