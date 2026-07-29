import { z } from 'zod';

export const leadStatusEnum = z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'UNSUBSCRIBED', 'BOUNCED']);

export const createLeadSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  company: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  linkedin: z.string().optional(),
  industry: z.string().optional(),
  status: leadStatusEnum.optional(),
});

export const updateLeadSchema = createLeadSchema.partial();

export const bulkDeleteSchema = z.object({
  ids: z.array(z.string()).min(1, 'At least one lead ID must be provided'),
});

export const validateMappingSchema = z.object({
  mapping: z.object({
    name: z.string(),
    email: z.string(),
    company: z.string().optional(),
    phone: z.string().optional(),
    website: z.string().optional(),
    linkedin: z.string().optional(),
    industry: z.string().optional(),
  }),
});

export const importLeadsSchema = z.object({
  fileName: z.string(),
  fileSize: z.number(),
  totalRows: z.number(),
  validLeads: z.array(
    z.object({
      name: z.string(),
      email: z.string().email(),
      company: z.string().optional(),
      phone: z.string().optional(),
      website: z.string().optional(),
      linkedin: z.string().optional(),
      industry: z.string().optional(),
    })
  ),
  duplicateCount: z.number(),
  failedCount: z.number(),
  skipDuplicates: z.boolean().optional(),
});

export const queryLeadsSchema = z.object({
  search: z.string().optional(),
  status: leadStatusEnum.or(z.literal('ALL')).optional(),
  importHistoryId: z.string().optional(),
  sortBy: z.enum(['name', 'email', 'company', 'createdAt', 'status']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});
