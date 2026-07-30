/**
 * MailFlow — Shared Types for Phase 9: Email Delivery Engine
 */

export type SmtpProviderType = 'GMAIL' | 'OUTLOOK' | 'CUSTOM';
export type SmtpEncryption = 'TLS' | 'SSL' | 'NONE';
export type QueueJobStatus = 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED' | 'CANCELLED';

export interface SmtpConfig {
  id: string;
  userId: string;
  provider: SmtpProviderType;
  host: string;
  port: number;
  username: string;
  password?: string; // Masked when returned to UI
  hasPassword?: boolean;
  encryption: SmtpEncryption;
  fromName: string;
  fromEmail: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaveSmtpRequest {
  provider: SmtpProviderType;
  host: string;
  port: number;
  username: string;
  password?: string;
  encryption: SmtpEncryption;
  fromName: string;
  fromEmail: string;
}

export interface TestSmtpRequest {
  provider?: SmtpProviderType;
  host: string;
  port: number;
  username: string;
  password?: string;
  encryption: SmtpEncryption;
  fromName?: string;
  fromEmail?: string;
}

export interface TestSmtpResponse {
  success: boolean;
  message: string;
}

export interface EmailQueueItem {
  id: string;
  userId: string;
  campaignId: string;
  leadId: string;
  recipientEmail: string;
  subject: string;
  htmlBody: string;
  status: QueueJobStatus;
  attempts: number;
  maxRetries: number;
  scheduledAt: string;
  sentAt?: string | null;
  lastAttemptAt?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
  lead?: {
    name: string;
    email: string;
    company?: string | null;
  };
  campaign?: {
    name: string;
  };
}

export interface EmailLogItem {
  id: string;
  userId: string;
  campaignId: string;
  leadId: string;
  queueId?: string | null;
  recipientEmail: string;
  subject: string;
  status: 'SENT' | 'FAILED';
  provider?: string | null;
  retryCount: number;
  errorReason?: string | null;
  sentAt?: string | null;
  createdAt: string;
  lead?: {
    name: string;
    email: string;
    company?: string | null;
  };
  campaign?: {
    name: string;
  };
}

export interface CampaignProgress {
  campaignId: string;
  campaignName: string;
  status: string;
  total: number;
  sent: number;
  failed: number;
  pending: number;
  percentage: number;
  batchSize: number;
}

export interface DeliveryLogsQuery {
  search?: string;
  status?: 'SENT' | 'FAILED' | 'ALL';
  campaignId?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedDeliveryLogsResponse {
  logs: EmailLogItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FailedQueueQuery {
  search?: string;
  campaignId?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedFailedQueueResponse {
  jobs: EmailQueueItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
