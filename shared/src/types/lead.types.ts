/**
 * Shared types for MailFlow — Lead Management Module (Phase 5).
 */

export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'UNSUBSCRIBED' | 'BOUNCED';

export interface Lead {
  id: string;
  userId: string;
  importHistoryId?: string | null;
  name: string;
  email: string;
  company?: string | null;
  phone?: string | null;
  website?: string | null;
  linkedin?: string | null;
  industry?: string | null;
  status: LeadStatus;
  customFields?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface ImportHistory {
  id: string;
  userId: string;
  fileName: string;
  fileSize: number;
  totalRows: number;
  importedCount: number;
  failedCount: number;
  duplicateCount: number;
  createdAt: string;
}

export interface ColumnMapping {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  website?: string;
  linkedin?: string;
  industry?: string;
  [key: string]: string | undefined;
}

export interface ParsedFilePreview {
  headers: string[];
  autoMapping: ColumnMapping;
  sampleRows: Record<string, string>[];
  totalRows: number;
  fileName: string;
  fileSize: number;
}

export interface InvalidLeadRow {
  rowNumber: number;
  data: Record<string, string>;
  reasons: string[];
}

export interface DuplicateLeadRow {
  rowNumber: number;
  email: string;
  name: string;
  company?: string;
  type: 'DATABASE_DUPLICATE' | 'FILE_DUPLICATE';
}

export interface LeadValidationResult {
  totalRows: number;
  validCount: number;
  duplicateCount: number;
  invalidCount: number;
  validLeads: Array<{
    name: string;
    email: string;
    company?: string;
    phone?: string;
    website?: string;
    linkedin?: string;
    industry?: string;
  }>;
  duplicates: DuplicateLeadRow[];
  invalidRows: InvalidLeadRow[];
}

export interface ImportLeadsRequest {
  fileName: string;
  fileSize: number;
  totalRows: number;
  validLeads: Array<{
    name: string;
    email: string;
    company?: string;
    phone?: string;
    website?: string;
    linkedin?: string;
    industry?: string;
  }>;
  duplicateCount: number;
  failedCount: number;
  skipDuplicates?: boolean;
}

export interface ImportLeadsResponse {
  importHistoryId: string;
  importedCount: number;
  failedCount: number;
  duplicateCount: number;
  message: string;
}

export interface CreateLeadRequest {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  website?: string;
  linkedin?: string;
  industry?: string;
  status?: LeadStatus;
}

export interface UpdateLeadRequest {
  name?: string;
  email?: string;
  company?: string;
  phone?: string;
  website?: string;
  linkedin?: string;
  industry?: string;
  status?: LeadStatus;
}

export interface LeadQueryFilters {
  search?: string;
  status?: LeadStatus | 'ALL';
  importHistoryId?: string;
  sortBy?: 'name' | 'email' | 'company' | 'createdAt' | 'status';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface PaginatedLeadsResponse {
  leads: Lead[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
