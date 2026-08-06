import { Router } from 'express';
import { authenticateUser } from '../../middleware/auth.middleware';
import { CampaignsController } from './campaigns.controller';

const router = Router();

router.use(authenticateUser);

router.post('/', CampaignsController.create);
router.get('/', CampaignsController.list);
router.get('/:id', CampaignsController.getById);
router.patch('/:id', CampaignsController.update);
router.delete('/:id', CampaignsController.remove);

router.post('/:id/duplicate', CampaignsController.duplicate);

export default router;
