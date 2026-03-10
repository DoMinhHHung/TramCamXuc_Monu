import { apiClient } from './api';
import { CreateUserPayload, ResetPasswordPayload, VerifyOtpPayload } from '../types/auth-flow';

export const createUser = async (payload: CreateUserPayload): Promise<void> => {
  await apiClient.post('/auth/registration', payload);
};

export const verifyOtp = async (payload: VerifyOtpPayload): Promise<void> => {
  await apiClient.post('/auth/verify', payload);
};

export const resendOtp = async (email: string): Promise<void> => {
  await apiClient.post('/auth/resend-otp', null, {
    params: { email }
  });
};

export const forgotPassword = async (email: string): Promise<void> => {
  await apiClient.post('/auth/forgot-password', null, {
    params: { email }
  });
};

export const resetPassword = async (payload: ResetPasswordPayload): Promise<void> => {
  await apiClient.post('/auth/reset-password', payload);
};
