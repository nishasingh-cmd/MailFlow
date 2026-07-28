import { prisma } from '../../config/db';
import { hashPassword, comparePassword } from '../../utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { AuthResponse, TokenRefreshResponse, UserResponse } from './auth.types';

function sanitizeUser(user: {
  id: string;
  uuid: string;
  name: string;
  email: string;
  avatar: string | null;
  createdAt: Date;
  updatedAt: Date;
}): UserResponse {
  return {
    id: user.id,
    uuid: user.uuid,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export class AuthService {
  /**
   * Register a new user account.
   */
  static async register(name: string, email: string, password: string): Promise<AuthResponse> {
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      throw new Error('EMAIL_EXISTS');
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
      },
    });

    const payload = { userId: user.id, email: user.email };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    return {
      user: sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Log in an existing user.
   */
  static async login(email: string, password: string): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const passwordValid = await comparePassword(password, user.password);
    if (!passwordValid) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const payload = { userId: user.id, email: user.email };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    return {
      user: sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh expired access token using a valid refresh token.
   */
  static async refresh(token: string): Promise<TokenRefreshResponse> {
    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw new Error('INVALID_REFRESH_TOKEN');
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || user.refreshToken !== token) {
      throw new Error('INVALID_REFRESH_TOKEN');
    }

    const newPayload = { userId: user.id, email: user.email };
    const accessToken = generateAccessToken(newPayload);
    const newRefreshToken = generateRefreshToken(newPayload);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: newRefreshToken },
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Log out user by clearing their stored refresh token.
   */
  static async logout(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }

  /**
   * Generate temporary password reset token.
   */
  static async forgotPassword(email: string): Promise<{ message: string; resetToken?: string }> {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      // Return generic message to prevent email enumeration
      return {
        message: 'If an account with that email exists, a password reset link has been issued.',
      };
    }

    const resetToken = generateAccessToken({ userId: user.id, email: user.email });

    return {
      message: 'If an account with that email exists, a password reset link has been issued.',
      resetToken, // Returned in dev response per Phase 4 requirements
    };
  }

  /**
   * Reset user password using reset token.
   */
  static async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      try {
        payload = verifyRefreshToken(token);
      } catch {
        throw new Error('INVALID_RESET_TOKEN');
      }
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        refreshToken: null, // Invalidate existing sessions
      },
    });

    return { message: 'Password has been reset successfully.' };
  }
}
