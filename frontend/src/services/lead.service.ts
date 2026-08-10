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

  async importLeads(payload: ImportLeadsRequest): Promise<ImportLeadsResponse> {
    const { data } = await api.post<ImportLeadsResponse>('/leads/import', payload);
    return data;
  },

  async getLeads(filters: LeadQueryFilters = {}): Promise<PaginatedLeadsResponse> {
    const { data } = await api.get<PaginatedLeadsResponse>('/leads', {
      params: filters,
    });
    return data;
  },

  async getLead(id: string): Promise<Lead & { importHistory?: ImportHistory | null }> {
    const { data } = await api.get<Lead & { importHistory?: ImportHistory | null }>(`/leads/${id}`);
    return data;
  },

  async createLead(payload: CreateLeadRequest): Promise<Lead> {
    const { data } = await api.post<Lead>('/leads', payload);
    return data;
  },

  async updateLead(id: string, payload: UpdateLeadRequest): Promise<Lead> {
    const { data } = await api.put<Lead>(`/leads/${id}`, payload);
    return data;
  },

  async deleteLead(id: string): Promise<{ message: string }> {
    const { data } = await api.delete<{ message: string }>(`/leads/${id}`);
    return data;
  },

  async bulkDeleteLeads(ids: string[]): Promise<{ deletedCount: number; message: string }> {
    const { data } = await api.post<{ deletedCount: number; message: string }>(
      '/leads/bulk-delete',
      { ids }
    );
    return data;
  },

  async getImportHistory(): Promise<ImportHistory[]> {
    const { data } = await api.get<ImportHistory[]>('/leads/imports/history');
    return data;
  },
};
