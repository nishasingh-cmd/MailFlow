import { z } from 'zod';

export const saveSmtpSchema = z.object({
  provider: z.enum(['GMAIL', 'OUTLOOK', 'CUSTOM']).default('CUSTOM'),
  host: z.string().min(1, 'SMTP Host is required'),
  port: z.coerce.number().int().min(1).max(65535, 'Invalid port number'),
  username: z.string().min(1, 'Username / Email is required'),
  password: z.string().optional(),
  encryption: z.enum(['TLS', 'SSL', 'NONE']).default('TLS'),
  fromName: z.string().min(1, 'From Name is required'),
  fromEmail: z.string().email('Invalid From Email address'),
});

export const testSmtpSchema = z.object({
  provider: z.enum(['GMAIL', 'OUTLOOK', 'CUSTOM']).optional(),
  host: z.string().min(1, 'SMTP Host is required'),
  port: z.coerce.number().int().min(1).max(65535, 'Invalid port number'),
  username: z.string().min(1, 'Username is required'),
  password: z.string().optional(),
  encryption: z.enum(['TLS', 'SSL', 'NONE']).default('TLS'),
  fromName: z.string().optional(),
  fromEmail: z.string().email('Invalid From Email address').optional(),
});

export type SaveSmtpInput = z.infer<typeof saveSmtpSchema>;
export type TestSmtpInput = z.infer<typeof testSmtpSchema>;
