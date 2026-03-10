export type SocialProvider = 'GOOGLE' | 'FACEBOOK';

export interface ApiResponse<T> {
  code: number;
  message: string;
  result: T;
}

export interface AuthenticationResponse {
  accessToken: string;
  refreshToken: string;
  authenticated: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RefreshPayload {
  refreshToken: string;
}

export interface ExchangeTokenPayload {
  token: string;
  provider: 'LOCAL' | 'GOOGLE' | 'FACEBOOK';
}

export interface UserRegistrationPayload {
  email: string;
  password: string;
  fullName: string;
  dob: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
}

export interface VerifyOtpPayload {
  email: string;
  otp: string;
}

export interface PasswordResetPayload {
  email: string;
  otp: string;
  newPassword: string;
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  dob?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  role?: 'USER' | 'ADMIN' | 'ARTIST';
  status?: 'PENDING_VERIFICATION' | 'ACTIVE' | 'BANNED';
}

export interface AuthSession {
  tokens: AuthenticationResponse;
  profile: UserProfile | null;
}
