import { api } from './api';
import {
  Lead,
  ImportHistory,
  ColumnMapping,
  ParsedFilePreview,
  LeadValidationResult,
  ImportLeadsRequest,
  ImportLeadsResponse,
  CreateLeadRequest,
  UpdateLeadRequest,
  LeadQueryFilters,
  PaginatedLeadsResponse,
} from '@mailflow/shared';

export const leadService = {
  /**
   * Upload file to preview headers, sample rows, and auto column mapping
   */
  async uploadPreview(file: File): Promise<ParsedFilePreview> {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await api.post<ParsedFilePreview>('/leads/upload-preview', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },

  /**
   * Send column mapping & file to validate format and detect duplicates
   */
  async validateMapping(file: File, mapping: ColumnMapping): Promise<LeadValidationResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mapping', JSON.stringify(mapping));

    const { data } = await api.post<LeadValidationResult>('/leads/validate-mapping', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },

  /**
   * Submit final verified leads for batch import
   */
  async importLeads(payload: ImportLeadsRequest): Promise<ImportLeadsResponse> {
    const { data } = await api.post<ImportLeadsResponse>('/leads/import', payload);
    return data;
  },

  /**
   * Get paginated leads list with search, status filters, and sorting
   */
  async getLeads(filters: LeadQueryFilters = {}): Promise<PaginatedLeadsResponse> {
    const { data } = await api.get<PaginatedLeadsResponse>('/leads', {
      params: filters,
    });
    return data;
  },

  /**
   * Fetch single lead details by ID
   */
  async getLead(id: string): Promise<Lead & { importHistory?: ImportHistory | null }> {
    const { data } = await api.get<Lead & { importHistory?: ImportHistory | null }>(`/leads/${id}`);
    return data;
  },

  /**
   * Create single lead manually
   */
  async createLead(payload: CreateLeadRequest): Promise<Lead> {
    const { data } = await api.post<Lead>('/leads', payload);
    return data;
  },

  /**
   * Update lead details
   */
  async updateLead(id: string, payload: UpdateLeadRequest): Promise<Lead> {
    const { data } = await api.put<Lead>(`/leads/${id}`, payload);
    return data;
  },

  /**
   * Delete single lead
   */
  async deleteLead(id: string): Promise<{ message: string }> {
    const { data } = await api.delete<{ message: string }>(`/leads/${id}`);
    return data;
  },

  /**
   * Delete multiple selected leads
   */
  async bulkDeleteLeads(ids: string[]): Promise<{ deletedCount: number; message: string }> {
    const { data } = await api.post<{ deletedCount: number; message: string }>(
      '/leads/bulk-delete',
      { ids }
    );
    return data;
  },

  /**
   * Get user file upload history
   */
  async getImportHistory(): Promise<ImportHistory[]> {
    const { data } = await api.get<ImportHistory[]>('/leads/imports/history');
    return data;
  },
};
