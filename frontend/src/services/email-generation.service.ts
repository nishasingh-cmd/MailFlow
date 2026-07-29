/**
 * MailFlow — Email Generation Frontend Service
 * Phase 7: AI Email Generation
 *
 * NOTE: All backend email-generation endpoints return { success: boolean, data: T }.
 * Axios places the full response body in `response.data`, so we access `response.data.data`
 * to extract the actual payload.
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

// Backend wraps responses as { success: boolean; data: T; message?: string }
interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const emailGenerationService = {
  /**
   * Generate personalized email and subject line suggestions
   */
  async generateEmail(req: GenerateEmailRequest): Promise<GeneratedEmailResult> {
    const { data: envelope } = await api.post<ApiEnvelope<GeneratedEmailResult>>(
      '/email-generation/generate',
      req
    );
    return envelope.data;
  },

  /**
   * Generate 5 subject lines
   */
  async generateSubjects(leadId: string, template?: EmailTemplateType): Promise<string[]> {
    const { data: envelope } = await api.post<ApiEnvelope<string[]>>('/email-generation/subjects', {
      leadId,
      template,
    });
    return envelope.data ?? [];
  },

  /**
   * Regenerate email
   */
  async regenerateEmail(req: GenerateEmailRequest): Promise<GeneratedEmailResult> {
    const { data: envelope } = await api.post<ApiEnvelope<GeneratedEmailResult>>(
      '/email-generation/regenerate',
      req
    );
    return envelope.data;
  },

  /**
   * Save draft to database
   */
  async saveDraft(req: SaveDraftRequest): Promise<EmailDraft> {
    const { data: envelope } = await api.post<ApiEnvelope<EmailDraft>>(
      '/email-generation/drafts',
      req
    );
    return envelope.data;
  },

  /**
   * Update existing draft
   */
  async updateDraft(draftId: string, req: UpdateDraftRequest): Promise<EmailDraft> {
    const { data: envelope } = await api.put<ApiEnvelope<EmailDraft>>(
      `/email-generation/drafts/${draftId}`,
      req
    );
    return envelope.data;
  },

  /**
   * Get draft by ID
   */
  async getDraft(draftId: string): Promise<EmailDraft> {
    const { data: envelope } = await api.get<ApiEnvelope<EmailDraft>>(
      `/email-generation/drafts/${draftId}`
    );
    return envelope.data;
  },

  /**
   * Get draft by Lead ID — returns null if no draft exists yet
   */
  async getDraftByLead(leadId: string): Promise<EmailDraft | null> {
    try {
      const { data: envelope } = await api.get<ApiEnvelope<EmailDraft | null>>(
        `/email-generation/drafts/lead/${leadId}`
      );
      return envelope.data ?? null;
    } catch {
      return null;
    }
  },

  /**
   * List all drafts
   */
  async listDrafts(): Promise<EmailDraft[]> {
    const { data: envelope } = await api.get<ApiEnvelope<EmailDraft[]>>('/email-generation/drafts');
    return envelope.data ?? [];
  },
};
