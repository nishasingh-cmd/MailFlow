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

// ─────────────────────────────────────────────────────────────────────────────
// Phase 6 — AI Company Research Types
// ─────────────────────────────────────────────────────────────────────────────

export type ResearchStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface Company {
  id: string;
  userId: string;
  name: string;
  website?: string | null;
  industry?: string | null;
  description?: string | null;
  products: string[];
  services: string[];
  headquarters?: string | null;
  companySize?: string | null;
  targetCustomers?: string | null;
  techStack: string[];
  createdAt: string;
  updatedAt: string;
  research?: CompanyResearch | null;
}

export interface CompanyResearch {
  id: string;
  companyId: string;
  status: ResearchStatus;
  summary?: string | null;
  painPoints?: string[] | null;
  opportunities?: string[] | null;
  errorMessage?: string | null;
  retryCount: number;
  lastResearched?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchSingleRequest {
  leadId: string;
}

export interface BulkResearchRequest {
  leadIds: string[];
}

export interface ResearchProgressResponse {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  results: Array<{
    leadId: string;
    companyName: string;
    status: ResearchStatus;
    error?: string;
  }>;
}

export interface LeadWithResearch extends Lead {
  companyId?: string | null;
  companyRef?: Company | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 7 — AI Email Generation Types
// ─────────────────────────────────────────────────────────────────────────────

export type EmailTemplateType =
  'Cold Outreach' | 'Follow-up' | 'Partnership' | 'Product Demo' | 'Custom Template';

export type DraftStatus = 'DRAFT' | 'SAVED' | 'SENT';

export interface UserOutreachContext {
  userName?: string;
  userCompany?: string;
  userProductService?: string;
}

export interface GenerateEmailRequest {
  leadId: string;
  template?: EmailTemplateType;
  customInstructions?: string;
  userContext?: UserOutreachContext;
  regenerate?: boolean;
  regenSeed?: number;
}

export interface GeneratedEmailSections {
  greeting: string;
  introduction: string;
  painPointAcknowledgement: string;
  solutionIntroduction: string;
  callToAction: string;
  closing: string;
}

export interface GeneratedEmailResult {
  subjectSuggestions: string[];
  selectedSubject: string;
  body: string;
  sections: GeneratedEmailSections;
  signature?: string;
  template: EmailTemplateType;
  promptUsed?: string;
}

export interface GenerateSubjectLinesRequest {
  leadId: string;
  template?: EmailTemplateType;
}

export interface EmailDraft {
  id: string;
  userId: string;
  leadId: string;
  researchId?: string | null;
  template: string;
  subject: string;
  body: string;
  status: DraftStatus;
  createdAt: string;
  updatedAt: string;
  lead?: Lead;
}

export interface SaveDraftRequest {
  leadId: string;
  researchId?: string;
  subject: string;
  body: string;
  template: string;
  status?: DraftStatus;
}

export interface UpdateDraftRequest {
  subject?: string;
  body?: string;
  template?: string;
  status?: DraftStatus;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 8 — Campaign Management Types
// ─────────────────────────────────────────────────────────────────────────────

export type CampaignStatus = 'DRAFT' | 'READY' | 'COMPLETED';

export interface CampaignLead {
  campaignId: string;
  leadId: string;
  addedAt: string;
  lead?: Lead & { emailDrafts?: EmailDraft[] };
}

export interface Campaign {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  status: CampaignStatus;
  templateId?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    campaignLeads: number;
  };
}

export interface CampaignDetail extends Campaign {
  campaignLeads: CampaignLead[];
}

export interface CreateCampaignRequest {
  name: string;
  campaignName?: string;
  description?: string;
  leadIds?: string[];
  selectedLeadIds?: string[];
  templateId?: string;
  selectedTemplate?: string;
  status?: CampaignStatus;
  createdBy?: string;
}

export interface UpdateCampaignRequest {
  name?: string;
  description?: string;
  leadIds?: string[];
  templateId?: string;
  status?: CampaignStatus;
}

export interface CampaignQueryFilters {
  search?: string;
  status?: CampaignStatus | 'ALL';
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'leadCount';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CampaignStats {
  total: number;
  draft: number;
  ready: number;
  completed: number;
}

export interface PaginatedCampaignsResponse {
  campaigns: Campaign[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: CampaignStats;
}
