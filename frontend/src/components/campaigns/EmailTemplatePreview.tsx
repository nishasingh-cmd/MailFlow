import React, { useMemo } from 'react';

export interface EmailTemplatePreviewProps {
  subject?: string;
  senderName?: string;
  senderEmail?: string;
  recipientName?: string;
  recipientEmail?: string;
  bodyText: string;
  headerImageUrl?: string;
  sampleValues?: Record<string, string>;
  ctaText?: string;
  className?: string;
}

export const EmailTemplatePreview: React.FC<EmailTemplatePreviewProps> = ({
  subject = 'Partnership Opportunity',
  senderName = 'MailFlow Team',
  senderEmail = 'outreach@mailflow.ai',
  recipientName = '$Name',
  recipientEmail = 'prospect@company.com',
  bodyText = '',
  headerImageUrl,
  sampleValues = {},
  ctaText = 'Book Intro Call',
  className = '',
}) => {
  // Format body with sample values
  const formattedBody = useMemo(() => {
    if (!bodyText.trim()) {
      return (
        <span className="text-slate-400 dark:text-slate-500 italic">
          Your email message body will appear here...
        </span>
      );
    }

    const lines = bodyText.split('\n');

    return lines.map((line, lineIdx) => {
      const parts = line.split(/(\{\{\d+\}\}|\$[A-Za-z0-9_]+)/g);

      const parsedParts = parts.map((part, pIdx) => {
        const numMatch = part.match(/^\{\{(\d+)\}\}$/);
        const attrMatch = part.match(/^\$([A-Za-z0-9_]+)$/);

        if (numMatch) {
          const varNum = numMatch[1];
          const val = sampleValues[varNum]?.trim();
          return (
            <span
              key={`${lineIdx}-${pIdx}`}
              className={
                val
                  ? 'font-semibold text-slate-900 dark:text-white'
                  : 'inline-block bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 font-bold px-1 rounded mx-0.5 text-xs border border-brand-500/30'
              }
            >
              {val || `{{${varNum}}}`}
            </span>
          );
        }

        if (attrMatch) {
          const attr = attrMatch[1];
          const val = sampleValues[attr] || sampleValues[part];
          return (
            <span
              key={`${lineIdx}-${pIdx}`}
              className="font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 px-1 py-0.5 rounded text-xs"
            >
              {val || part}
            </span>
          );
        }

        return <React.Fragment key={`${lineIdx}-${pIdx}`}>{part}</React.Fragment>;
      });

      return (
        <React.Fragment key={lineIdx}>
          {parsedParts}
          {lineIdx < lines.length - 1 && <br />}
        </React.Fragment>
      );
    });
  }, [bodyText, sampleValues]);

  return (
    <div
      className={`flex flex-col rounded-2xl border border-[var(--surface-border)] overflow-hidden bg-[var(--surface-card)] shadow-md ${className}`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--surface-border)] bg-[var(--surface-card)]">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-wide">
          Template Preview
        </h3>
        {/* Email Icon */}
        <div className="w-6 h-6 rounded-full bg-brand-500/15 text-brand-600 dark:text-brand-400 flex items-center justify-center shadow-2xs border border-brand-500/25">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
      </div>

      {/* Email Client Canvas */}
      <div className="p-4 sm:p-5 bg-slate-100 dark:bg-slate-950/60 flex flex-col justify-start items-center min-h-[440px] select-none overflow-y-auto">
        <div className="w-full max-w-[370px] bg-white dark:bg-[#1a222d] rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 overflow-hidden text-left flex flex-col">
          {/* Email Envelope Meta Details */}
          <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 space-y-1 bg-slate-50/70 dark:bg-slate-900/40 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white truncate">
                {subject || 'Subject line'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Just now</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>
                From:{' '}
                <span className="font-medium text-slate-700 dark:text-slate-300">{senderName}</span>
              </span>
              <span className="text-[10px]">&lt;{senderEmail}&gt;</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              To:{' '}
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {recipientName}
              </span>{' '}
              &lt;{recipientEmail}&gt;
            </div>
          </div>

          {/* Optional Header Hero Image */}
          {headerImageUrl && (
            <div className="w-full h-36 overflow-hidden bg-slate-100 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-800">
              <img src={headerImageUrl} alt="Header" className="w-full h-full object-cover" />
            </div>
          )}

          {/* Email Body */}
          <div className="p-4 text-[13px] text-slate-800 dark:text-slate-200 leading-relaxed font-sans space-y-3 whitespace-pre-wrap break-words">
            {formattedBody}
          </div>

          {/* CTA Button */}
          {ctaText && (
            <div className="px-4 pb-4 pt-1">
              <div className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs text-center shadow-xs cursor-default">
                {ctaText}
              </div>
            </div>
          )}

          {/* Unsubscribe Footer */}
          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-[10px] text-slate-400 text-center">
            MailFlow Deliverability Engine • Reply STOP to unsubscribe
          </div>
        </div>
      </div>
    </div>
  );
};
