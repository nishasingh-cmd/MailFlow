import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface DashboardRecentCampaign {
  id: string;
  name: string;
  status: string;
  channel: string;
  leadsCount: number;
  emailsSent: number;
  emailsFailed: number;
  createdAt: string;
}

export interface DashboardData {
  totalLeads: number;
  activeCampaigns: number;
  emailsSent: number;
  emailSuccessRate: number;
  recentCampaigns: DashboardRecentCampaign[];
  currentMonth: string;
  hasEmailData: boolean;
  businessName?: string | null;
  industry?: string | null;
}

/**
 * Dashboard service — returns lightweight, user-scoped real DB data for the Dashboard page.
 * All queries are filtered by userId derived from the authenticated JWT (never from request body).
 *
 * Metrics:
 *  - totalLeads       : COUNT of all leads belonging to the user
 *  - activeCampaigns  : COUNT of campaigns in QUEUED | SENDING | PAUSED | READY status
 *  - emailsSent       : COUNT of EmailLog rows with status=SENT (email only, NOT WhatsApp)
 *  - emailSuccessRate : sentEmails / (sentEmails + failedEmails) * 100  (0 when no data)
 *  - recentCampaigns  : Latest 5 campaigns with real sent/failed counts
 */
export class DashboardService {
  static async getDashboardData(userId: string): Promise<DashboardData> {
    // Run all queries in parallel — scoped strictly to this user
    const [
      totalLeads,
      activeCampaigns,
      emailsSentCount,
      emailsFailedCount,
      recentCampaignsRaw,
      businessProfile,
    ] = await Promise.all([
      // 1. Total leads — all leads for this user, no date restriction
      prisma.lead.count({
        where: { userId },
      }),

      // 2. Active campaigns — campaigns currently in-flight (not draft, not done)
      prisma.campaign.count({
        where: {
          userId,
          status: { in: ['QUEUED', 'SENDING', 'PAUSED', 'READY'] },
        },
      }),

      // 3. Emails sent — from EmailLog, status=SENT, strictly email (not WhatsApp)
      prisma.emailLog.count({
        where: { userId, status: 'SENT' },
      }),

      // 4. Emails failed — same source, status=FAILED
      prisma.emailLog.count({
        where: { userId, status: 'FAILED' },
      }),

      // 5. Recent campaigns — latest 5, with counts of email logs
      prisma.campaign.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          status: true,
          channel: true,
          createdAt: true,
          _count: {
            select: { campaignLeads: true },
          },
          emailLogs: {
            select: { status: true },
          },
        },
      }),

      // 6. Business profile for identity display
      prisma.businessProfile.findUnique({
        where: { userId },
        select: { businessName: true, industry: true },
      }),
    ]);

    // Email success rate: 0 when no data, never fabricated
    const totalEmailAttempts = emailsSentCount + emailsFailedCount;
    const emailSuccessRate =
      totalEmailAttempts > 0 ? Math.round((emailsSentCount / totalEmailAttempts) * 100) : 0;

    // Map recent campaigns to clean response shape
    const recentCampaigns: DashboardRecentCampaign[] = recentCampaignsRaw.map((camp) => {
      const sent = camp.emailLogs.filter((l) => l.status === 'SENT').length;
      const failed = camp.emailLogs.filter((l) => l.status === 'FAILED').length;
      return {
        id: camp.id,
        name: camp.name,
        status: camp.status,
        channel: camp.channel,
        leadsCount: camp._count.campaignLeads,
        emailsSent: sent,
        emailsFailed: failed,
        createdAt: camp.createdAt.toISOString(),
      };
    });

    // Dynamic current month label — never hardcoded
    const currentMonth = new Date().toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });

    return {
      totalLeads,
      activeCampaigns,
      emailsSent: emailsSentCount,
      emailSuccessRate,
      recentCampaigns,
      currentMonth,
      hasEmailData: totalEmailAttempts > 0,
      businessName: businessProfile?.businessName || null,
      industry: businessProfile?.industry || null,
    };
  }
}
