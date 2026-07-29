/**
 * MailFlow — Research Validation
 * Phase 6: AI Company Research
 */
import { z } from 'zod';

export const researchSingleSchema = z.object({
  leadId: z.string().min(1, 'Lead ID is required'),
});

export const bulkResearchSchema = z.object({
  leadIds: z.array(z.string().min(1)).min(1, 'At least one lead ID is required').max(100),
});

export const retryResearchSchema = z.object({
  leadId: z.string().min(1, 'Lead ID is required'),
});
