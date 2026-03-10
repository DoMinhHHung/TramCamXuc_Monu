export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export interface CreateUserPayload {
  email: string;
  password: string;
  fullName: string;
  dob: string;
  gender?: Gender;
}

export interface VerifyOtpPayload {
  email: string;
  otp: string;
}

export interface ResetPasswordPayload {
  email: string;
  otp: string;
  newPassword: string;
}
