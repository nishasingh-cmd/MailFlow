import { Router } from 'express';
import { authenticateUser } from '../../middleware/auth.middleware';
import { EmailGenerationController } from './email-generation.controller';

const router = Router();

router.use(authenticateUser);

router.post('/generate', EmailGenerationController.generateEmail);
router.post('/subjects', EmailGenerationController.generateSubjects);
router.post('/regenerate', EmailGenerationController.regenerateEmail);
router.post('/drafts', EmailGenerationController.saveDraft);
router.put('/drafts/:id', EmailGenerationController.updateDraft);
router.get('/drafts/:id', EmailGenerationController.getDraft);
router.get('/drafts/lead/:leadId', EmailGenerationController.getDraftByLead);
router.get('/drafts', EmailGenerationController.listDrafts);

export default router;
