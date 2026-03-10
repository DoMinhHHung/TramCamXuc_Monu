export type RootStackParamList = {
  Login: { presetEmail?: string } | undefined;
  Home: undefined;
  Register: undefined;
  VerifyOtp: { email: string; from: 'registration' | 'password-reset' };
  ForgotPassword: undefined;
  ResetPassword: { email: string };
};
