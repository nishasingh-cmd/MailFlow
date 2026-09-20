import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ROUTES } from '../../routes/routes';
import { campaignService } from '../../services/campaign.service';
import { whatsappService, WhatsappMetaTemplate } from '../../services/whatsapp.service';
import { useToast } from '../../hooks/useToast';
import { Button, Modal } from '../../components/ui';
import { LeadPickerTable } from '../../components/campaigns/LeadPickerTable';
import {
  WhatsappTemplatePreview,
  TemplateButton,
} from '../../components/whatsapp/WhatsappTemplatePreview';
import { EmailTemplatePreview } from '../../components/campaigns/EmailTemplatePreview';
import { cn } from '../../utils/cn';

const LEAD_ATTRIBUTES = [
  { value: '', label: 'Select attribute' },
  { value: '$Name', label: '$Name (Lead Full Name)' },
  { value: '$Company', label: '$Company (Lead Company/Clinic)' },
  { value: '$Email', label: '$Email (Lead Email Address)' },
  { value: '$Whatsapp', label: '$Whatsapp (Lead Phone Number)' },
  { value: '$TargetExam', label: '$TargetExam (Goal/Exam Target)' },
  { value: '$Industry', label: '$Industry (Industry Sector)' },
  { value: '$Status', label: '$Status (Lead Status)' },
  { value: '$JobTitle', label: '$JobTitle (Lead Title/Position)' },
];

const PRESET_EMAIL_TEMPLATES = [
  {
    name: 'edtech_sales_email',
    subject: 'Preparing for {{2}} this year? Structured revision planning for {{1}}',
    body: 'Hi {{1}},\n\nPreparing for {{2}} this year?\n\nWe have helped students improve their mock test scores using structured revision planning and performance tracking.\n\nIf you would like to see how this works for you, choose an option below.',
    cta: 'View Program Details',
  },
  {
    name: 'b2b_cold_outreach',
    subject: 'Quick question regarding {{2}} outreach workflow',
    body: 'Hi {{1}},\n\nNoticed {{2}} is expanding acquisition channels this quarter. We helped similar teams boost response rates by 3x.\n\nWould you be open to an 8-minute introductory call this Thursday?',
    cta: 'Schedule Intro Call',
  },
  {
    name: 'product_demo_invitation',
    subject: 'Automating lead conversions for {{2}}',
    body: 'Hello {{1}},\n\nWanted to share how MailFlow can help {{2}} automate multi-channel follow-ups on both WhatsApp and Email with zero manual work.\n\nWould you like to see a quick 5-minute interactive walkthrough?',
    cta: 'Watch Interactive Demo',
  },
];

interface CampaignTemplateItem {
  name?: string;
  language?: string;
  status?: string;
  bodyText?: string;
  body?: string;
  subject?: string;
  cta?: string;
  buttons?: TemplateButton[];
}

export default function CreateCampaignPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const initialLeadIds = (location.state as { initialSelectedLeadIds?: string[] })
    ?.initialSelectedLeadIds;

  // Campaign Meta
  const [channel, setChannel] = useState<'WHATSAPP' | 'EMAIL' | 'EMAIL_AND_WHATSAPP'>('WHATSAPP');
  const [campaignName, setCampaignName] = useState('edtech campaign');
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>(initialLeadIds || []);
  const [contactsModalOpen, setContactsModalOpen] = useState(false);

  // Template State
  const [waTemplates, setWaTemplates] = useState<WhatsappMetaTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplateName, setSelectedTemplateName] = useState<string>('edtech_sales');

  // Media / Header Image
  const [uploadedImageName, setUploadedImageName] = useState<string>('EDTEC...LE.png');
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>(
    'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&auto=format&fit=crop&q=80'
  );

  // Dynamic Variable Mappings: key = "1", "2" -> { attribute: "$Name", fallback: "" }
  const [variableMappings, setVariableMappings] = useState<
    Record<string, { attribute: string; fallback: string }>
  >({
    '1': { attribute: '$Name', fallback: 'Rishabh' },
    '2': { attribute: '$TargetExam', fallback: 'JEE' },
  });

  // Scheduling
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  // Test Message Sending
  const [testName, setTestName] = useState('Rishabh');
  const [testContact, setTestContact] = useState('8839424242');
  const [sendingTest, setSendingTest] = useState(false);

  // Submitting campaign
  const [submitting, setSubmitting] = useState(false);

  // Fetch WhatsApp Templates
  useEffect(() => {
    setLoadingTemplates(true);
    whatsappService
      .getTemplates()
      .then((res) => {
        if (res?.templates && res.templates.length > 0) {
          setWaTemplates(res.templates);
          const approved = res.templates.find((t) => t.status === 'APPROVED');
          const found = approved || res.templates[0];
          setSelectedTemplateName(found.name);
        } else {
          setWaTemplates([]);
          setSelectedTemplateName('');
        }
      })
      .catch(() => {
        setWaTemplates([]);
        setSelectedTemplateName('');
      })
      .finally(() => setLoadingTemplates(false));
  }, []);

  // Current active template body and details
  const activeTemplate = useMemo(() => {
    if (channel === 'EMAIL') {
      const found = PRESET_EMAIL_TEMPLATES.find((t) => t.name === selectedTemplateName);
      return (
        found || {
          name: 'custom_email',
          subject: 'Personalized outreach from MailFlow',
          body: 'Hi {{1}},\n\nI wanted to connect regarding {{2}}.\n\nLet me know if you would like to learn more.',
          cta: 'Learn More',
        }
      );
    }
    const found = waTemplates.find((t) => t.name === selectedTemplateName);
    return (
      found || {
        name: selectedTemplateName,
        language: 'en',
        status: 'APPROVED',
        bodyText:
          'Hi {{1}},\n\nPreparing for {{2}} this year?\n\nWe have helped *students improve their mock test scores* using structured revision planning and performance tracking.\n\nIf you would like to see how this works for you, choose an option below.',
      }
    );
  }, [channel, selectedTemplateName, waTemplates]);

  // Extract variables from the active template body
  const currentVariables = useMemo(() => {
    const template = activeTemplate as CampaignTemplateItem;
    const text = template.bodyText || template.body || '';
    const matches = text.match(/\{\{(\d+)\}\}/g) || [];
    const uniqueNums = Array.from<string>(
      new Set(matches.map((m: string) => m.replace(/[{}]/g, '')))
    );
    return uniqueNums.sort((a: string, b: string) => parseInt(a, 10) - parseInt(b, 10));
  }, [activeTemplate]);

  // Sync variable mappings when variables change
  useEffect(() => {
    setVariableMappings((prev) => {
      const updated = { ...prev };
      currentVariables.forEach((v) => {
        if (!updated[v]) {
          updated[v] = {
            attribute: v === '1' ? '$Name' : v === '2' ? '$TargetExam' : '$Company',
            fallback: '',
          };
        }
      });
      return updated;
    });
  }, [currentVariables]);

  // Sample values computed for the preview
  const previewSampleValues = useMemo(() => {
    const values: Record<string, string> = {};
    currentVariables.forEach((v) => {
      const mapping = variableMappings[v];
      if (mapping) {
        // If an attribute is selected, show the attribute name or fallback
        if (mapping.attribute && mapping.attribute !== '') {
          values[v] = mapping.fallback?.trim() ? mapping.fallback : mapping.attribute;
        } else {
          values[v] = mapping.fallback?.trim() || `{{${v}}}`;
        }
      } else {
        values[v] = `{{${v}}}`;
      }
    });
    return values;
  }, [currentVariables, variableMappings]);

  // Preset Action Buttons for WhatsApp
  const previewButtons: TemplateButton[] = useMemo(
    () => [
      { id: 'b1', type: 'QUICK_REPLY', text: 'Show Me How' },
      { id: 'b2', type: 'URL', text: 'View Program Details', url: 'https://mailflow.ai' },
      { id: 'b3', type: 'PHONE_NUMBER', text: 'Speak to Counsellor', phoneNumber: '+919876543210' },
    ],
    []
  );

  // Handle File Upload (Mock image picker)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedImageName(file.name);
      const url = URL.createObjectURL(file);
      setUploadedImageUrl(url);
      toast.success(`Loaded image: ${file.name}`);
    }
  };

  // Send Test Message
  const handleSendTestMessage = async () => {
    if (!testContact.trim()) {
      toast.error(
        channel === 'EMAIL'
          ? 'Please enter an email address for the test.'
          : 'Please enter a valid phone number for the test.'
      );
      return;
    }

    setSendingTest(true);
    setTimeout(() => {
      setSendingTest(false);
      toast.success(
        channel === 'EMAIL'
          ? `Test email dispatched to ${testContact}!`
          : `Test WhatsApp message sent to +91 ${testContact}!`
      );
    }, 1000);
  };

  // Submit Campaign
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!campaignName.trim()) {
      toast.error('Please enter a campaign name.');
      return;
    }

    if (selectedLeadIds.length === 0) {
      toast.error('Please select at least 1 contact/lead for this campaign.');
      return;
    }

    setSubmitting(true);
    try {
      await campaignService.createCampaign({
        name: campaignName.trim(),
        channel,
        leadIds: selectedLeadIds,
        selectedTemplate: selectedTemplateName,
        status: isScheduled ? 'QUEUED' : 'DRAFT',
      });

      toast.success(`Campaign "${campaignName}" created successfully!`);
      navigate(ROUTES.CAMPAIGNS);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create campaign';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-[var(--surface-border)]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(ROUTES.CAMPAIGNS)}
            className="p-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] hover:bg-[var(--surface-elevated)] text-[var(--content-secondary)] hover:text-[var(--content-primary)] transition-colors shadow-2xs cursor-pointer"
            title="Back to Campaigns"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Create Campaign
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Configure message templates, map dynamic lead variables, and preview live on WhatsApp
              & Email.
            </p>
          </div>
        </div>

        {/* Channel Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/70 p-1 rounded-xl border border-[var(--surface-border)]">
          <button
            type="button"
            onClick={() => {
              setChannel('WHATSAPP');
              if (waTemplates.length > 0) setSelectedTemplateName(waTemplates[0].name);
            }}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
              channel === 'WHATSAPP'
                ? 'bg-white dark:bg-slate-700 text-[#25D366] shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            <span>WhatsApp</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setChannel('EMAIL');
              setSelectedTemplateName(PRESET_EMAIL_TEMPLATES[0].name);
            }}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
              channel === 'EMAIL'
                ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            <span>Email</span>
          </button>
          <button
            type="button"
            onClick={() => setChannel('EMAIL_AND_WHATSAPP')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
              channel === 'EMAIL_AND_WHATSAPP'
                ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            <span>Omnichannel</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form Setup (xl:col-span-7) */}
        <form onSubmit={handleCreateCampaign} className="xl:col-span-7 space-y-6">
          {/* Row 1: Campaign Name & Template Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Campaign Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-200">
                Campaign Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="e.g. edtech campaign"
                className="w-full h-10 px-3.5 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] text-sm font-medium text-[var(--content-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-2xs placeholder:text-slate-400"
                required
              />
            </div>

            {/* Template Name */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 dark:text-slate-200">
                  Template Name <span className="text-red-500">*</span>
                </label>
              </div>
              <select
                value={selectedTemplateName}
                onChange={(e) => setSelectedTemplateName(e.target.value)}
                disabled={loadingTemplates}
                className="w-full h-10 px-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] text-sm font-medium text-[var(--content-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-2xs disabled:opacity-60"
                required
              >
                {loadingTemplates ? (
                  <option value="">Loading approved templates...</option>
                ) : channel === 'EMAIL' ? (
                  PRESET_EMAIL_TEMPLATES.map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.name}
                    </option>
                  ))
                ) : (
                  waTemplates.map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.name}
                    </option>
                  ))
                )}
              </select>

              <div className="pt-0.5">
                <Link
                  to={ROUTES.TEMPLATES_CREATE}
                  className="text-[11px] text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1 font-medium"
                >
                  <span>Can't find your template?</span>
                  <span className="font-semibold">Create new template →</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Row 2: Contacts & Upload Image */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            {/* Contacts Button */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-200">
                Contacts <span className="text-red-500">*</span>
              </label>
              <div>
                <button
                  type="button"
                  onClick={() => setContactsModalOpen(true)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs transition-all shadow-xs flex items-center justify-between gap-3 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                >
                  <span>
                    {selectedLeadIds.length > 0
                      ? `${selectedLeadIds.length} Contacts Selected`
                      : 'Select Contacts'}
                  </span>
                  <span className="text-sm">→</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">
                {selectedLeadIds.length > 0
                  ? `Campaign will be sent to ${selectedLeadIds.length} chosen leads.`
                  : 'Click to select leads from your database.'}
              </p>
            </div>

            {/* Upload Image */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-200">
                Upload Image <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <div className="flex items-center gap-2.5">
                <label className="px-3.5 py-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-elevated)] hover:bg-[var(--surface-card)] text-xs font-semibold text-[var(--content-primary)] cursor-pointer transition-colors shadow-2xs shrink-0">
                  Choose file
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <span className="text-xs text-slate-600 dark:text-slate-300 truncate max-w-[150px] font-mono">
                  {uploadedImageName}
                </span>
                {uploadedImageUrl && (
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs shrink-0 shadow-2xs">
                    ✓
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Row 3: Sample Values / Variable Mappings */}
          <div className="space-y-3 pt-2">
            <div className="space-y-0.5">
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-200">
                Sample Values
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Select a lead attribute or provide a fallback value for each template placeholder.
              </p>
            </div>

            {currentVariables.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-[var(--surface-border)] bg-[var(--surface-card)] text-center text-xs text-slate-400">
                No variables detected in this template.
              </div>
            ) : (
              <div className="space-y-3">
                {currentVariables.map((v) => {
                  const mapping = variableMappings[v] || { attribute: '', fallback: '' };

                  return (
                    <div
                      key={v}
                      className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
                    >
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 w-12 shrink-0 select-none">
                        &#123;&#123;{v}&#125;&#125;:
                      </span>

                      {/* Lead Attribute Selector */}
                      <div className="flex-1 min-w-[180px]">
                        <select
                          value={mapping.attribute}
                          onChange={(e) =>
                            setVariableMappings((prev) => ({
                              ...prev,
                              [v]: { ...prev[v], attribute: e.target.value },
                            }))
                          }
                          className="w-full h-9 px-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] text-xs text-[var(--content-primary)] font-medium focus:outline-none focus:ring-1 focus:ring-brand-500 shadow-2xs"
                        >
                          {LEAD_ATTRIBUTES.map((attr) => (
                            <option key={attr.value} value={attr.value}>
                              {attr.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <span className="text-xs font-semibold text-slate-400 select-none text-center sm:text-left">
                        OR
                      </span>

                      {/* Fallback Text Input */}
                      <div className="flex-1 min-w-[180px]">
                        <input
                          type="text"
                          value={mapping.fallback}
                          onChange={(e) =>
                            setVariableMappings((prev) => ({
                              ...prev,
                              [v]: { ...prev[v], fallback: e.target.value },
                            }))
                          }
                          placeholder={
                            mapping.attribute ? mapping.attribute : 'Type your value here'
                          }
                          className="w-full h-9 px-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] text-xs text-[var(--content-primary)] focus:outline-none focus:ring-1 focus:ring-brand-500 shadow-2xs placeholder:text-slate-400"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Row 4: Schedule Campaign Toggle */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={isScheduled}
                onClick={() => setIsScheduled((prev) => !prev)}
                className={cn(
                  'w-11 h-6 rounded-full transition-colors relative cursor-pointer',
                  isScheduled ? 'bg-brand-600' : 'bg-slate-200 dark:bg-slate-700'
                )}
              >
                <span
                  className={cn(
                    'w-4 h-4 rounded-full bg-white transition-transform absolute top-1 left-1 shadow-xs',
                    isScheduled ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
              <label
                onClick={() => setIsScheduled((prev) => !prev)}
                className="text-xs font-bold text-slate-900 dark:text-slate-200 cursor-pointer select-none"
              >
                Schedule Campaign
              </label>
            </div>

            {isScheduled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-elevated)] animate-scale-in">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Dispatch Date
                  </label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] text-xs text-[var(--content-primary)] focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Dispatch Time
                  </label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] text-xs text-[var(--content-primary)] focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Row 5: Send Test Message Box */}
          <div className="p-4 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-card)] shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 dark:text-slate-200">
                Send Test Message
              </label>
              <span className="text-[10px] text-slate-400">Verify format before mass dispatch</span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <input
                type="text"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                placeholder="Enter a Name"
                className="h-9 px-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-elevated)] text-xs text-[var(--content-primary)] focus:outline-none focus:ring-1 focus:ring-brand-500 sm:w-36"
              />

              {channel === 'EMAIL' ? (
                <input
                  type="email"
                  value={testContact}
                  onChange={(e) => setTestContact(e.target.value)}
                  placeholder="test@example.com"
                  className="flex-1 h-9 px-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-elevated)] text-xs text-[var(--content-primary)] focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              ) : (
                <div className="flex-1 flex items-center gap-1.5">
                  <span className="h-9 px-2.5 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-elevated)] text-xs font-bold flex items-center gap-1 select-none">
                    <span>🇮🇳</span>
                    <span className="text-slate-600 dark:text-slate-300">+91</span>
                  </span>
                  <input
                    type="tel"
                    value={testContact}
                    onChange={(e) => setTestContact(e.target.value)}
                    placeholder="8839424242"
                    className="flex-1 h-9 px-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-elevated)] text-xs text-[var(--content-primary)] focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={handleSendTestMessage}
                disabled={sendingTest}
                className="h-9 px-4 rounded-xl border border-brand-500/50 hover:border-brand-500 bg-brand-50/50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
              >
                <svg
                  className={`w-3.5 h-3.5 ${sendingTest ? 'animate-spin' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
                <span>{sendingTest ? 'Sending...' : 'Send'}</span>
              </button>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-[var(--surface-border)]">
            <Button
              variant="secondary"
              onClick={() => navigate(ROUTES.CAMPAIGNS)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={submitting} className="px-8 shadow-sm">
              Add Campaign
            </Button>
          </div>
        </form>

        {/* Right Column: Sticky Live Template Preview (xl:col-span-5) */}
        <div className="xl:col-span-5 sticky top-6">
          {channel === 'EMAIL' ? (
            <EmailTemplatePreview
              subject={
                (activeTemplate as CampaignTemplateItem).subject || 'Partnership Opportunity'
              }
              bodyText={(activeTemplate as CampaignTemplateItem).body || ''}
              headerImageUrl={uploadedImageUrl}
              sampleValues={previewSampleValues}
              ctaText={(activeTemplate as CampaignTemplateItem).cta || 'View Program Details'}
            />
          ) : (
            <WhatsappTemplatePreview
              headerType="MEDIA"
              headerImageUrl={uploadedImageUrl}
              bodyText={(activeTemplate as CampaignTemplateItem).bodyText || ''}
              sampleValues={previewSampleValues}
              buttons={previewButtons}
            />
          )}
        </div>
      </div>

      {/* Contacts / Lead Selection Modal */}
      <Modal
        open={contactsModalOpen}
        onClose={() => setContactsModalOpen(false)}
        title="Select Campaign Contacts"
        size="lg"
      >
        <div className="space-y-4 py-2">
          <p className="text-xs text-[var(--content-secondary)]">
            Select the leads to receive this campaign. Currently selected:{' '}
            <strong className="text-slate-900 dark:text-white font-bold">
              {selectedLeadIds.length}
            </strong>
          </p>

          <LeadPickerTable selectedIds={selectedLeadIds} onChange={setSelectedLeadIds} />

          <div className="pt-3 flex items-center justify-between border-t border-[var(--surface-border)]">
            <span className="text-xs font-semibold text-brand-600 dark:text-brand-400">
              {selectedLeadIds.length} leads selected
            </span>
            <Button variant="primary" onClick={() => setContactsModalOpen(false)}>
              Done Selecting
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
