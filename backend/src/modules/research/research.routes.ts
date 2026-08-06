import { Router } from 'express';
import { authenticateUser } from '../../middleware/auth.middleware';
import { ResearchController } from './research.controller';

const router = Router();

router.use(authenticateUser);

router.post('/single', ResearchController.researchSingle);
router.post('/bulk', ResearchController.researchBulk);
router.post('/all', ResearchController.researchAll);
router.post('/status', ResearchController.getBulkStatus);
router.get('/lead/:leadId', ResearchController.getResearchByLead);
router.post('/retry/:leadId', ResearchController.retryResearch);

export default router;
