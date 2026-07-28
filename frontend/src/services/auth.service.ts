import { api, setTokens, clearTokens } from './api';

export interface AuthUser {
  id: string;
  uuid: string;
  name: string;
  email: string;
  avatar: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponseData {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
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
  static async register(data: RegisterDto): Promise<AuthResponseData> {
    const response = await api.post<AuthResponseData>('/auth/register', data);
    setTokens(response.data.accessToken, response.data.refreshToken);
    localStorage.setItem('mailflow-auth', 'true');
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
    } catch {
      // Ignore network errors during logout
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

  static async resetPassword(token: string, password: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/auth/reset-password', {
      token,
      password,
    });
    return response.data;
  }
}
