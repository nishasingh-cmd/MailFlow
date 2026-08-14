import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { DashboardService } from './dashboard.service';

export class DashboardController {
  /**
   * GET /api/dashboard
   * Returns real-time dashboard metrics for the authenticated user.
   * userId is always derived from the JWT — never from the request body.
   */
  static async getDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const data = await DashboardService.getDashboardData(userId);
      res.json({ success: true, data });
    } catch (error) {
      console.error('[DashboardController] Error fetching dashboard data:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch dashboard data' });
    }
  }
}
