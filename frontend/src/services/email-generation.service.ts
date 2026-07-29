/**
 * MailFlow — Email Generation Frontend Service
 * Phase 7: AI Email Generation
 */
import { api } from './api';
import {
  EmailDraft,
  EmailTemplateType,
  GenerateEmailRequest,
  GeneratedEmailResult,
  SaveDraftRequest,
  UpdateDraftRequest,
} from '@mailflow/shared';

export const emailGenerationService = {
  /**
   * Generate personalized email and subject line suggestions
   */
  async generateEmail(req: GenerateEmailRequest): Promise<GeneratedEmailResult> {
    const { data } = await api.post<GeneratedEmailResult>('/email-generation/generate', req);
    return data;
  },

  /**
   * Generate 5 subject lines
   */
  async generateSubjects(leadId: string, template?: EmailTemplateType): Promise<string[]> {
    const { data } = await api.post<string[]>('/email-generation/subjects', { leadId, template });
    return data;
  },

  /**
   * Regenerate email
   */
  async regenerateEmail(req: GenerateEmailRequest): Promise<GeneratedEmailResult> {
    const { data } = await api.post<GeneratedEmailResult>('/email-generation/regenerate', req);
    return data;
  },

  /**
   * Save draft to database
   */
  async saveDraft(req: SaveDraftRequest): Promise<EmailDraft> {
    const { data } = await api.post<EmailDraft>('/email-generation/drafts', req);
    return data;
  },

  /**
   * Update existing draft
   */
  async updateDraft(draftId: string, req: UpdateDraftRequest): Promise<EmailDraft> {
    const { data } = await api.put<EmailDraft>(`/email-generation/drafts/${draftId}`, req);
    return data;
  },

  /**
   * Get draft by ID
   */
  async getDraft(draftId: string): Promise<EmailDraft> {
    const { data } = await api.get<EmailDraft>(`/email-generation/drafts/${draftId}`);
    return data;
  },

  /**
   * Get draft by Lead ID
   */
  async getDraftByLead(leadId: string): Promise<EmailDraft | null> {
    try {
      const { data } = await api.get<EmailDraft>(`/email-generation/drafts/lead/${leadId}`);
      return data;
    } catch {
      return null;
    }
  },

  /**
   * List all drafts
   */
  async listDrafts(): Promise<EmailDraft[]> {
    const { data } = await api.get<EmailDraft[]>('/email-generation/drafts');
    return data;
  },
};
