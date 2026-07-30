import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
import { SaveSmtpInput, TestSmtpInput } from './smtp.validation';
import { encryptText, decryptText } from '../../utils/crypto';

const prisma = new PrismaClient();

export class SmtpService {
  /**
   * Get user SMTP Configuration (with password masked)
   */
  static async getConfig(userId: string) {
    const config = await prisma.smtpConfig.findUnique({
      where: { userId },
    });

    if (!config) return null;

    return {
      id: config.id,
      userId: config.userId,
      provider: config.provider,
      host: config.host,
      port: config.port,
      username: config.username,
      hasPassword: Boolean(config.password),
      password: config.password ? '••••••••' : '',
      encryption: config.encryption,
      fromName: config.fromName,
      fromEmail: config.fromEmail,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }

  /**
   * Save or update user SMTP Configuration
   */
  static async saveConfig(userId: string, input: SaveSmtpInput) {
    const existing = await prisma.smtpConfig.findUnique({ where: { userId } });

    let encryptedPassword = existing?.password || '';

    // If new password provided (not empty and not masked), encrypt it
    if (input.password && input.password !== '••••••••') {
      encryptedPassword = encryptText(input.password);
    }

    if (!encryptedPassword) {
      throw new Error('SMTP password is required.');
    }

    // Verify SMTP connection before saving
    const decryptedPassword = decryptText(encryptedPassword);
    await this.verifySmtpCredentials({
      host: input.host,
      port: input.port,
      username: input.username,
      password: decryptedPassword,
      encryption: input.encryption,
    });

    const config = await prisma.smtpConfig.upsert({
      where: { userId },
      create: {
        userId,
        provider: input.provider,
        host: input.host,
        port: input.port,
        username: input.username,
        password: encryptedPassword,
        encryption: input.encryption,
        fromName: input.fromName,
        fromEmail: input.fromEmail,
      },
      update: {
        provider: input.provider,
        host: input.host,
        port: input.port,
        username: input.username,
        password: encryptedPassword,
        encryption: input.encryption,
        fromName: input.fromName,
        fromEmail: input.fromEmail,
      },
    });

    return {
      id: config.id,
      userId: config.userId,
      provider: config.provider,
      host: config.host,
      port: config.port,
      username: config.username,
      hasPassword: true,
      password: '••••••••',
      encryption: config.encryption,
      fromName: config.fromName,
      fromEmail: config.fromEmail,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }

  /**
   * Test SMTP credentials without saving
   */
  static async testConnection(userId: string, input: TestSmtpInput) {
    let passwordToUse = input.password;

    // If password is masked or empty, try fetching existing saved password
    if (!passwordToUse || passwordToUse === '••••••••') {
      const existing = await prisma.smtpConfig.findUnique({ where: { userId } });
      if (existing?.password) {
        passwordToUse = decryptText(existing.password);
      }
    }

    if (!passwordToUse) {
      throw new Error('SMTP Password is required to test the connection.');
    }

    await this.verifySmtpCredentials({
      host: input.host,
      port: input.port,
      username: input.username,
      password: passwordToUse,
      encryption: input.encryption,
    });

    return { success: true, message: 'SMTP Connection successful! Credentials verified.' };
  }

  /**
   * Low-level helper to verify SMTP connection via Nodemailer
   */
  static async verifySmtpCredentials(opts: {
    host: string;
    port: number;
    username: string;
    password?: string;
    encryption: string;
  }): Promise<boolean> {
    const isSecure = opts.encryption === 'SSL' || opts.port === 465;

    const transporter = nodemailer.createTransport({
      host: opts.host,
      port: opts.port,
      secure: isSecure,
      auth: {
        user: opts.username,
        pass: opts.password || '',
      },
      tls: {
        rejectUnauthorized: false, // Prevents self-signed certificate errors in dev
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });

    try {
      await transporter.verify();
      return true;
    } catch (error: unknown) {
      const err = error as { message?: string; code?: string };
      console.error('[SmtpService] SMTP Verify Error:', err);
      if (err.code === 'EAUTH') {
        throw new Error(
          'SMTP Authentication failed. Please check your username/email and password or App Password.'
        );
      }
      if (err.code === 'ESOCKET' || err.code === 'ETIMEDOUT') {
        throw new Error(
          `SMTP Connection timed out connecting to ${opts.host}:${opts.port}. Check host and port.`
        );
      }
      throw new Error(err.message || 'SMTP Connection failed. Verify host, port, and credentials.');
    }
  }

  /**
   * Helper to create a nodemailer transporter for an active user
   */
  static async getTransporterForUser(userId: string) {
    const config = await prisma.smtpConfig.findUnique({ where: { userId } });
    if (!config) {
      throw new Error(
        'SMTP configuration not found. Please configure SMTP settings before sending campaigns.'
      );
    }

    const decryptedPassword = decryptText(config.password);
    const isSecure = config.encryption === 'SSL' || config.port === 465;

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: isSecure,
      auth: {
        user: config.username,
        pass: decryptedPassword,
      },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 10000,
      socketTimeout: 20000,
    });

    return {
      transporter,
      fromName: config.fromName,
      fromEmail: config.fromEmail,
      provider: config.provider,
    };
  }
}
