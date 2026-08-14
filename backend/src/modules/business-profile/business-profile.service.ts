import { prisma } from '../../config/db';
import { BusinessProfile } from '@prisma/client';

export interface CreateBusinessProfileDto {
  businessName: string;
  website?: string;
  industry: string;
  location?: string;
  companySize?: string;
  businessDescription: string;
  productsOrServices: string;
  valueProposition: string;
  targetAudience: string;
  idealCustomerProfile: string;
  outreachGoal: string[];
  toneOfVoice: string;
}

export type UpdateBusinessProfileDto = Partial<CreateBusinessProfileDto>;

export class BusinessProfileService {
  static async getProfile(userId: string): Promise<BusinessProfile | null> {
    const profile = await prisma.businessProfile.findUnique({
      where: { userId },
    });
    return profile;
  }

  static async createProfile(
    userId: string,
    data: CreateBusinessProfileDto
  ): Promise<BusinessProfile> {
    const existing = await prisma.businessProfile.findUnique({
      where: { userId },
    });

    if (existing) {
      // If profile already exists, update it instead of failing
      return this.updateProfile(userId, data);
    }

    const profile = await prisma.businessProfile.create({
      data: {
        userId,
        businessName: data.businessName.trim(),
        website: data.website?.trim() || null,
        industry: data.industry.trim(),
        location: data.location?.trim() || null,
        companySize: data.companySize?.trim() || null,
        businessDescription: data.businessDescription.trim(),
        productsOrServices: data.productsOrServices.trim(),
        valueProposition: data.valueProposition.trim(),
        targetAudience: data.targetAudience.trim(),
        idealCustomerProfile: data.idealCustomerProfile.trim(),
        outreachGoal: Array.isArray(data.outreachGoal) ? data.outreachGoal : [data.outreachGoal],
        toneOfVoice: data.toneOfVoice.trim(),
      },
    });

    return profile;
  }

  static async updateProfile(
    userId: string,
    data: UpdateBusinessProfileDto
  ): Promise<BusinessProfile> {
    const existing = await prisma.businessProfile.findUnique({
      where: { userId },
    });

    if (!existing) {
      // If doesn't exist yet, create it
      return this.createProfile(userId, data as CreateBusinessProfileDto);
    }

    const profile = await prisma.businessProfile.update({
      where: { userId },
      data: {
        ...(data.businessName !== undefined && { businessName: data.businessName.trim() }),
        ...(data.website !== undefined && { website: data.website?.trim() || null }),
        ...(data.industry !== undefined && { industry: data.industry.trim() }),
        ...(data.location !== undefined && { location: data.location?.trim() || null }),
        ...(data.companySize !== undefined && { companySize: data.companySize?.trim() || null }),
        ...(data.businessDescription !== undefined && {
          businessDescription: data.businessDescription.trim(),
        }),
        ...(data.productsOrServices !== undefined && {
          productsOrServices: data.productsOrServices.trim(),
        }),
        ...(data.valueProposition !== undefined && {
          valueProposition: data.valueProposition.trim(),
        }),
        ...(data.targetAudience !== undefined && {
          targetAudience: data.targetAudience.trim(),
        }),
        ...(data.idealCustomerProfile !== undefined && {
          idealCustomerProfile: data.idealCustomerProfile.trim(),
        }),
        ...(data.outreachGoal !== undefined && {
          outreachGoal: Array.isArray(data.outreachGoal) ? data.outreachGoal : [data.outreachGoal],
        }),
        ...(data.toneOfVoice !== undefined && { toneOfVoice: data.toneOfVoice.trim() }),
      },
    });

    return profile;
  }

  /**
   * Generates a concise AI-ready context prompt based on the client's business profile.
   * This is used by AI email generation and research services.
   */
  static async getBusinessContext(userId: string): Promise<string> {
    const profile = await this.getProfile(userId);
    if (!profile) return '';

    return `CLIENT SENDER IDENTITY & BUSINESS CONTEXT:
- Sender Company: ${profile.businessName}
- Industry: ${profile.industry}
- Location: ${profile.location || 'Not specified'}
- Company Overview: ${profile.businessDescription}
- Core Products & Services: ${profile.productsOrServices}
- Value Proposition: ${profile.valueProposition}
- Target Audience: ${profile.targetAudience}
- Ideal Customer Profile (ICP): ${profile.idealCustomerProfile}
- Outreach Goals: ${profile.outreachGoal.join(', ')}
- Preferred Tone of Voice: ${profile.toneOfVoice}`;
  }
}
