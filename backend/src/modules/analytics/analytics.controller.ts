import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { AnalyticsService } from './analytics.service';
import { AnalyticsFilterInput, DateRangePreset } from '@mailflow/shared';

export class AnalyticsController {
  /**
   * GET /api/analytics/overview
   */
  static async getOverview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized: User ID missing' });
        return;
      }

      const filters: AnalyticsFilterInput = {
        dateRange: (req.query.dateRange as DateRangePreset) || 'last_30_days',
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        campaignId: req.query.campaignId as string,
        status: req.query.status as string,
        leadSource: req.query.leadSource as string,
        industry: req.query.industry as string,
        search: req.query.search as string,
      };

      const data = await AnalyticsService.getOverview(userId, filters);
      res.json({ success: true, data });
    } catch (error) {
      console.error('[AnalyticsController.getOverview] Error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch analytics overview' });
    }
  }

  /**
   * GET /api/analytics/export
   */
  static async exportReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized: User ID missing' });
        return;
      }

      const filters: AnalyticsFilterInput = {
        dateRange: (req.query.dateRange as DateRangePreset) || 'last_30_days',
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        campaignId: req.query.campaignId as string,
        status: req.query.status as string,
        leadSource: req.query.leadSource as string,
        industry: req.query.industry as string,
      };

      const format = (req.query.format as string) || 'csv';
      const overview = await AnalyticsService.getOverview(userId, filters);

      if (format === 'csv') {
        let csv = `MailFlow Analytics Report\nDate Range: ${filters.dateRange || 'last_30_days'}\nGenerated At: ${new Date().toISOString()}\n\n`;
        csv += `SUMMARY STATISTICS\n`;
        csv += `Metric,Value\n`;
        csv += `Total Leads,${overview.summary.totalLeads.value}\n`;
        csv += `Total Campaigns,${overview.summary.totalCampaigns.value}\n`;
        csv += `Emails Sent,${overview.summary.emailsSent.value}\n`;
        csv += `Emails Pending,${overview.summary.emailsPending.value}\n`;
        csv += `Emails Failed,${overview.summary.emailsFailed.value}\n`;
        csv += `WhatsApp Sent,${overview.summary.whatsappSent.value}\n`;
        csv += `WhatsApp Pending,${overview.summary.whatsappPending.value}\n`;
        csv += `WhatsApp Failed,${overview.summary.whatsappFailed.value}\n`;
        csv += `Open Rate,${overview.summary.openRate.value}\n`;
        csv += `Reply Rate,${overview.summary.replyRate.value}\n\n`;

        csv += `CAMPAIGN PERFORMANCE\n`;
        csv += `Campaign Name,Channel,Status,Emails Sent,WhatsApp Sent,Pending,Failed,Open Rate (%),Reply Rate (%)\n`;
        overview.campaignPerformance.forEach((c) => {
          csv += `"${c.name.replace(/"/g, '""')}",${c.channel},${c.status},${c.emailsSent},${c.whatsappSent},${c.pending},${c.failed},${c.openRate},${c.replyRate}\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="MailFlow_Analytics_Report_${Date.now()}.csv"`
        );
        res.status(200).send(csv);
        return;
      }

      // Return JSON structure if format is json or excel metadata
      res.json({ success: true, data: overview });
    } catch (error) {
      console.error('[AnalyticsController.exportReport] Error:', error);
      res.status(500).json({ success: false, error: 'Failed to generate export report' });
    }
  }
}
