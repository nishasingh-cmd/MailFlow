import React from 'react';
import { Card, LineChart, BarChart, DonutChart } from '../ui';
import { AnalyticsChartData } from '@mailflow/shared';

interface AnalyticsChartsSectionProps {
  charts: AnalyticsChartData;
}

export const AnalyticsChartsSection: React.FC<AnalyticsChartsSectionProps> = ({ charts }) => {
  const lineChartSeries = [
    { key: 'emailsSent', name: 'Emails Sent', color: '#3B82F6' },
    { key: 'whatsappSent', name: 'WhatsApp Sent', color: '#10B981' },
    { key: 'failed', name: 'Delivery Failures', color: '#EF4444' },
  ];

  const campaignPerformanceBars = charts.campaignPerformanceChart.map((c) => ({
    name: c.name,
    value: c.sent,
  }));

  return (
    <div className="space-y-6">
      {/* Activity Timeline Chart (Full width) */}
      <Card
        header={
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-[var(--content-primary)]">
                Outreach Activity Over Time
              </h3>
              <p className="text-xs text-[var(--content-secondary)]">
                Daily Email and WhatsApp message volume timeline.
              </p>
            </div>
          </div>
        }
        padding="md"
      >
        <LineChart
          data={charts.activityTimeline}
          xKey="date"
          series={lineChartSeries}
          height={240}
        />
      </Card>

      {/* Grid of 4 Distribution Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Email Status Distribution */}
        <Card
          header={
            <h3 className="text-sm font-semibold text-[var(--content-primary)]">
              Email Status Distribution
            </h3>
          }
          padding="md"
        >
          <DonutChart data={charts.emailStatusDistribution} size={160} centerLabel="Emails" />
        </Card>

        {/* WhatsApp Status Distribution */}
        <Card
          header={
            <h3 className="text-sm font-semibold text-[var(--content-primary)]">
              WhatsApp Status Distribution
            </h3>
          }
          padding="md"
        >
          <DonutChart data={charts.whatsappStatusDistribution} size={160} centerLabel="Messages" />
        </Card>

        {/* Lead Source Distribution */}
        <Card
          header={
            <h3 className="text-sm font-semibold text-[var(--content-primary)]">
              Lead Source Origins
            </h3>
          }
          padding="md"
        >
          <DonutChart data={charts.leadSourceDistribution} size={160} centerLabel="Leads" />
        </Card>

        {/* Top Campaigns Comparison Bar Chart */}
        <Card
          header={
            <h3 className="text-sm font-semibold text-[var(--content-primary)]">
              Top Campaign Volumes
            </h3>
          }
          padding="md"
        >
          <BarChart data={campaignPerformanceBars} height={180} />
        </Card>
      </div>
    </div>
  );
};
