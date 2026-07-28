import { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  AuthService,
  AuthUser,
  RegisterDto,
  LoginDto,
  UpdateProfileDto,
} from '../services/auth.service';
import { getAccessToken, clearTokens } from '../services/api';

export interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginDto) => Promise<AuthUser>;
  register: (data: RegisterDto) => Promise<AuthUser>;
  logout: () => Promise<void>;
  updateProfile: (data: UpdateProfileDto) => Promise<AuthUser>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchProfile = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const profile = await AuthService.getProfile();
      setUser(profile);
    } catch {
      clearTokens();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();

    const handleUnauthorized = () => {
      setUser(null);
    };

    window.addEventListener('mailflow-unauthorized', handleUnauthorized);
    return () => window.removeEventListener('mailflow-unauthorized', handleUnauthorized);
  }, [fetchProfile]);

  const login = async (data: LoginDto): Promise<AuthUser> => {
    setIsLoading(true);
    try {
      const res = await AuthService.login(data);
      setUser(res.user);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterDto): Promise<AuthUser> => {
    setIsLoading(true);
    try {
      const res = await AuthService.register(data);
      setUser(res.user);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await AuthService.logout();
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  };

  const updateProfile = async (data: UpdateProfileDto): Promise<AuthUser> => {
    const updated = await AuthService.updateProfile(data);
    setUser(updated);
    return updated;
  };

  const refreshUser = async (): Promise<void> => {
    await fetchProfile();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updateProfile,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
