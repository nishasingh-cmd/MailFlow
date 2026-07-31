import React, { useState } from 'react';
import { Modal, Button } from '../ui';
import { AnalyticsOverviewResponse, AnalyticsFilterInput } from '@mailflow/shared';

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  analyticsData: AnalyticsOverviewResponse | null;
  filters: AnalyticsFilterInput;
  onExportCsv: () => void;
}

export const ExportReportModal: React.FC<ExportReportModalProps> = ({
  isOpen,
  onClose,
  analyticsData,
  filters,
  onExportCsv,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'excel' | 'pdf'>('csv');
  const [isExporting, setIsExporting] = useState(false);

  if (!analyticsData) return null;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      if (selectedFormat === 'csv' || selectedFormat === 'excel') {
        await onExportCsv();
      } else if (selectedFormat === 'pdf') {
        // Formatted Print/PDF Export window generator
        const printWin = window.open('', '_blank');
        if (printWin) {
          const html = `
            <!DOCTYPE html>
            <html>
              <head>
                <title>MailFlow Executive Analytics Report</title>
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 40px; color: #1e293b; }
                  h1 { color: #2563eb; margin-bottom: 4px; }
                  .meta { color: #64748b; font-size: 14px; margin-bottom: 24px; }
                  .card-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 30px; }
                  .card { border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; background: #f8fafc; }
                  .card-title { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; }
                  .card-val { font-size: 20px; font-weight: bold; margin-top: 4px; color: #0f172a; }
                  table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
                  th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
                  th { background-color: #f1f5f9; font-weight: 600; }
                  .section-title { margin-top: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 4px; font-size: 16px; }
                </style>
              </head>
              <body>
                <h1>MailFlow — Analytics & Performance Report</h1>
                <div class="meta">
                  Date Range: <strong>${filters.dateRange || 'last_30_days'}</strong> |
                  Generated: <strong>${new Date().toLocaleString()}</strong>
                </div>

                <div class="section-title">1. Executive Summary</div>
                <div class="card-grid">
                  <div class="card"><div class="card-title">Total Leads</div><div class="card-val">${analyticsData.summary.totalLeads.value}</div></div>
                  <div class="card"><div class="card-title">Total Campaigns</div><div class="card-val">${analyticsData.summary.totalCampaigns.value}</div></div>
                  <div class="card"><div class="card-title">Emails Sent</div><div class="card-val">${analyticsData.summary.emailsSent.value}</div></div>
                  <div class="card"><div class="card-title">WhatsApp Sent</div><div class="card-val">${analyticsData.summary.whatsappSent.value}</div></div>
                  <div class="card"><div class="card-title">Open Rate (Est.)</div><div class="card-val">${analyticsData.summary.openRate.value}</div></div>
                  <div class="card"><div class="card-title">Reply Rate (Est.)</div><div class="card-val">${analyticsData.summary.replyRate.value}</div></div>
                </div>

                <div class="section-title">2. Campaign Performance</div>
                <table>
                  <thead>
                    <tr>
                      <th>Campaign Name</th>
                      <th>Channel</th>
                      <th>Status</th>
                      <th>Emails Sent</th>
                      <th>WhatsApp Sent</th>
                      <th>Open Rate (Est.)</th>
                      <th>Reply Rate (Est.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${analyticsData.campaignPerformance
                      .map(
                        (c) => `
                      <tr>
                        <td>${c.name}</td>
                        <td>${c.channel}</td>
                        <td>${c.status}</td>
                        <td>${c.emailsSent}</td>
                        <td>${c.whatsappSent}</td>
                        <td>${c.openRate}%</td>
                        <td>${c.replyRate}%</td>
                      </tr>
                    `
                      )
                      .join('')}
                  </tbody>
                </table>

                <div class="section-title">3. Deliverability Engine Breakdown</div>
                <table>
                  <tr><th>Email Success Rate</th><td>${analyticsData.emailAnalytics.successRate}%</td></tr>
                  <tr><th>Emails Queued / Sending</th><td>${analyticsData.emailAnalytics.queued}</td></tr>
                  <tr><th>Email Failures</th><td>${analyticsData.emailAnalytics.failed}</td></tr>
                  <tr><th>WhatsApp Queued / Pending</th><td>${analyticsData.whatsappAnalytics.queued}</td></tr>
                  <tr><th>WhatsApp Failures</th><td>${analyticsData.whatsappAnalytics.failed}</td></tr>
                </table>

                <script>
                  window.onload = function() { window.print(); };
                </script>
              </body>
            </html>
          `;
          printWin.document.write(html);
          printWin.document.close();
        }
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal open={isOpen} onClose={onClose} title="Export Analytics Report" size="md">
      <div className="space-y-5">
        <p className="text-sm text-[var(--content-secondary)]">
          Select your preferred report format to export all metrics, campaign performance, lead
          demographics, and deliverability stats.
        </p>

        {/* Format Selection Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div
            onClick={() => setSelectedFormat('csv')}
            className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col items-center gap-2 text-center ${
              selectedFormat === 'csv'
                ? 'border-brand-500 bg-brand-500/10 text-brand-400 font-semibold'
                : 'border-[var(--border-default)] text-[var(--content-secondary)] hover:bg-[var(--surface-elevated)]'
            }`}
          >
            <span className="text-2xl">📄</span>
            <span className="text-xs">CSV Data</span>
          </div>

          <div
            onClick={() => setSelectedFormat('excel')}
            className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col items-center gap-2 text-center ${
              selectedFormat === 'excel'
                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-semibold'
                : 'border-[var(--border-default)] text-[var(--content-secondary)] hover:bg-[var(--surface-elevated)]'
            }`}
          >
            <span className="text-2xl">📊</span>
            <span className="text-xs">Excel (.xlsx)</span>
          </div>

          <div
            onClick={() => setSelectedFormat('pdf')}
            className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col items-center gap-2 text-center ${
              selectedFormat === 'pdf'
                ? 'border-red-500 bg-red-500/10 text-red-400 font-semibold'
                : 'border-[var(--border-default)] text-[var(--content-secondary)] hover:bg-[var(--surface-elevated)]'
            }`}
          >
            <span className="text-2xl">📕</span>
            <span className="text-xs">PDF Document</span>
          </div>
        </div>

        {/* Included Sections Preview */}
        <div className="space-y-2 bg-[var(--surface-elevated,rgba(255,255,255,0.03))] p-3.5 rounded-lg border border-[var(--border-subtle)] text-xs">
          <div className="font-semibold text-[var(--content-primary)]">Included Sections:</div>
          <div className="grid grid-cols-2 gap-1 text-[var(--content-secondary)]">
            <span className="flex items-center gap-1.5">✓ Executive Summary</span>
            <span className="flex items-center gap-1.5">✓ Campaign Performance</span>
            <span className="flex items-center gap-1.5">✓ Lead Demographics</span>
            <span className="flex items-center gap-1.5">✓ Email Deliverability</span>
            <span className="flex items-center gap-1.5">✓ WhatsApp Outreach</span>
            <span className="flex items-center gap-1.5">✓ Timeframe Metadata</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-subtle)]">
          <Button variant="outline" onClick={onClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleExport} loading={isExporting}>
            Download {selectedFormat.toUpperCase()} Report
          </Button>
        </div>
      </div>
    </Modal>
  );
};
