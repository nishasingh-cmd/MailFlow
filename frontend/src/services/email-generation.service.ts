import { api } from './api';
import {
  EmailDraft,
  EmailTemplateType,
  GenerateEmailRequest,
  GeneratedEmailResult,
  SaveDraftRequest,
  UpdateDraftRequest,
} from '@mailflow/shared';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const emailGenerationService = {
  async generateEmail(req: GenerateEmailRequest): Promise<GeneratedEmailResult> {
    const { data: envelope } = await api.post<ApiEnvelope<GeneratedEmailResult>>(
      '/email-generation/generate',
      req
    );
    return envelope.data;
  },

  async generateSubjects(leadId: string, template?: EmailTemplateType): Promise<string[]> {
    const { data: envelope } = await api.post<ApiEnvelope<string[]>>('/email-generation/subjects', {
      leadId,
      template,
    });
    return envelope.data ?? [];
  },

  async regenerateEmail(req: GenerateEmailRequest): Promise<GeneratedEmailResult> {
    const { data: envelope } = await api.post<ApiEnvelope<GeneratedEmailResult>>(
      '/email-generation/regenerate',
      req
    );
    return envelope.data;
  },

  async saveDraft(req: SaveDraftRequest): Promise<EmailDraft> {
    const { data: envelope } = await api.post<ApiEnvelope<EmailDraft>>(
      '/email-generation/drafts',
      req
    );
    return envelope.data;
  },

  async updateDraft(draftId: string, req: UpdateDraftRequest): Promise<EmailDraft> {
    const { data: envelope } = await api.put<ApiEnvelope<EmailDraft>>(
      `/email-generation/drafts/${draftId}`,
      req
    );
    return envelope.data;
  },

  async getDraft(draftId: string): Promise<EmailDraft> {
    const { data: envelope } = await api.get<ApiEnvelope<EmailDraft>>(
      `/email-generation/drafts/${draftId}`
    );
    return envelope.data;
  },

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

  async listDrafts(): Promise<EmailDraft[]> {
    const { data: envelope } = await api.get<ApiEnvelope<EmailDraft[]>>('/email-generation/drafts');
    return envelope.data ?? [];
  },
};
