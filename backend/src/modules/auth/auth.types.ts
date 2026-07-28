export interface UserResponse {
  id: string;
  uuid: string;
  name: string;
  email: string;
  avatar: string | null;
  createdAt: Date;
  updatedAt: Date;
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
