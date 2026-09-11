import { api, setTokens, clearTokens } from './api';

export interface AuthUser {
  id: string;
  uuid: string;
  name: string;
  email: string;
  avatar: string | null;
  hasBusinessProfile?: boolean;
  emailVerified?: boolean;
  accountStatus?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponseData {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
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
  attemptsRemaining?: number;
}

export interface RegisterDto {
  name: string;
  email: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface UpdateProfileDto {
  name?: string;
  avatar?: string | null;
}

export class AuthService {
  static async register(data: RegisterDto): Promise<SignupResponse> {
    const response = await api.post<SignupResponse>('/auth/register', data);
    return response.data;
  }

  static async login(data: LoginDto): Promise<AuthResponseData> {
    const response = await api.post<AuthResponseData>('/auth/login', data);
    setTokens(response.data.accessToken, response.data.refreshToken);
    localStorage.setItem('mailflow-auth', 'true');
    return response.data;
  }

  static async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch (err: unknown) {
      void err;
    } finally {
      clearTokens();
    }
  }

  static async getProfile(): Promise<AuthUser> {
    const response = await api.get<AuthUser>('/users/profile');
    return response.data;
  }

  static async updateProfile(data: UpdateProfileDto): Promise<AuthUser> {
    const response = await api.patch<AuthUser>('/users/profile', data);
    return response.data;
  }

  static async forgotPassword(email: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/auth/forgot-password', { email });
    return response.data;
  }

  static async resetPassword(
    token: string,
    password: string,
    confirmPassword?: string
  ): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/auth/reset-password', {
      token,
      password,
      confirmPassword,
    });
    return response.data;
  }

  static async verifyEmail(token: string): Promise<VerifyEmailResponse> {
    const response = await api.get<VerifyEmailResponse>(
      `/auth/verify-email?token=${encodeURIComponent(token)}`
    );
    return response.data;
  }

  static async verifyCode(email: string, code: string): Promise<VerifyEmailResponse> {
    const response = await api.post<VerifyEmailResponse>('/auth/verify-code', { email, code });
    return response.data;
  }

  static async resendVerification(email: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/auth/resend-verification', { email });
    return response.data;
  }
}
