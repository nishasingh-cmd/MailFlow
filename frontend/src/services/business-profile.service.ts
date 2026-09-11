import { api } from './api';

export interface BusinessProfile {
  id: string;
  userId: string;
  businessName: string;
  website: string | null;
  industry: string;
  location: string | null;
  companySize: string | null;
  businessDescription: string;
  productsOrServices?: string | null;
  valueProposition?: string | null;
  targetAudience?: string | null;
  idealCustomerProfile?: string | null;
  outreachGoal?: string[];
  toneOfVoice?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBusinessProfileDto {
  businessName: string;
  website?: string;
  industry: string;
  location?: string;
  companySize?: string;
  businessDescription: string;
  productsOrServices?: string;
  valueProposition?: string;
  targetAudience?: string;
  idealCustomerProfile?: string;
  outreachGoal?: string[];
  toneOfVoice?: string;
}

export type UpdateBusinessProfileDto = Partial<CreateBusinessProfileDto>;

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  details?: Record<string, string>;
}

export const businessProfileService = {
  async getProfile(): Promise<BusinessProfile | null> {
    const { data: envelope } =
      await api.get<ApiEnvelope<BusinessProfile | null>>('/business-profile');
    return envelope.data;
  },

  async createProfile(data: CreateBusinessProfileDto): Promise<BusinessProfile> {
    const { data: envelope } = await api.post<ApiEnvelope<BusinessProfile>>(
      '/business-profile',
      data
    );
    if (!envelope.success) {
      throw new Error(envelope.error || 'Failed to save business profile');
    }
    return envelope.data;
  },

  async updateProfile(data: UpdateBusinessProfileDto): Promise<BusinessProfile> {
    const { data: envelope } = await api.patch<ApiEnvelope<BusinessProfile>>(
      '/business-profile',
      data
    );
    if (!envelope.success) {
      throw new Error(envelope.error || 'Failed to update business profile');
    }
    return envelope.data;
  },

  async getBusinessContext(): Promise<string> {
    const { data: envelope } = await api.get<ApiEnvelope<{ context: string }>>(
      '/business-profile/context'
    );
    return envelope.data.context;
  },
};
