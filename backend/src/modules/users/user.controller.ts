import { Response } from 'express';
import { UserService } from './user.service';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export class UserController {
  static async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const profile = await UserService.getProfile(userId);
      res.status(200).json(profile);
    } catch (error: unknown) {
      const err = error as { message?: string };
      if (err.message === 'USER_NOT_FOUND') {
        res.status(404).json({ error: 'User profile not found' });
        return;
      }
      res.status(500).json({ error: 'Failed to retrieve profile' });
    }
  }

  static async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { name, avatar } = req.body;
      const updated = await UserService.updateProfile(userId, { name, avatar });
      res.status(200).json(updated);
    } catch (error: unknown) {
      const err = error as { message?: string };
      if (err.message === 'USER_NOT_FOUND') {
        res.status(404).json({ error: 'User profile not found' });
        return;
      }
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
}
