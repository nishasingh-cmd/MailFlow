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

    // 2. Query all database SMTP configs to find a working active transport
    const configs = await prisma.smtpConfig.findMany({
      orderBy: { updatedAt: 'desc' },
    });

    // If userId provided, put user's config first in list
    if (userId) {
      const userIndex = configs.findIndex((c) => c.userId === userId);
      if (userIndex > 0) {
        const userConfig = configs.splice(userIndex, 1)[0];
        configs.unshift(userConfig);
      }
    }

    for (const smtpConfig of configs) {
      if (!smtpConfig.password) continue;
      try {
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
          connectionTimeout: 8000,
          socketTimeout: 10000,
        });

        // Verify transporter credentials
        await transporter.verify();

        return {
          transporter,
          fromName: smtpConfig.fromName || 'MailFlow',
          fromEmail: smtpConfig.fromEmail || smtpConfig.username,
        };
      } catch (err: unknown) {
        const verifyErr = err as Error;
        console.warn(
          `[SystemMail] SmtpConfig ${smtpConfig.id} (${smtpConfig.username}) verification failed: ${verifyErr.message}. Trying next available configuration...`
        );
        continue;
      }
    }

    throw new Error(
      'SMTP email delivery is not configured or working. Please configure SMTP settings in backend environment or Settings -> Email Providers.'
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
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your MailFlow password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);">
          
          <!-- Header / Brand Banner -->
          <tr>
            <td align="center" style="padding: 36px 32px 28px 32px; background-color: #ffffff; border-bottom: 1px solid #f1f5f9;">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; width: 48px; height: 48px; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); border-radius: 12px; text-align: center; line-height: 48px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);">
                      <span style="font-size: 24px; line-height: 48px; color: #ffffff;">✉️</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 12px;">
                    <span style="font-size: 22px; font-weight: 700; color: #0f172a; letter-spacing: -0.5px;">MailFlow</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Email Content Body -->
          <tr>
            <td style="padding: 32px 36px;">
              <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: -0.3px;">
                Hi ${displayName},
              </h2>
              
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.65; color: #334155;">
                We received a request to reset the password for your MailFlow account. Click the button below to choose a new password:
              </p>

              <!-- CTA Button -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 32px 0;">
                <tr>
                  <td align="center">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${resetUrl}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="20%" stroke="f" fillcolor="#4f46e5">
                    <w:anchorlock/>
                    <center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:bold;">Reset Password</center>
                    </v:roundrect>
                    <![endif]-->
                    <a href="${resetUrl}" target="_blank" style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); background-color: #4f46e5; border-radius: 10px; color: #ffffff !important; display: inline-block; font-size: 15px; font-weight: 600; line-height: 48px; text-align: center; text-decoration: none; width: 220px; -webkit-text-size-adjust: none; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35);">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Security / Expiration Notice Box -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 18px; margin: 24px 0 16px 0;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td width="24" valign="top" style="font-size: 16px; line-height: 1.4;">⏱️</td>
                    <td style="padding-left: 8px; font-size: 13px; line-height: 1.5; color: #64748b;">
                      <strong style="color: #334155;">Security Notice:</strong> This link is valid for <strong style="color: #334155;">60 minutes</strong> and can only be used once. If you did not request this password reset, no action is needed and your account remains secure.
                    </td>
                  </tr>
                </table>
              </div>

              <!-- URL Fallback -->
              <p style="margin: 24px 0 0 0; font-size: 13px; line-height: 1.5; color: #94a3b8; word-break: break-all;">
                Having trouble clicking the button? Copy and paste this URL into your web browser:<br />
                <a href="${resetUrl}" target="_blank" style="color: #6366f1; text-decoration: underline; font-size: 12px;">${resetUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Card Footer -->
          <tr>
            <td align="center" style="padding: 24px 32px 32px 32px; background-color: #fafafa; border-top: 1px solid #f1f5f9;">
              <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 600; color: #64748b;">
                MailFlow &bull; AI-Powered Outreach Infrastructure
              </p>
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                &copy; ${new Date().getFullYear()} MailFlow. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
        
        <!-- Outside Footer Note -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; margin-top: 16px;">
          <tr>
            <td align="center" style="font-size: 12px; color: #94a3b8; line-height: 1.4;">
              This is an automated system email sent to ${recipientEmail}. Please do not reply directly to this message.
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
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
