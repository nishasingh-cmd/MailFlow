/**
 * MailFlow — Shared Types for Phase 10: WhatsApp Outreach Module & Meta Cloud API Integration
 */

export type CampaignChannel = 'EMAIL' | 'WHATSAPP' | 'EMAIL_AND_WHATSAPP';
export type WhatsappMessageStatus =
  'DRAFT' | 'QUEUED' | 'SENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'CANCELLED';

export type WhatsappProviderType = 'MOCK' | 'META_CLOUD';

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
  status: 'PENDING' | 'PROCESSING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'CANCELLED';
  attempts: number;
  maxRetries: number;
  messageId?: string | null;
  scheduledAt: string;
  sentAt?: string | null;
  deliveredAt?: string | null;
  readAt?: string | null;
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
  status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'CANCELLED';
  provider: string;
  retryCount: number;
  messageId?: string | null;
  errorReason?: string | null;
  sentAt?: string | null;
  deliveredAt?: string | null;
  readAt?: string | null;
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
  status?: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'ALL';
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
  delivered: number;
  read: number;
  pending: number;
  failed: number;
  successRate: number;
  deliveryRate: number;
  readRate: number;
  provider: string;
}

export interface WhatsappConfigData {
  id?: string;
  provider: WhatsappProviderType;
  businessAccountId?: string | null;
  phoneNumberId?: string | null;
  displayPhone?: string | null;
  businessName?: string | null;
  hasAccessToken: boolean;
  webhookVerifyToken?: string | null;
  hasAppSecret?: boolean;
  graphApiVersion?: string | null;
  webhookUrl?: string | null;
  status: 'MOCK_ACTIVE' | 'CONNECTED' | 'DISCONNECTED' | 'FAILED';
  errorMessage?: string | null;
  lastTestedAt?: string | null;
  connectedAt?: string | null;
}

export interface SaveWhatsappConfigRequest {
  provider: WhatsappProviderType;
  businessAccountId?: string;
  phoneNumberId?: string;
  accessToken?: string;
  webhookVerifyToken?: string;
  appSecret?: string;
  graphApiVersion?: string;
}

export interface TestWhatsappConnectionResponse {
  success: boolean;
  message: string;
  status: 'MOCK_ACTIVE' | 'CONNECTED' | 'DISCONNECTED' | 'FAILED';
  details?: Record<string, unknown>;
}

// ─── Phase 2: Embedded Signup Types ──────────────────────────────────────────

export interface WhatsappConnectInitResponse {
  appId: string;
  configId: string;
  graphApiVersion: string;
}

export interface WhatsappCallbackRequest {
  code: string;
  wabaId?: string;
  phoneNumberId?: string;
  redirectUri?: string;
}

export interface WhatsappCallbackResponse {
  success: boolean;
  message: string;
  config: WhatsappConfigData;
}

export interface WhatsappStatusResponse {
  connected: boolean;
  config: WhatsappConfigData;
}

export interface WhatsappRefreshResponse {
  success: boolean;
  message: string;
  config: WhatsappConfigData;
}

export interface WhatsappDisconnectResponse {
  success: boolean;
  message: string;
}
