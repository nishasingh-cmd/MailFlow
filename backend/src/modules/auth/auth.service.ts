import crypto from 'crypto';
import { prisma } from '../../config/db';
import { hashPassword, comparePassword } from '../../utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { AuthResponse, TokenRefreshResponse, UserResponse } from './auth.types';
import { SystemMailService } from '../../services/system-mail.service';

function sanitizeUser(user: {
  id: string;
  uuid: string;
  name: string;
  email: string;
  avatar: string | null;
  businessProfile?: { id: string } | null;
  createdAt: Date;
  updatedAt: Date;
}): UserResponse {
  return {
    id: user.id,
    uuid: user.uuid,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    hasBusinessProfile: !!user.businessProfile,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export class AuthService {
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
      include: {
        businessProfile: { select: { id: true } },
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

  static async login(email: string, password: string): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        businessProfile: { select: { id: true } },
      },
    });
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

  static async logout(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }

  static async forgotPassword(email: string): Promise<{ message: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user) {
      console.log(
        `[Auth] Password reset requested for unregistered email: ${SystemMailService.maskEmail(normalizedEmail)}`
      );
      // Generic response to prevent account enumeration
      return {
        message: 'If an account exists for this email, a password reset link has been sent.',
      };
    }

    console.log(
      `[Auth] Password reset requested for email: ${SystemMailService.maskEmail(normalizedEmail)}`
    );

    // 1. Generate 32-byte crypto-secure random token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes

    // 2. Invalidate any previous unused tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    // 3. Store hashed token in database
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });
    console.log('[Auth] Reset token generated');

    // 4. Send real password reset email via SMTP
    await SystemMailService.sendPasswordResetEmail(user.email, user.name, rawToken, user.id);

    return {
      message: 'If an account exists for this email, a password reset link has been sent.',
    };
  }

  static async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    if (!token || !token.trim()) {
      throw new Error('INVALID_RESET_TOKEN');
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

    const resetTokenRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!resetTokenRecord || resetTokenRecord.usedAt !== null) {
      console.warn('[Auth] Password reset failed: Token is invalid or already used');
      throw new Error('INVALID_RESET_TOKEN');
    }

    if (new Date() > resetTokenRecord.expiresAt) {
      console.warn('[Auth] Password reset failed: Token has expired');
      throw new Error('TOKEN_EXPIRED');
    }

    const user = resetTokenRecord.user;
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    // Hash the new password with bcrypt
    const hashedPassword = await hashPassword(newPassword);

    // Update user password and invalidate refresh tokens / sessions
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          refreshToken: null, // Force re-login
        },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetTokenRecord.id },
        data: {
          usedAt: new Date(),
        },
      }),
    ]);

    console.log(
      `[Auth] Password successfully reset for: ${SystemMailService.maskEmail(user.email)}`
    );

    return { message: 'Password has been reset successfully.' };
  }
}
