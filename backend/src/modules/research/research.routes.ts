/**
 * MailFlow — Research Routes
 * Phase 6: AI Company Research
 */
import { Router } from 'express';
import { authenticateUser } from '../../middleware/auth.middleware';
import { ResearchController } from './research.controller';

const router = Router();

// All routes are protected
router.use(authenticateUser);

// ── Company Research Routes ───────────────────────────────────────────────────

/** Research a single lead's company */
router.post('/single', ResearchController.researchSingle);

/** Research multiple leads' companies */
router.post('/bulk', ResearchController.researchBulk);

/** Research all leads for the authenticated user */
router.post('/all', ResearchController.researchAll);

/** Get bulk research status for multiple leads */
router.post('/status', ResearchController.getBulkStatus);

/** Get research result for a specific lead */
router.get('/lead/:leadId', ResearchController.getResearchByLead);

/** Retry failed research for a lead */
router.post('/retry/:leadId', ResearchController.retryResearch);

export default router;
