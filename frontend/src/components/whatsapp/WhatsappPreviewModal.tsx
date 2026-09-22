import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Lead } from '@mailflow/shared';
import { Modal, Button, Badge } from '../ui';
import { whatsappService, WhatsappMetaTemplate } from '../../services/whatsapp.service';
import { businessProfileService, BusinessProfile } from '../../services/business-profile.service';
import {
  detectTemplateVariables,
  resolveCampaignTemplateVariables,
  SenderBusinessContext,
} from '../../utils/whatsapp-variable-resolver';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';

interface WhatsappPreviewModalProps {
  open: boolean;
  leadId: string | null;
  lead?: Lead | null;
  datasetColumns?: string[];
  datasetName?: string;
  leadName?: string;
  companyName?: string;
  phone?: string;
  campaignId?: string;
  lastInboundMessageAt?: string | null;
  onClose: () => void;
  onSent?: () => void;
}

// In-memory template cache so subsequent modal opens are instant with zero network fetch delay
let cachedTemplates: WhatsappMetaTemplate[] = [];

function renderAnalyzedMessage(templateText: string, variables: Record<string, string>) {
  const parts = templateText.split(/(\{\{\s*\d+\s*\}\})/g);
  return parts.map((part, index) => {
    const match = part.match(/\{\{\s*(\d+)\s*\}\}/);
    if (match) {
      const varNum = match[1];
      const val = variables[varNum] || `{{${varNum}}}`;
      return (
        <span
          key={index}
          className="inline-flex items-center px-1.5 py-0.5 rounded font-semibold text-xs font-sans bg-[#800000]/10 dark:bg-[#800000]/25 text-[#800000] dark:text-[#ffb3ba] border border-[#800000]/30 dark:border-[#800000]/50 mx-0.5 align-baseline"
          title={`Variable {{${varNum}}}`}
        >
          {val}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

export function WhatsappPreviewModal({
  open,
  leadId,
  lead,
  datasetColumns,
  datasetName,
  leadName,
  companyName,
  phone,
  campaignId,
  onClose,
  onSent,
}: WhatsappPreviewModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  // Template state
  const [templates, setTemplates] = useState<WhatsappMetaTemplate[]>(cachedTemplates);
  const [selectedTemplateName, setSelectedTemplateName] = useState<string>(() => {
    const approved = cachedTemplates.find((t) => t.status === 'APPROVED');
    return approved ? approved.name : cachedTemplates[0]?.name || '';
  });
  const [templateLang, setTemplateLang] = useState('en_US');
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [sending, setSending] = useState(false);

  // Business profile state
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);

  // Variable mapping state: { "1": "Name", "2": "My Name (Sender)", ... }
  const [variableMapping, setVariableMapping] = useState<Record<string, string>>({});
  const [mappingError, setMappingError] = useState<string>('');

  const sessionRef = useRef<string>('');

  // Fetch client initial business profile
  useEffect(() => {
    if (!open) return;
    businessProfileService
      .getProfile()
      .then((profile) => {
        if (profile) setBusinessProfile(profile);
      })
      .catch((err) => {
        console.warn('[WhatsappPreviewModal] Error fetching business profile:', err);
      });
  }, [open]);

  // Authoritative sender context
  const senderContext = useMemo<SenderBusinessContext>(
    () => ({
      user: user ? { name: user.name, email: user.email } : null,
      businessProfile,
    }),
    [user, businessProfile]
  );

  // Business Profile options
  const businessOptions = useMemo(() => {
    return [
      {
        value: 'My Business Name',
        label: `My Business Name (${businessProfile?.businessName || 'Sociokraft Global Outreach'})`,
      },
      {
        value: 'My Name (Sender)',
        label: `My Name / Sender (${user?.name || 'Nisha Singh'})`,
      },
      {
        value: 'My Website',
        label: `My Website (${businessProfile?.website || 'https://www.sociokraft.in'})`,
      },
      {
        value: 'My Products / Services',
        label: `My Products / Services (${businessProfile?.productsOrServices ? businessProfile.productsOrServices.substring(0, 32) + '...' : 'Outreach Services'})`,
      },
      {
        value: 'My Industry',
        label: `My Industry (${businessProfile?.industry || 'Marketing & Advertising'})`,
      },
      {
        value: 'My Value Proposition',
        label: `My Value Proposition (${businessProfile?.valueProposition ? businessProfile.valueProposition.substring(0, 32) + '...' : 'Client Acquisition'})`,
      },
    ];
  }, [businessProfile, user]);

  // Construct active lead object
  const activeLead = useMemo(() => {
    if (lead) return lead;
    return {
      id: leadId || 'lead',
      name: leadName || '',
      company: companyName || '',
      phone: phone || '',
      email: '',
      website: null,
      linkedin: null,
      industry: null,
      customFields: {},
    };
  }, [lead, leadId, leadName, companyName, phone]);

  // Compute available spreadsheet columns for this lead
  const availableColumns = useMemo(() => {
    const set = new Set<string>();
    if (datasetColumns && datasetColumns.length > 0) {
      datasetColumns.forEach((c) => set.add(c));
    }
    if (activeLead?.customFields && typeof activeLead.customFields === 'object') {
      const cf = activeLead.customFields as Record<string, unknown>;
      if (Array.isArray(cf._uploadedColumns)) {
        cf._uploadedColumns.forEach((c) => {
          if (typeof c === 'string') set.add(c);
        });
      }
      Object.keys(cf).forEach((k) => {
        if (!k.startsWith('_')) set.add(k);
      });
    }
    ['Name', 'Phone', 'Email', 'Company', 'Industry', 'Website', 'LinkedIn'].forEach((c) =>
      set.add(c)
    );
    return Array.from(set);
  }, [datasetColumns, activeLead]);

  // Currently selected template
  const currentTemplate = useMemo(() => {
    return templates.find((t) => t.name === selectedTemplateName) || templates[0];
  }, [templates, selectedTemplateName]);

  const templateBody =
    currentTemplate?.bodyText ||
    'Hi {{1}}, I came across {{2}} and wanted to reach out regarding our services.';

  const detectedVariables = useMemo(() => {
    return detectTemplateVariables(templateBody);
  }, [templateBody]);

  // Smart auto-mapping suggestions
  useEffect(() => {
    if (detectedVariables.length === 0) return;
    setVariableMapping((prev) => {
      const next = { ...prev };
      let changed = false;

      detectedVariables.forEach((v) => {
        if (next[v.index]) return;

        const lowerSnippet = v.contextSnippet.toLowerCase();

        if (
          lowerSnippet.includes(`this is {{${v.index}}}`) ||
          lowerSnippet.includes(`i am {{${v.index}}}`) ||
          lowerSnippet.includes(`my name is {{${v.index}}}`)
        ) {
          next[v.index] = 'My Name (Sender)';
          changed = true;
          return;
        }

        if (
          lowerSnippet.includes(`from {{${v.index}}}`) ||
          lowerSnippet.includes(`at {{${v.index}}}`) ||
          lowerSnippet.includes(`represent {{${v.index}}}`)
        ) {
          next[v.index] = 'My Business Name';
          changed = true;
          return;
        }

        if (
          lowerSnippet.includes(`hi {{${v.index}}}`) ||
          lowerSnippet.includes(`hello {{${v.index}}}`) ||
          lowerSnippet.includes(`dear {{${v.index}}}`) ||
          v.index === '1'
        ) {
          const nameCol = availableColumns.find((c) =>
            ['name', 'lead name', 'full name', 'first name', 'contact name'].includes(
              c.toLowerCase()
            )
          );
          if (nameCol) {
            next[v.index] = nameCol;
            changed = true;
            return;
          }
        }

        if (availableColumns.length > 0) {
          next[v.index] = availableColumns[0];
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [detectedVariables, availableColumns]);

  // Authoritative variable resolution for preview & Meta payload
  const resolved = useMemo(() => {
    return resolveCampaignTemplateVariables(variableMapping, activeLead, senderContext);
  }, [variableMapping, activeLead, senderContext]);

  // Load templates from Meta API
  const loadTemplates = useCallback(async () => {
    if (cachedTemplates.length === 0) {
      setLoadingTemplates(true);
    }
    try {
      const res = await whatsappService.getTemplates();
      if (res?.templates && res.templates.length > 0) {
        cachedTemplates = res.templates;
        setTemplates(res.templates);
        if (!selectedTemplateName) {
          const approved = res.templates.find((t) => t.status === 'APPROVED');
          const chosen = approved || res.templates[0];
          setSelectedTemplateName(chosen.name);
          if (chosen.language) setTemplateLang(chosen.language);
        }
      }
    } catch (err: unknown) {
      const errMsg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        (err as Error)?.message ||
        'Failed to load WhatsApp templates from Meta. Please check Settings -> WhatsApp.';
      toast.error(errMsg);
    } finally {
      setLoadingTemplates(false);
    }
  }, [selectedTemplateName, toast]);

  // Bootstrap when modal opens
  useEffect(() => {
    const sessionKey = `${open}::${leadId}`;
    if (open && leadId && sessionRef.current !== sessionKey) {
      sessionRef.current = sessionKey;
      loadTemplates();
    }
    if (!open) {
      sessionRef.current = '';
    }
  }, [open, leadId, loadTemplates]);

  // When user manually changes the template dropdown
  const handleTemplateChange = (val: string) => {
    setSelectedTemplateName(val);
    setVariableMapping({});
    setMappingError('');
    const chosen = templates.find((t) => t.name === val);
    if (chosen?.language) setTemplateLang(chosen.language);
  };

  // Send approved template via Meta Cloud API
  const handleSend = async () => {
    if (!leadId || sending || !selectedTemplateName) return;

    if (resolved.missingVariables.length > 0) {
      setMappingError(
        `Please select a mapping for: ${resolved.missingVariables.map((m) => `{{${m.variableIndex}}}`).join(', ')}`
      );
      return;
    }

    setSending(true);
    try {
      let renderedMessage = templateBody;
      Object.entries(resolved.variables).forEach(([num, val]) => {
        renderedMessage = renderedMessage.replace(
          new RegExp(`\\{\\{\\s*${num}\\s*\\}\\}`, 'g'),
          val
        );
      });

      const res = await whatsappService.sendMessages({
        leadIds: [leadId],
        campaignId,
        templateName: selectedTemplateName,
        templateParams: resolved.params,
        message: renderedMessage,
      });

      if (res && res.count > 0) {
        toast.success(
          res.message || `Approved Meta template '${selectedTemplateName}' queued for delivery!`
        );
        onSent?.();
        onClose();
      } else {
        toast.error('Failed to queue WhatsApp template. Please verify recipient phone number.');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      toast.error(err.response?.data?.error || err.message || 'Failed to send WhatsApp template.');
    } finally {
      setSending(false);
    }
  };

  const currentRecipientName = activeLead?.name || leadName || 'Recipient';
  const currentRecipientCompany = activeLead?.company || companyName || '';
  const currentRecipientPhone = activeLead?.phone || phone || 'No phone set';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="WhatsApp Outreach: Approved Meta Template"
      size="xl"
    >
      <div className="space-y-4 font-sans">
        {/* Recipient lead context */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-xs text-black dark:text-white">
          <div>
            <span className="text-black dark:text-white">Recipient: </span>
            <span className="font-semibold text-black dark:text-white">
              {currentRecipientName}
            </span>{' '}
            (<span className="font-mono text-black dark:text-white">{currentRecipientPhone}</span>)
          </div>
          {currentRecipientCompany && (
            <div className="flex items-center gap-2">
              <span className="text-black dark:text-white">Company: </span>
              <Badge variant="neutral" size="sm" className="text-black dark:text-white">
                {currentRecipientCompany}
              </Badge>
            </div>
          )}
        </div>

        {/* Template Selector */}
        <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-[var(--surface-card)]">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Approved WhatsApp Template
            </label>
            <span className="text-xs text-slate-500 font-normal">
              Lang:{' '}
              <strong className="font-semibold text-black dark:text-white">{templateLang}</strong>
            </span>
          </div>

          {loadingTemplates ? (
            <div className="flex items-center gap-2 text-xs text-slate-500 py-1">
              <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              Loading approved Meta templates...
            </div>
          ) : templates.length > 0 ? (
            <select
              value={selectedTemplateName}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full text-xs sm:text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {templates.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="p-3 border border-red-300 dark:border-red-900 rounded-lg text-xs text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-950/20">
              No WhatsApp templates found in your Meta account. Verify your connection in Settings.
            </div>
          )}
        </div>

        {/* Dynamic WhatsApp Variable Mapping Card */}
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-[var(--surface-card)] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 dark:border-slate-800/80 pb-2">
            <div>
              <h4 className="text-sm font-semibold text-black dark:text-white">
                Template Variable Mapping
              </h4>
              <p className="text-xs text-black dark:text-white mt-0.5">
                Map each template placeholder to a column from{' '}
                <strong className="font-semibold text-black dark:text-white">
                  {datasetName || 'Manual & Direct Leads'}
                </strong>{' '}
                or business profile.
              </p>
            </div>
          </div>

          {detectedVariables.length === 0 ? (
            <div className="py-2.5 px-3 text-center text-xs text-black dark:text-white bg-slate-50 dark:bg-slate-900/50 rounded-xl font-normal">
              This template contains no variable placeholders (static message).
            </div>
          ) : (
            <div className="space-y-2.5">
              {detectedVariables.map((v) => {
                const mappedCol = variableMapping[v.index] || '';

                return (
                  <div
                    key={v.index}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="px-2 py-0.5 rounded text-xs font-normal text-black dark:text-white bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shrink-0">
                          {`{{${v.index}}}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                        <select
                          id={`lead-wa-variable-mapping-${v.index}`}
                          value={mappedCol}
                          onChange={(e) => {
                            const newCol = e.target.value;
                            setVariableMapping((prev) => ({
                              ...prev,
                              [v.index]: newCol,
                            }));
                            if (mappingError) setMappingError('');
                          }}
                          className="w-full sm:w-72 text-xs font-normal rounded-lg border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white dark:bg-slate-900 text-black dark:text-white"
                        >
                          <option value="">-- Select Source Column / Field --</option>
                          <optgroup
                            label={`Spreadsheet Columns (${datasetName || 'Manual & Direct Leads'})`}
                          >
                            {availableColumns.map((col) => (
                              <option key={col} value={col}>
                                {col}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Business & Sender Profile (Onboarding)">
                            {businessOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {mappingError && (
            <div className="p-2.5 rounded-lg border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-xs font-medium flex items-center gap-2">
              <svg
                className="w-4 h-4 text-red-600 shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{mappingError}</span>
            </div>
          )}
        </div>

        {/* WhatsApp Message Preview Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs px-1">
            <span className="font-bold text-[var(--content-primary)] uppercase tracking-wider text-[11px]">
              WhatsApp Message Preview
            </span>
            <span className="text-xs text-slate-500">
              Previewing for:{' '}
              <strong className="text-black dark:text-white font-semibold">
                {currentRecipientName}
              </strong>{' '}
              {currentRecipientCompany ? `(${currentRecipientCompany})` : ''}
            </span>
          </div>

          {/* Authentic WhatsApp Chat Preview with highlighted analyzed tokens */}
          <div
            className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-[#efeae2] dark:bg-[#0b141a] p-4 sm:p-5 flex flex-col items-center justify-center relative shadow-inner"
            style={{
              backgroundImage: `radial-gradient(rgba(0,0,0,0.06) 1px, transparent 1px)`,
              backgroundSize: '16px 16px',
            }}
          >
            <div className="max-w-md w-full bg-white dark:bg-[#202c33] rounded-2xl rounded-tl-xs p-3.5 shadow-sm border border-slate-200/60 dark:border-white/5 space-y-1.5 text-left">
              {/* Header text */}
              {currentTemplate?.headerText && (
                <p className="font-bold text-xs text-[#111b21] dark:text-white leading-snug">
                  {currentTemplate.headerText}
                </p>
              )}

              {/* Formatted body message with maroon pill variables */}
              <div className="text-[13.5px] text-[#111b21] dark:text-[#d1d7db] leading-[21px] whitespace-pre-wrap break-words font-sans">
                {renderAnalyzedMessage(templateBody, resolved.variables)}
              </div>

              {/* Footer text */}
              {currentTemplate?.footerText && (
                <p className="text-[11px] text-[#667781] dark:text-[#8696a0] italic pt-0.5">
                  {currentTemplate.footerText}
                </p>
              )}

              {/* Timestamp & Double Checkmarks */}
              <div className="flex items-center justify-end gap-1 text-[11px] text-[#667781] dark:text-[#8696a0] pt-0.5 select-none">
                <span>10:42 AM</span>
                <svg className="w-4 h-3.5 text-[#53bdeb]" viewBox="0 0 16 11" fill="currentColor">
                  <path d="M11.07 0.93a.75.75 0 00-1.06 0L5.75 5.19 4.47 3.91a.75.75 0 00-1.06 1.06l1.81 1.81a.75.75 0 001.06 0l4.79-4.79a.75.75 0 000-1.06zM15.07 0.93a.75.75 0 00-1.06 0L9.75 5.19l.72.72 4.6-4.6a.75.75 0 000-1.06zM7.47 7.78l-.72-.72-1.28 1.28-1.81-1.81a.75.75 0 10-1.06 1.06l2.34 2.34a.75.75 0 001.06 0l1.47-1.47z" />
                </svg>
              </div>

              {/* Action buttons if any */}
              {Array.isArray(currentTemplate?.buttons) && currentTemplate.buttons.length > 0 && (
                <div className="border-t border-slate-100 dark:border-white/10 -mx-3.5 -mb-3.5 mt-2 divide-y divide-slate-100 dark:divide-white/10">
                  {currentTemplate.buttons.map((btn, bIdx) => (
                    <div
                      key={bIdx}
                      className="py-2.5 px-3 text-center text-xs font-semibold text-[#00a884] dark:text-[#00a884] flex items-center justify-center gap-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer select-none"
                    >
                      {btn.type === 'URL' && (
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      )}
                      {btn.type === 'PHONE_NUMBER' && (
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                          />
                        </svg>
                      )}
                      <span>{btn.text || 'Action'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <p className="text-2xs text-[var(--content-tertiary)] px-1">
            Fixed Meta Template: Text structure cannot be rewritten; only variables are
            personalized.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--surface-border)]">
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSend}
            loading={sending}
            disabled={sending || !selectedTemplateName || !phone}
            leftIcon={
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
              </svg>
            }
          >
            {sending ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
