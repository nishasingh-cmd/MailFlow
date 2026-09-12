export interface WhatsappChatPreviewProps {
  header?: string;
  body: string;
  footer?: string;
  buttonText?: string;
  businessName?: string;
  timestamp?: string;
  className?: string;
}

export function WhatsappChatPreview({
  header,
  body,
  footer,
  buttonText,
  timestamp = '10:42 AM',
  className = '',
}: WhatsappChatPreviewProps) {
  return (
    <div
      className={`rounded-2xl border border-[var(--surface-border)] overflow-hidden shadow-xs bg-[#efeae2] p-4 sm:p-5 font-sans flex flex-col items-center justify-center gap-3 ${className}`}
      style={{
        backgroundImage: `radial-gradient(#e0d7c7 0.75px, transparent 0.75px)`,
        backgroundSize: '16px 16px',
      }}
    >
      {/* WhatsApp Message Chatbox Bubble */}
      <div className="max-w-md w-full bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] border border-slate-200/50 space-y-1.5 text-left">
        {header && <p className="font-bold text-xs text-[#111b21] leading-snug">{header}</p>}

        <div className="text-[13.5px] text-[#111b21] leading-[20px] whitespace-pre-wrap break-words font-sans">
          {body ? (
            body.split(/(\{\{\d+\}\})/g).map((part, idx) =>
              /\{\{\d+\}\}/.test(part) ? (
                <span
                  key={idx}
                  className="bg-slate-100 text-slate-900 border border-slate-300 font-sans font-bold px-1.5 py-0.5 rounded mx-0.5 text-sm"
                >
                  {part}
                </span>
              ) : (
                part
              )
            )
          ) : (
            <span className="text-slate-400 italic">Your template message will appear here...</span>
          )}
        </div>

        {footer && <p className="text-[11px] text-[#667781] mt-1 italic">{footer}</p>}

        {/* Timestamp and Double Blue Ticks */}
        <div className="flex items-center justify-end gap-1 text-[10.5px] text-[#667781] pt-0.5 select-none">
          <span>{timestamp}</span>
          <svg className="w-4 h-3.5 text-[#53bdeb]" viewBox="0 0 16 11" fill="currentColor">
            <path d="M11.07 0.93a.75.75 0 00-1.06 0L5.75 5.19 4.47 3.91a.75.75 0 00-1.06 1.06l1.81 1.81a.75.75 0 001.06 0l4.79-4.79a.75.75 0 000-1.06zM15.07 0.93a.75.75 0 00-1.06 0L9.75 5.19l.72.72 4.6-4.6a.75.75 0 000-1.06zM7.47 7.78l-.72-.72-1.28 1.28-1.81-1.81a.75.75 0 10-1.06 1.06l2.34 2.34a.75.75 0 001.06 0l1.47-1.47z" />
          </svg>
        </div>

        {/* WhatsApp Quick Reply / CTA Button */}
        {buttonText && (
          <div className="border-t border-[#e9edef] -mx-3.5 -mb-3.5 mt-2 py-2.5 px-3 text-center text-xs font-semibold text-[#00a884] flex items-center justify-center gap-1.5 hover:bg-black/5 transition-colors cursor-pointer rounded-b-2xl">
            <svg
              className="w-3.5 h-3.5 text-[#00a884]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            <span>{buttonText}</span>
          </div>
        )}
      </div>

      {/* WhatsApp Chat Input Bar (Bright Mode) */}
      <div className="max-w-md w-full flex items-center select-none pt-0.5">
        <div className="w-full flex items-center gap-3 bg-white rounded-2xl px-3.5 py-2.5 shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] border border-slate-200/50">
          {/* Attachment Paperclip */}
          <button
            type="button"
            className="text-[#54656f] hover:text-[#111b21] transition-colors focus:outline-none cursor-pointer"
            title="Attach file"
          >
            <svg
              className="w-5 h-5 -rotate-45"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
              />
            </svg>
          </button>

          {/* Emoji Smiley */}
          <button
            type="button"
            className="text-[#54656f] hover:text-[#111b21] transition-colors focus:outline-none cursor-pointer"
            title="Emoji"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <circle cx="12" cy="12" r="9" />
              <path strokeLinecap="round" d="M9 10h.01M15 10h.01" />
              <path strokeLinecap="round" d="M9.5 15a3.5 3.5 0 005 0" />
            </svg>
          </button>

          {/* Type a message placeholder */}
          <span className="text-[14px] text-[#8696a0] font-sans flex-1 select-none">
            Type a message
          </span>

          {/* Microphone */}
          <button
            type="button"
            className="text-[#54656f] hover:text-[#111b21] transition-colors focus:outline-none cursor-pointer"
            title="Voice message"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
