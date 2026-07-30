import { z } from 'zod';

const campaignStatusValues = [
  'DRAFT',
  'READY',
  'COMPLETED',
  'Draft',
  'Ready',
  'Completed',
] as const;

export const createCampaignSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Campaign name is required')
      .max(200, 'Name must be 200 characters or less')
      .optional(),
    campaignName: z.string().min(1).max(200).optional(),
    description: z
      .string()
      .max(1000, 'Description must be 1000 characters or less')
      .nullable()
      .optional(),
    leadIds: z.array(z.string()).optional().default([]),
    selectedLeadIds: z.array(z.string()).optional(),
    templateId: z.string().max(100).nullable().optional(),
    selectedTemplate: z.string().max(100).nullable().optional(),
    status: z.enum(campaignStatusValues).optional().default('DRAFT'),
    createdBy: z.string().optional(),
  })
  .refine((data) => data.name || data.campaignName, {
    message: 'Campaign name is required',
    path: ['name'],
  });

export const updateCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(200).optional(),
  campaignName: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  leadIds: z.array(z.string()).optional(),
  selectedLeadIds: z.array(z.string()).optional(),
  templateId: z.string().max(100).nullable().optional(),
  selectedTemplate: z.string().max(100).nullable().optional(),
  status: z.enum(campaignStatusValues).optional(),
});

export const queryCampaignsSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['DRAFT', 'READY', 'COMPLETED', 'Draft', 'Ready', 'Completed', 'ALL']).optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt', 'leadCount']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type QueryCampaignsInput = z.infer<typeof queryCampaignsSchema>;
