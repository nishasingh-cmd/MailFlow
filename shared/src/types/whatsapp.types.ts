/**
 * MailFlow — Shared Types for Phase 10: WhatsApp Outreach Module
 */

export type CampaignChannel = 'EMAIL' | 'WHATSAPP' | 'EMAIL_AND_WHATSAPP';
export type WhatsappMessageStatus =
  'DRAFT' | 'QUEUED' | 'SENDING' | 'SENT' | 'FAILED' | 'CANCELLED';

export interface WhatsappDraftItem {
  id: string;
  userId: string;
  leadId: string;
  campaignId?: string | null;
  message: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  lead?: {
    name: string;
    email: string;
    phone?: string | null;
    company?: string | null;
  };
  campaign?: {
    name: string;
  };
}

export interface WhatsappQueueItem {
  id: string;
  userId: string;
  campaignId?: string | null;
  leadId: string;
  phone: string;
  message: string;
  status: 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED' | 'CANCELLED';
  attempts: number;
  maxRetries: number;
  messageId?: string | null;
  scheduledAt: string;
  sentAt?: string | null;
  lastAttemptAt?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
  lead?: {
    name: string;
    email: string;
    phone?: string | null;
    company?: string | null;
  };
  campaign?: {
    name: string;
  };
}

export interface WhatsappLogItem {
  id: string;
  userId: string;
  campaignId?: string | null;
  leadId: string;
  queueId?: string | null;
  phone: string;
  message: string;
  status: 'SENT' | 'FAILED';
  provider: string;
  retryCount: number;
  messageId?: string | null;
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

export interface GenerateWhatsappRequest {
  leadId: string;
  campaignObjective?: string;
  cta?: string;
}

export interface GenerateWhatsappResponse {
  leadId: string;
  leadName: string;
  companyName: string;
  phone: string;
  message: string;
  characterCount: number;
}

export interface SendWhatsappRequest {
  leadIds?: string[];
  campaignId?: string;
  message?: string;
  sendAll?: boolean;
}

export interface WhatsappHistoryQuery {
  search?: string;
  status?: 'SENT' | 'FAILED' | 'ALL';
  campaignId?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedWhatsappHistoryResponse {
  logs: WhatsappLogItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedWhatsappFailedQueueResponse {
  jobs: WhatsappQueueItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface WhatsappStats {
  totalSent: number;
  pending: number;
  failed: number;
  successRate: number;
}
