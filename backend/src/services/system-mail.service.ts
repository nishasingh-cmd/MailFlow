import nodemailer from 'nodemailer';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { decryptText } from '../utils/crypto';

export class SystemMailService {
  /**
   * Helper to safely mask email address for server logs
   * e.g. nishasingh59198@gmail.com -> n***8@gmail.com
   */
  static maskEmail(email: string): string {
    if (!email || !email.includes('@')) return '***';
    const [local, domain] = email.split('@');
    if (local.length <= 2) {
      return `${local[0]}*@${domain}`;
    }
    return `${local[0]}***${local[local.length - 1]}@${domain}`;
  }

  /**
   * Resolve nodemailer transporter:
   * 1. System environment variables (SMTP_HOST, SMTP_USER, SMTP_PASSWORD)
   * 2. Or fallback to active SmtpConfig in the database
   */
  static async getTransporter(userId?: string) {
    // 1. Try system SMTP from environment
    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD) {
      const isSecure = env.SMTP_SECURE || env.SMTP_PORT === 465;
      const transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: isSecure,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASSWORD,
        },
        tls: {
          rejectUnauthorized: false,
        },
        connectionTimeout: 10000,
        socketTimeout: 15000,
      });

      return {
        transporter,
        fromName: env.SMTP_FROM_NAME || 'MailFlow',
        fromEmail: env.SMTP_FROM || env.SMTP_USER,
      };
    }

    // 2. Try user-specific or latest active SmtpConfig from database
    let smtpConfig = null;
    if (userId) {
      smtpConfig = await prisma.smtpConfig.findUnique({ where: { userId } });
    }

    if (!smtpConfig) {
      // Fallback to any active SMTP configuration in the workspace
      smtpConfig = await prisma.smtpConfig.findFirst({
        orderBy: { updatedAt: 'desc' },
      });
    }

    if (smtpConfig && smtpConfig.password) {
      const decryptedPassword = decryptText(smtpConfig.password);
      const isSecure = smtpConfig.encryption === 'SSL' || smtpConfig.port === 465;
      const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: isSecure,
        auth: {
          user: smtpConfig.username,
          pass: decryptedPassword,
        },
        tls: {
          rejectUnauthorized: false,
        },
        connectionTimeout: 10000,
        socketTimeout: 15000,
      });

      return {
        transporter,
        fromName: smtpConfig.fromName || 'MailFlow',
        fromEmail: smtpConfig.fromEmail || smtpConfig.username,
      };
    }

    throw new Error(
      'SMTP email delivery is not configured. Please configure SMTP settings in backend environment or Settings -> Email Providers.'
    );
  }

  /**
   * Sends the password reset email with secure one-time link
   */
  static async sendPasswordResetEmail(
    recipientEmail: string,
    recipientName: string,
    rawToken: string,
    userId?: string
  ): Promise<void> {
    const masked = this.maskEmail(recipientEmail);
    console.log(`[Auth] Password reset email dispatch initiated for: ${masked}`);

    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${encodeURIComponent(rawToken)}`;
    const displayName = recipientName ? recipientName.split(' ')[0] : 'there';

    try {
      const { transporter, fromName, fromEmail } = await this.getTransporter(userId);

      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your MailFlow password</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0c0d12; color: #f4f4f5; margin: 0; padding: 0; }
    .container { max-width: 540px; margin: 40px auto; background-color: #14151f; border: 1px solid #27273a; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .header { padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #1f202e; }
    .logo-badge { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); border-radius: 12px; margin-bottom: 12px; }
    .brand-name { font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px; }
    .content { padding: 32px; color: #d4d4d8; font-size: 15px; line-height: 1.6; }
    .greeting { font-size: 17px; font-weight: 600; color: #ffffff; margin-bottom: 16px; }
    .btn-container { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #ffffff !important; text-decoration: none; font-weight: 600; font-size: 15px; padding: 14px 36px; border-radius: 10px; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4); }
    .expiry-note { font-size: 13px; color: #a1a1aa; background-color: #1c1d2b; padding: 12px 16px; border-radius: 8px; border: 1px solid #28293d; margin-top: 24px; }
    .footer { padding: 24px 32px; border-top: 1px solid #1f202e; text-align: center; font-size: 12px; color: #71717a; }
    .url-fallback { word-break: break-all; color: #818cf8; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-badge">
        <span style="font-size: 22px; color: #ffffff;">✉️</span>
      </div>
      <div class="brand-name">MailFlow</div>
    </div>
    <div class="content">
      <div class="greeting">Hi ${displayName},</div>
      <p>We received a request to reset your MailFlow password.</p>
      <p>Click the button below to create a new secure password:</p>
      
      <div class="btn-container">
        <a href="${resetUrl}" class="btn" target="_blank">Reset Password</a>
      </div>

      <div class="expiry-note">
        ⏱️ <strong>Note:</strong> This link expires in <strong>60 minutes</strong> and can only be used once. If you did not request a password reset, you can safely ignore this email.
      </div>

      <p style="margin-top: 24px; font-size: 13px; color: #71717a;">
        If the button above does not work, copy and paste this link into your browser:<br>
        <span class="url-fallback">${resetUrl}</span>
      </p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} MailFlow — AI-Powered Outreach Infrastructure. All rights reserved.
    </div>
  </div>
</body>
</html>
      `.trim();

      const textContent = `
Hi ${displayName},

We received a request to reset your MailFlow password.

Create a new password using this link:
${resetUrl}

This link expires in 60 minutes and can only be used once.

If you did not request this, you can safely ignore this email.

— MailFlow Team
      `.trim();

      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: recipientEmail,
        subject: 'Reset your MailFlow password',
        text: textContent,
        html: htmlContent,
      });

      console.log(`[Auth] Password reset email dispatched successfully to: ${masked}`);
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(`[Auth] Password reset email delivery failed for ${masked}:`, err.message);
      throw error;
    }
  }
}
