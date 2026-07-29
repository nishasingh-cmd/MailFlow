/**
 * MailFlow — Email Generation Routes
 * Phase 7: AI Email Generation
 */
import { Router } from 'express';
import { authenticateUser } from '../../middleware/auth.middleware';
import { EmailGenerationController } from './email-generation.controller';

const router = Router();

// All email generation routes require authentication
router.use(authenticateUser);

/** Generate personalized email */
router.post('/generate', EmailGenerationController.generateEmail);

/** Generate subject line suggestions */
router.post('/subjects', EmailGenerationController.generateSubjects);

/** Regenerate personalized email */
router.post('/regenerate', EmailGenerationController.regenerateEmail);

/** Save or create email draft */
router.post('/drafts', EmailGenerationController.saveDraft);

/** Update existing email draft */
router.put('/drafts/:id', EmailGenerationController.updateDraft);

/** Get email draft by draft ID */
router.get('/drafts/:id', EmailGenerationController.getDraft);

/** Get email draft by lead ID */
router.get('/drafts/lead/:leadId', EmailGenerationController.getDraftByLead);

/** List all drafts for authenticated user */
router.get('/drafts', EmailGenerationController.listDrafts);

export default router;
