import React, { useMemo } from 'react';

export interface TemplateButton {
  id: string;
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
  text: string;
  url?: string;
  urlType?: 'Static' | 'Dynamic';
  phoneNumber?: string;
}

export interface WhatsappTemplatePreviewProps {
  headerType?: 'NONE' | 'TEXT' | 'MEDIA';
  headerText?: string;
  bodyText: string;
  headerImageUrl?: string;
  footerText?: string;
  sampleValues?: Record<string, string>;
  buttons?: TemplateButton[];
  className?: string;
}

export const WhatsappTemplatePreview: React.FC<WhatsappTemplatePreviewProps> = ({
  headerType = 'NONE',
  headerText = '',
  bodyText = '',
  headerImageUrl,
  footerText = '',
  sampleValues = {},
  buttons = [],
  className = '',
}) => {
  // Format current time like WhatsApp (e.g. 10:27)
  const currentTime = useMemo(() => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }, []);

  // Parse body text with sample values and WhatsApp formatting (*bold*, _italic_, ~strike~, ```mono```)
  const formattedBody = useMemo(() => {
    if (!bodyText.trim()) {
      return (
        <span className="text-slate-400 dark:text-slate-500 italic">
          Your message body will appear here...
        </span>
      );
    }

    // Split text by lines to preserve line breaks
    const lines = bodyText.split('\n');

    return lines.map((line, lineIdx) => {
      // Replace variables {{1}}, {{2}} with sample values or highlighted tag
      const parts = line.split(/(\{\{\d+\}\})/g);

      const parsedParts = parts.map((part, pIdx) => {
        const match = part.match(/^\{\{(\d+)\}\}$/);
        if (match) {
          const varNum = match[1];
          const sample = sampleValues[varNum]?.trim();
          if (sample) {
            return (
              <span
                key={`${lineIdx}-${pIdx}`}
                className="font-medium text-slate-900 dark:text-slate-100"
              >
                {sample}
              </span>
            );
          }
          return (
            <span
              key={`${lineIdx}-${pIdx}`}
              className="inline-block bg-[#25D366]/15 text-[#128C7E] dark:text-[#25D366] font-semibold px-1 rounded mx-0.5 text-xs border border-[#25D366]/30"
              title={`Variable {{${varNum}}}`}
            >
              {`{{${varNum}}}`}
            </span>
          );
        }

        // Apply markdown formatting: *bold*, _italic_, ~strikethrough~, ```monospace```
        return parseTextStyles(part, `${lineIdx}-${pIdx}`);
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
      {/* Header bar matching screenshot */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--surface-border)] bg-[var(--surface-card)]">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-wide">
          Template Preview
        </h3>
        {/* Official WhatsApp Icon */}
        <svg
          className="w-6 h-6 shrink-0 shadow-2xs rounded-full"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 2C6.48 2 2 6.48 2 12c0 1.93.55 3.73 1.5 5.27L2 22l4.89-1.46A9.94 9.94 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2z"
            fill="#25D366"
          />
          <path
            d="M17.48 15.02c-.28-.14-1.65-.81-1.9-.9-.26-.1-.44-.14-.63.14-.19.28-.73.9-.89 1.09-.17.19-.33.21-.61.07-.28-.14-1.18-.44-2.26-1.4-.83-.75-1.4-1.67-1.56-1.95-.17-.28-.02-.43.12-.57.13-.13.28-.33.42-.49.14-.17.19-.28.28-.47.1-.19.05-.35-.02-.49-.07-.14-.63-1.52-.86-2.09-.23-.55-.46-.47-.63-.48h-.54c-.19 0-.49.07-.74.35-.26.28-.98.96-.98 2.34s1 2.72 1.14 2.91c.14.19 1.98 3.02 4.79 4.23.67.29 1.19.46 1.6.59.67.21 1.28.18 1.76.11.54-.08 1.65-.67 1.88-1.32.23-.65.23-1.21.16-1.32-.07-.12-.25-.19-.53-.33z"
            fill="#ffffff"
          />
        </svg>
      </div>

      {/* WhatsApp Wallpaper Canvas */}
      <div
        className="relative flex-1 p-4 sm:p-6 flex flex-col justify-start items-center min-h-[440px] select-none overflow-y-auto"
        style={{
          backgroundColor: '#efeae2',
          backgroundImage: `radial-gradient(#dcd5c7 0.8px, transparent 0.8px)`,
          backgroundSize: '16px 16px',
        }}
      >
        {/* Subtle doodle overlay decoration */}
        <div className="absolute inset-0 opacity-[0.035] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:12px_12px]" />

        {/* Message Container */}
        <div className="w-full max-w-[340px] sm:max-w-[360px] space-y-1.5 z-10">
          {/* WhatsApp Chat Bubble */}
          <div className="relative bg-white dark:bg-[#1f2c34] rounded-2xl rounded-tl-xs p-3.5 shadow-[0_1.5px_3px_rgba(11,20,26,0.12)] border border-slate-200/60 dark:border-slate-800 overflow-hidden">
            {/* Header Image (if MEDIA) */}
            {headerImageUrl && (
              <div className="w-[calc(100%+28px)] h-40 -mx-3.5 -mt-3.5 mb-2.5 overflow-hidden bg-slate-100 dark:bg-slate-800">
                <img src={headerImageUrl} alt="Header" className="w-full h-full object-cover" />
              </div>
            )}

            {/* Header (if TEXT) */}
            {headerType === 'TEXT' && headerText?.trim() && (
              <p className="font-bold text-sm text-[#111b21] dark:text-slate-100 pb-1.5 leading-snug border-b border-slate-100 dark:border-slate-700/60 mb-2">
                {headerText}
              </p>
            )}

            {/* Body */}
            <div className="text-[13.5px] text-[#111b21] dark:text-slate-200 leading-[21px] font-sans break-words whitespace-pre-wrap">
              {formattedBody}
            </div>

            {/* Footer */}
            {footerText?.trim() && (
              <p className="text-[11px] text-[#667781] dark:text-[#8696a0] mt-2 font-normal">
                {footerText}
              </p>
            )}

            {/* Timestamp & Double Blue Ticks */}
            <div className="flex items-center justify-end gap-1 text-[10.5px] text-[#667781] dark:text-[#8696a0] pt-1">
              <span>{currentTime}</span>
              <svg className="w-4 h-3.5 text-[#53bdeb]" viewBox="0 0 16 11" fill="currentColor">
                <path d="M11.07 0.93a.75.75 0 00-1.06 0L5.75 5.19 4.47 3.91a.75.75 0 00-1.06 1.06l1.81 1.81a.75.75 0 001.06 0l4.79-4.79a.75.75 0 000-1.06zM15.07 0.93a.75.75 0 00-1.06 0L9.75 5.19l.72.72 4.6-4.6a.75.75 0 000-1.06zM7.47 7.78l-.72-.72-1.28 1.28-1.81-1.81a.75.75 0 10-1.06 1.06l2.34 2.34a.75.75 0 001.06 0l1.47-1.47z" />
              </svg>
            </div>
          </div>

          {/* WhatsApp Interactive Action Buttons (Stacked under bubble) */}
          {buttons.length > 0 && (
            <div className="space-y-1.5 pt-0.5">
              {buttons.map((btn) => (
                <div
                  key={btn.id}
                  className="w-full bg-white dark:bg-[#1f2c34] rounded-xl py-2.5 px-3 text-center text-[13px] font-semibold text-[#00a884] dark:text-[#25D366] shadow-[0_1px_2px_rgba(11,20,26,0.08)] border border-slate-200/60 dark:border-slate-800 flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-[#2a3942] transition-colors cursor-default"
                >
                  {btn.type === 'QUICK_REPLY' && (
                    <svg
                      className="w-3.5 h-3.5 text-[#00a884] dark:text-[#25D366] -scale-x-100"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 10h10a5 5 0 015 5v3M3 10l6-6M3 10l6 6"
                      />
                    </svg>
                  )}
                  {btn.type === 'URL' && (
                    <svg
                      className="w-3.5 h-3.5 text-[#00a884] dark:text-[#25D366]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  )}
                  {btn.type === 'PHONE_NUMBER' && (
                    <svg
                      className="w-3.5 h-3.5 text-[#00a884] dark:text-[#25D366]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                  )}
                  <span className="truncate">{btn.text || 'Button Text'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper function to parse WhatsApp styles (*bold*, _italic_, ~strikethrough~, ```monospace```)
function parseTextStyles(text: string, keyPrefix: string): React.ReactNode {
  // Regex to match *bold*, _italic_, ~strike~, ```code```
  const styleRegex = /(```[\s\S]*?```|\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~)/g;
  const parts = text.split(styleRegex);

  return parts.map((chunk, idx) => {
    const key = `${keyPrefix}-${idx}`;

    // Monospace ```text```
    if (chunk.startsWith('```') && chunk.endsWith('```') && chunk.length >= 6) {
      return (
        <code
          key={key}
          className="font-mono text-xs bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded text-amber-700 dark:text-amber-300"
        >
          {chunk.slice(3, -3)}
        </code>
      );
    }

    // Bold *text*
    if (chunk.startsWith('*') && chunk.endsWith('*') && chunk.length >= 2) {
      return (
        <strong key={key} className="font-bold text-slate-900 dark:text-white">
          {chunk.slice(1, -1)}
        </strong>
      );
    }

    // Italic _text_
    if (chunk.startsWith('_') && chunk.endsWith('_') && chunk.length >= 2) {
      return (
        <em key={key} className="italic text-slate-800 dark:text-slate-200">
          {chunk.slice(1, -1)}
        </em>
      );
    }

    // Strikethrough ~text~
    if (chunk.startsWith('~') && chunk.endsWith('~') && chunk.length >= 2) {
      return (
        <del key={key} className="line-through text-slate-500">
          {chunk.slice(1, -1)}
        </del>
      );
    }

    return chunk;
  });
}
