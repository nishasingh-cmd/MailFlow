import crypto from 'crypto';
import { prisma } from '../../config/db';
import { hashPassword, comparePassword } from '../../utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import {
  AuthResponse,
  SignupResponse,
  TokenRefreshResponse,
  UserResponse,
  VerifyEmailResponse,
} from './auth.types';
import { SystemMailService } from '../../services/system-mail.service';

function sanitizeUser(user: {
  id: string;
  uuid: string;
  name: string;
  email: string;
  avatar: string | null;
  hasBusinessProfile?: boolean;
  businessProfile?: { id: string } | null;
  emailVerified?: boolean;
  accountStatus?: string;
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
    emailVerified: user.emailVerified ?? false,
    accountStatus: user.accountStatus ?? 'PENDING',
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export class AuthService {
  static async register(name: string, email: string, password: string): Promise<SignupResponse> {
    const normalizedEmail = email.trim().toLowerCase();
    const masked = SystemMailService.maskEmail(normalizedEmail);
    console.log(`[Auth] Signup initiated email=${masked}`);

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      // Case B: If existing user is already verified and active -> throw EMAIL_EXISTS
      if (existing.emailVerified && existing.accountStatus === 'ACTIVE') {
        throw new Error('EMAIL_EXISTS');
      }

      // Case C: If existing user is unverified/pending -> update credentials and resend verification
      const hashedPassword = await hashPassword(password);
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          name,
          password: hashedPassword,
        },
      });

      // Invalidate previous verification tokens
      await prisma.emailVerificationToken.deleteMany({
        where: { userId: existing.id },
      });

      // Generate 6-digit crypto-secure code (100000 - 999999)
      const rawCode = crypto.randomInt(100000, 1000000).toString();
      const tokenHash = crypto.createHash('sha256').update(rawCode).digest('hex');
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await prisma.emailVerificationToken.create({
        data: {
          userId: existing.id,
          tokenHash,
          expiresAt,
          attempts: 0,
        },
      });

      // Send verification email to THAT EXACT email
      await SystemMailService.sendVerificationEmail(existing.email, name, rawCode, existing.id);

      return {
        requiresVerification: true,
        email: existing.email,
        message: 'Account created. Please check your email for the 6-digit verification code.',
      };
    }

    // Case A: Create brand new pending user
    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
        emailVerified: false,
        accountStatus: 'PENDING',
      },
    });

    // Generate 6-digit crypto-secure code (100000 - 999999)
    const rawCode = crypto.randomInt(100000, 1000000).toString();
    const tokenHash = crypto.createHash('sha256').update(rawCode).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        attempts: 0,
      },
    });

    // Send verification email to THAT EXACT email
    await SystemMailService.sendVerificationEmail(user.email, user.name, rawCode, user.id);

    return {
      requiresVerification: true,
      email: user.email,
      message: 'Account created. Please check your email for the 6-digit verification code.',
    };
  }

  static async login(email: string, password: string): Promise<AuthResponse> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
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

    // Check verification requirement: NO VERIFIED EMAIL = NO ACTIVE ACCOUNT
    if (!user.emailVerified || user.accountStatus !== 'ACTIVE') {
      console.warn(
        `[Auth] Login rejected: Unverified account email=${SystemMailService.maskEmail(user.email)}`
      );
      const err = new Error('EMAIL_NOT_VERIFIED');
      (err as unknown as { userEmail: string }).userEmail = user.email;
      throw err;
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

    if (!user.emailVerified || user.accountStatus !== 'ACTIVE') {
      throw new Error('ACCOUNT_NOT_ACTIVE');
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

  static async verifyEmail(token: string): Promise<VerifyEmailResponse> {
    if (!token || !token.trim()) {
      console.warn('[Auth] Verification token invalid');
      throw new Error('INVALID_TOKEN');
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

    const tokenRecord = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!tokenRecord) {
      console.warn('[Auth] Verification token invalid');
      throw new Error('INVALID_TOKEN');
    }

    if (tokenRecord.usedAt !== null) {
      return {
        success: true,
        message: 'Your email has already been verified.',
        code: 'ALREADY_VERIFIED',
      };
    }

    if (new Date() > tokenRecord.expiresAt) {
      console.warn('[Auth] Verification token expired');
      throw new Error('TOKEN_EXPIRED');
    }

    const user = tokenRecord.user;
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          accountStatus: 'ACTIVE',
        },
      }),
      prisma.emailVerificationToken.update({
        where: { id: tokenRecord.id },
        data: {
          usedAt: new Date(),
        },
      }),
    ]);

    console.log(`[Auth] Email verification successful userId=${user.id}`);

    return {
      success: true,
      message: 'Email verified successfully! Your MailFlow account is now active.',
      code: 'SUCCESS',
    };
  }

  static async verifyCode(email: string, rawCode: string): Promise<VerifyEmailResponse> {
    if (!email || !rawCode || !rawCode.trim()) {
      throw new Error('INVALID_CODE');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanCode = rawCode.trim();

    if (!/^\d{6}$/.test(cleanCode)) {
      throw new Error('INVALID_CODE');
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new Error('INVALID_CODE');
    }

    if (user.emailVerified && user.accountStatus === 'ACTIVE') {
      return {
        success: true,
        message: 'Your email has already been verified.',
        code: 'ALREADY_VERIFIED',
      };
    }

    // Find latest unused token for this user
    const tokenRecord = await prisma.emailVerificationToken.findFirst({
      where: {
        userId: user.id,
        usedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!tokenRecord) {
      throw new Error('NO_ACTIVE_CODE');
    }

    // Check attempts limit (max 5)
    if (tokenRecord.attempts >= 5) {
      console.warn(`[Auth] Verification code max attempts reached for userId=${user.id}`);
      throw new Error('TOO_MANY_ATTEMPTS');
    }

    // Check expiration (10 min)
    if (new Date() > tokenRecord.expiresAt) {
      console.warn(`[Auth] Verification code expired for userId=${user.id}`);
      throw new Error('CODE_EXPIRED');
    }

    const candidateHash = crypto.createHash('sha256').update(cleanCode).digest('hex');

    if (candidateHash !== tokenRecord.tokenHash) {
      const newAttempts = tokenRecord.attempts + 1;
      await prisma.emailVerificationToken.update({
        where: { id: tokenRecord.id },
        data: { attempts: newAttempts },
      });

      console.warn(
        `[Auth] Invalid verification code attempt ${newAttempts}/5 for userId=${user.id}`
      );
      if (newAttempts >= 5) {
        throw new Error('TOO_MANY_ATTEMPTS');
      }

      const attemptsRemaining = 5 - newAttempts;
      const err = Object.assign(
        new Error(
          `Invalid verification code. ${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} remaining.`
        ),
        { attemptsRemaining }
      );
      throw err;
    }

    // Valid code matched! Mark email verified and account active
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          accountStatus: 'ACTIVE',
        },
      }),
      prisma.emailVerificationToken.update({
        where: { id: tokenRecord.id },
        data: {
          usedAt: new Date(),
        },
      }),
    ]);

    console.log(
      `[Auth] Email verification code successful for userId=${user.id}, email=${SystemMailService.maskEmail(user.email)}`
    );

    return {
      success: true,
      message: 'Email verified successfully! Your MailFlow account is now active.',
      code: 'SUCCESS',
    };
  }

  static async resendVerification(email: string): Promise<{ message: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    // Anti-enumeration: Return generic message if user doesn't exist or is already verified
    if (!user || (user.emailVerified && user.accountStatus === 'ACTIVE')) {
      console.log(
        `[Auth] Resend verification requested for non-pending email: ${SystemMailService.maskEmail(normalizedEmail)}`
      );
      return {
        message: 'If an account requires verification, a verification email has been sent.',
      };
    }

    // Invalidate prior unused tokens
    await prisma.emailVerificationToken.deleteMany({
      where: { userId: user.id },
    });

    // Generate fresh 6-digit code with 10-minute expiry
    const rawCode = crypto.randomInt(100000, 1000000).toString();
    const tokenHash = crypto.createHash('sha256').update(rawCode).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        attempts: 0,
      },
    });

    await SystemMailService.sendVerificationEmail(user.email, user.name, rawCode, user.id);

    return {
      message: 'If an account requires verification, a verification email has been sent.',
    };
  }
}
