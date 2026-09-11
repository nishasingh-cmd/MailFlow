export interface UserResponse {
  id: string;
  uuid: string;
  name: string;
  email: string;
  avatar: string | null;
  hasBusinessProfile: boolean;
  emailVerified: boolean;
  accountStatus: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SignupResponse {
  requiresVerification: boolean;
  email: string;
  message: string;
}

export interface VerifyEmailResponse {
  success: boolean;
  message: string;
  code?: string;
}

export interface AuthResponse {
  user: UserResponse;
  accessToken: string;
  refreshToken: string;
}

export interface TokenRefreshResponse {
  accessToken: string;
  refreshToken: string;
}
