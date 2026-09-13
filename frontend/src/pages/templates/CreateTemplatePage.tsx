import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ROUTES } from '../../routes/routes';
import { whatsappService } from '../../services/whatsapp.service';
import { useToast } from '../../hooks/useToast';
import { Button } from '../../components/ui';
import {
  WhatsappTemplatePreview,
  TemplateButton,
} from '../../components/whatsapp/WhatsappTemplatePreview';

const LANGUAGE_OPTIONS = [
  { value: 'en_US', label: 'English (US)' },
  { value: 'en_GB', label: 'English (UK)' },
  { value: 'hi', label: 'Hindi (hi)' },
  { value: 'es', label: 'Spanish (es)' },
  { value: 'pt_BR', label: 'Portuguese (BR)' },
  { value: 'fr', label: 'French (fr)' },
  { value: 'de', label: 'German (de)' },
  { value: 'id', label: 'Indonesian (id)' },
  { value: 'ar', label: 'Arabic (ar)' },
];

const CATEGORY_OPTIONS = [
  { value: 'MARKETING', label: 'MARKETING' },
  { value: 'UTILITY', label: 'UTILITY' },
  { value: 'AUTHENTICATION', label: 'AUTHENTICATION' },
];

export default function CreateTemplatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Preset passed via router navigation
  interface PresetState {
    name?: string;
    language?: string;
    category?: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  }
  const passedPreset = (location.state as { preset?: PresetState })?.preset;

  // Form states - completely empty by default, relying only on placeholders
  const [name, setName] = useState(passedPreset?.name || '');
  const [language, setLanguage] = useState(passedPreset?.language || 'en_US');
  const [category, setCategory] = useState<'' | 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'>(
    passedPreset?.category || ''
  );

  // Header & Footer
  const [headerType, setHeaderType] = useState<'NONE' | 'TEXT' | 'MEDIA'>(
    passedPreset?.header ? 'TEXT' : 'TEXT'
  );
  const [headerText, setHeaderText] = useState(passedPreset?.header || '');
  const [footerText, setFooterText] = useState(passedPreset?.footer || '');

  // Body Text
  const [bodyText, setBodyText] = useState(passedPreset?.body || '');

  // Dynamic Sample Values dictionary
  const [sampleValues, setSampleValues] = useState<Record<string, string>>(
    passedPreset?.sampleValues || {}
  );

  // Buttons
  const [buttons, setButtons] = useState<TemplateButton[]>(passedPreset?.buttons || []);

  const [buttonDropdownOpen, setButtonDropdownOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Detect variables in bodyText
  const detectedVariables = useMemo<string[]>(() => {
    const matches = bodyText.match(/\{\{(\d+)\}\}/g) || [];
    const uniqueNums = Array.from<string>(
      new Set(matches.map((m: string) => m.replace(/[{}]/g, '')))
    );
    return uniqueNums.sort((a: string, b: string) => parseInt(a, 10) - parseInt(b, 10));
  }, [bodyText]);

  // Keep sample values synchronized with detected variables
  useEffect(() => {
    setSampleValues((prev: Record<string, string>) => {
      const updated: Record<string, string> = { ...prev };
      detectedVariables.forEach((v: string) => {
        if (!updated[v]) {
          updated[v] = '';
        }
      });
      return updated;
    });
  }, [detectedVariables]);

  // Insert {{1}}, {{2}}, etc. into message body
  const handleAddVariable = () => {
    const nextNum =
      detectedVariables.length > 0
        ? Math.max(...detectedVariables.map((v: string) => parseInt(v, 10))) + 1
        : 1;

    setBodyText((prev: string) => `${prev} {{${nextNum}}}`);
  };

  // Add Button Handler
  const handleAddButton = (type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER') => {
    setButtonDropdownOpen(false);

    if (type === 'QUICK_REPLY') {
      const quickReplyCount = buttons.filter((b) => b.type === 'QUICK_REPLY').length;
      if (quickReplyCount >= 3) {
        toast.error('Meta permits up to 3 Quick Reply buttons per template.');
        return;
      }
      setButtons((prev) => [
        ...prev,
        {
          id: `btn_${Date.now()}`,
          type: 'QUICK_REPLY',
          text: '',
        },
      ]);
    } else if (type === 'URL') {
      const urlCount = buttons.filter((b) => b.type === 'URL').length;
      if (urlCount >= 2) {
        toast.error('Meta permits up to 2 Visit Website buttons per template.');
        return;
      }
      setButtons((prev) => [
        ...prev,
        {
          id: `btn_${Date.now()}`,
          type: 'URL',
          text: '',
          urlType: 'Static',
          url: 'https://',
        },
      ]);
    } else if (type === 'PHONE_NUMBER') {
      const phoneCount = buttons.filter((b) => b.type === 'PHONE_NUMBER').length;
      if (phoneCount >= 1) {
        toast.error('Meta permits only 1 Call Phone button per template.');
        return;
      }
      setButtons((prev) => [
        ...prev,
        {
          id: `btn_${Date.now()}`,
          type: 'PHONE_NUMBER',
          text: '',
          phoneNumber: '',
        },
      ]);
    }
  };

  const handleRemoveButton = (id: string) => {
    setButtons((prev) => prev.filter((b) => b.id !== id));
  };

  const handleUpdateButtonText = (id: string, text: string) => {
    setButtons((prev) => prev.map((b) => (b.id === id ? { ...b, text } : b)));
  };

  const handleUpdateUrl = (id: string, field: 'url' | 'urlType', value: string) => {
    setButtons((prev) => prev.map((b) => (b.id === id ? { ...b, [field]: value } : b)));
  };

  const handleUpdatePhone = (id: string, phoneNumber: string) => {
    setButtons((prev) => prev.map((b) => (b.id === id ? { ...b, phoneNumber } : b)));
  };

  // Submit Template
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Please provide a valid template name.');
      return;
    }

    if (!category) {
      toast.error('Please select a template category.');
      return;
    }

    if (!bodyText.trim()) {
      toast.error('Please enter the message body text.');
      return;
    }

    // Check that all detected variables have sample values
    const missingSamples = detectedVariables.filter((v) => !sampleValues[v]?.trim());
    if (missingSamples.length > 0) {
      toast.error(
        `Please provide sample values for {{${missingSamples.join('}}, {{')}}} before submitting to Meta.`
      );
      return;
    }

    const sanitizedName = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_');

    // Build sample values array in variable order
    const orderedSampleValues = detectedVariables.map((v) => sampleValues[v] || '');

    setSubmitting(true);
    try {
      await whatsappService.createTemplate({
        name: sanitizedName,
        language,
        category: category as 'MARKETING' | 'UTILITY' | 'AUTHENTICATION',
        headerType,
        headerText: headerType === 'TEXT' ? headerText : undefined,
        bodyText,
        sampleValues: orderedSampleValues,
        footerText: footerText.trim() || undefined,
        buttons: buttons.map((b) => {
          if (b.type === 'QUICK_REPLY') {
            return { type: 'QUICK_REPLY', text: b.text };
          } else if (b.type === 'URL') {
            return { type: 'URL', text: b.text, url: b.url || 'https://', urlType: b.urlType };
          } else {
            return { type: 'PHONE_NUMBER', text: b.text, phoneNumber: b.phoneNumber || '' };
          }
        }),
      });

      toast.success(`Template "${sanitizedName}" submitted to Meta for review!`);
      navigate(ROUTES.TEMPLATES);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit template to Meta.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Top Breadcrumb & Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-[var(--surface-border)]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(ROUTES.TEMPLATES)}
            className="p-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] hover:bg-[var(--surface-elevated)] text-[var(--content-secondary)] hover:text-[var(--content-primary)] transition-colors shadow-2xs"
            title="Back to Templates"
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
              Create WhatsApp Template
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Configure message components, define sample values, and preview live on WhatsApp.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => navigate(ROUTES.TEMPLATES)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={submitting}
            className="shadow-sm"
          >
            Submit to Meta
          </Button>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form Controls (xl:col-span-7) */}
        <form onSubmit={handleSubmit} className="xl:col-span-7 space-y-6">
          {/* Row 1: Name, Language, Category */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            {/* Template Name */}
            <div className="sm:col-span-6 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 dark:text-slate-200">
                  Name <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] font-medium text-slate-400">{name.length}/512</span>
              </div>
              <input
                type="text"
                value={name}
                maxLength={512}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                placeholder="Dr Gaurav Gupta Clinic"
                className="w-full h-10 px-3.5 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] text-sm font-medium text-[var(--content-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-2xs placeholder:text-slate-400"
                required
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">
                * Alphanumeric characters and underscores only
              </p>
            </div>

            {/* Language */}
            <div className="sm:col-span-3 space-y-1.5">
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-200">
                Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] text-sm font-medium text-[var(--content-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-2xs"
              >
                {LANGUAGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div className="sm:col-span-3 space-y-1.5">
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-200">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as '' | 'MARKETING' | 'UTILITY' | 'AUTHENTICATION')
                }
                className={`w-full h-10 px-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-2xs ${
                  !category ? 'text-slate-400 dark:text-slate-500' : 'text-[var(--content-primary)]'
                }`}
                required
              >
                <option value="" disabled>
                  Select Category
                </option>
                {CATEGORY_OPTIONS.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    className="text-[var(--content-primary)]"
                  >
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Header and Footer */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            {/* Header */}
            <div className="sm:col-span-4 space-y-1.5">
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-200">
                Header
              </label>
              <select
                value={headerType}
                onChange={(e) => setHeaderType(e.target.value as 'NONE' | 'TEXT' | 'MEDIA')}
                className="w-full h-10 px-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] text-sm font-medium text-[var(--content-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-2xs"
              >
                <option value="TEXT">TEXT</option>
                <option value="NONE">NONE</option>
                <option value="MEDIA">MEDIA</option>
              </select>
            </div>

            {/* Header Text (conditional if TEXT) */}
            {headerType === 'TEXT' && (
              <div className="sm:col-span-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 dark:text-slate-200">
                    Header Text<span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <span className="text-[11px] font-medium text-slate-400">
                    {headerText.length}/60
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={60}
                  value={headerText}
                  onChange={(e) => setHeaderText(e.target.value)}
                  placeholder="e.g. Exclusive Offer"
                  className="w-full h-10 px-3.5 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] text-sm font-medium text-[var(--content-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-2xs placeholder:text-slate-400"
                />
              </div>
            )}

            {/* Footer */}
            <div
              className={`${headerType === 'TEXT' ? 'sm:col-span-4' : 'sm:col-span-8'} space-y-1.5`}
            >
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 dark:text-slate-200">
                  Footer <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <span className="text-[11px] font-medium text-slate-400">
                  {footerText.length}/60
                </span>
              </div>
              <input
                type="text"
                maxLength={60}
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                placeholder="Reply STOP to unsubscribe"
                className="w-full h-10 px-3.5 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] text-sm font-medium text-[var(--content-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-2xs placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Row 3: Message Body & Sample Values */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Left Sub-Column: Message */}
            <div className="md:col-span-7 space-y-2">
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-200">
                Message <span className="text-red-500">*</span>
              </label>

              <div className="relative rounded-2xl overflow-hidden border border-[var(--surface-border)] bg-[var(--surface-card)] shadow-2xs focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-brand-500 transition-all">
                <textarea
                  rows={8}
                  value={bodyText}
                  maxLength={1024}
                  onChange={(e) => setBodyText(e.target.value)}
                  placeholder="Hi {{1}}, enter your message template body here..."
                  className="w-full p-3.5 bg-transparent text-sm text-[var(--content-primary)] focus:outline-none focus:ring-0 border-0 resize-none font-sans leading-relaxed rounded-t-2xl block"
                />

                <div className="flex items-center justify-between px-3.5 py-2.5 border-t border-[var(--surface-border)] bg-[var(--surface-elevated)]">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Characters: {bodyText.length}/1024
                  </span>
                  <button
                    type="button"
                    onClick={handleAddVariable}
                    className="px-2.5 py-1 rounded-lg bg-brand-50 dark:bg-brand-950/60 hover:bg-brand-100 dark:hover:bg-brand-900/60 text-brand-600 dark:text-brand-400 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>+ Add Variable</span>
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                * Text Formatting:{' '}
                <span className="font-bold text-slate-700 dark:text-slate-300">*bold*</span>,{' '}
                <span className="italic text-slate-700 dark:text-slate-300">_italic_</span>,{' '}
                <span className="line-through text-slate-700 dark:text-slate-300">
                  ~strikethrough~
                </span>
                ,{' '}
                <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
                  ```Monospace```
                </code>
              </p>
            </div>

            {/* Right Sub-Column: Sample Values */}
            <div className="md:col-span-5 space-y-2">
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-200">
                Sample Values
              </label>

              {detectedVariables.length === 0 ? (
                <div className="p-5 rounded-2xl border border-dashed border-[var(--surface-border)] bg-[var(--surface-card)] text-center text-xs text-slate-400 dark:text-slate-500 min-h-[190px] flex flex-col items-center justify-center space-y-2">
                  <svg
                    className="w-6 h-6 text-slate-300 dark:text-slate-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                    />
                  </svg>
                  <span>No variables found in message.</span>
                  <span className="text-[11px] text-slate-400">
                    Click <strong>+ Add Variable</strong> to insert dynamic placeholders like{' '}
                    <code>&#123;&#123;1&#125;&#125;</code>.
                  </span>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                  {detectedVariables.map((v) => (
                    <div
                      key={v}
                      className="flex items-center gap-2.5 p-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] shadow-2xs"
                    >
                      <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs shrink-0 select-none">
                        &#123;&#123;{v}&#125;&#125;
                      </span>
                      <input
                        type="text"
                        value={sampleValues[v] || ''}
                        onChange={(e) =>
                          setSampleValues((prev) => ({ ...prev, [v]: e.target.value }))
                        }
                        placeholder={`Sample value for {{${v}}}`}
                        className="flex-1 h-8 px-2.5 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-elevated)] text-xs text-[var(--content-primary)] focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Row 4: Buttons (Optional) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 dark:text-slate-200">
                Buttons <span className="text-slate-400 font-normal">(Optional)</span>
              </label>

              {/* Add Button Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setButtonDropdownOpen((prev) => !prev)}
                  className="px-3 py-1.5 rounded-xl border border-brand-500/50 hover:border-brand-500 bg-brand-50/50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
                >
                  <span className="text-sm leading-none">+</span>
                  <span>Add Button</span>
                  <svg
                    className={`w-3 h-3 transition-transform ${buttonDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {buttonDropdownOpen && (
                  <div className="absolute right-0 mt-1.5 w-48 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] shadow-lg py-1 z-30 animate-scale-in">
                    <button
                      type="button"
                      onClick={() => handleAddButton('QUICK_REPLY')}
                      className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-[var(--surface-elevated)] flex items-center gap-2"
                    >
                      <svg
                        className="w-3.5 h-3.5 text-brand-500 -scale-x-100"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 10h10a5 5 0 015 5v3M3 10l6-6M3 10l6 6"
                        />
                      </svg>
                      <span>Quick Reply</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddButton('URL')}
                      className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-[var(--surface-elevated)] flex items-center gap-2"
                    >
                      <svg
                        className="w-3.5 h-3.5 text-brand-500"
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
                      <span>Visit Website</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddButton('PHONE_NUMBER')}
                      className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-[var(--surface-elevated)] flex items-center gap-2"
                    >
                      <svg
                        className="w-3.5 h-3.5 text-brand-500"
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
                      <span>Call Phone</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Rendered Action Button Cards */}
            <div className="space-y-3">
              {buttons.map((btn) => (
                <div
                  key={btn.id}
                  className="p-4 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-card)] shadow-2xs space-y-3 relative group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      {btn.type === 'QUICK_REPLY'
                        ? 'Quick Reply'
                        : btn.type === 'URL'
                          ? 'Visit Website'
                          : 'Call Phone'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveButton(btn.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-md"
                      title="Remove button"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Quick Reply Form */}
                  {btn.type === 'QUICK_REPLY' && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          Button text
                        </label>
                        <span className="text-[11px] text-slate-400">{btn.text.length}/25</span>
                      </div>
                      <input
                        type="text"
                        maxLength={25}
                        value={btn.text}
                        onChange={(e) => handleUpdateButtonText(btn.id, e.target.value)}
                        placeholder="e.g. Show Me How"
                        className="w-full h-9 px-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-elevated)] text-xs text-[var(--content-primary)] focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </div>
                  )}

                  {/* Visit Website Form */}
                  {btn.type === 'URL' && (
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-4 space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            Button text
                          </label>
                          <span className="text-[11px] text-slate-400">{btn.text.length}/25</span>
                        </div>
                        <input
                          type="text"
                          maxLength={25}
                          value={btn.text}
                          onChange={(e) => handleUpdateButtonText(btn.id, e.target.value)}
                          placeholder="View Program Details"
                          className="w-full h-9 px-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-elevated)] text-xs text-[var(--content-primary)] focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                      </div>

                      <div className="sm:col-span-3 space-y-1">
                        <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          URL type
                        </label>
                        <select
                          value={btn.urlType || 'Static'}
                          onChange={(e) => handleUpdateUrl(btn.id, 'urlType', e.target.value)}
                          className="w-full h-9 px-2.5 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-elevated)] text-xs text-[var(--content-primary)] focus:outline-none focus:ring-1 focus:ring-brand-500"
                        >
                          <option value="Static">Static</option>
                          <option value="Dynamic">Dynamic</option>
                        </select>
                      </div>

                      <div className="sm:col-span-5 space-y-1">
                        <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          Website URL
                        </label>
                        <input
                          type="url"
                          value={btn.url || ''}
                          onChange={(e) => handleUpdateUrl(btn.id, 'url', e.target.value)}
                          placeholder="https://sandeshai.com/programs"
                          className="w-full h-9 px-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-elevated)] text-xs text-[var(--content-primary)] focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Call Phone Form */}
                  {btn.type === 'PHONE_NUMBER' && (
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-6 space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            Button text
                          </label>
                          <span className="text-[11px] text-slate-400">{btn.text.length}/25</span>
                        </div>
                        <input
                          type="text"
                          maxLength={25}
                          value={btn.text}
                          onChange={(e) => handleUpdateButtonText(btn.id, e.target.value)}
                          placeholder="Speak to Counsellor"
                          className="w-full h-9 px-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-elevated)] text-xs text-[var(--content-primary)] focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                      </div>

                      <div className="sm:col-span-6 space-y-1">
                        <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          Phone number with country code
                        </label>
                        <input
                          type="text"
                          value={btn.phoneNumber || ''}
                          onChange={(e) => handleUpdatePhone(btn.id, e.target.value)}
                          placeholder="+919876543210"
                          className="w-full h-9 px-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-elevated)] text-xs text-[var(--content-primary)] focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Submission Bar */}
          <div className="pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--surface-border)]">
            <button
              type="button"
              onClick={() => {
                setName('');
                setCategory('');
                setHeaderText('');
                setFooterText('');
                setBodyText('');
                setSampleValues({});
                setButtons([]);
                toast.info('Form cleared.');
              }}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer"
            >
              Clear Form
            </button>

            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                onClick={() => navigate(ROUTES.TEMPLATES)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                loading={submitting}
                className="px-6 shadow-sm"
              >
                Submit Template to Meta
              </Button>
            </div>
          </div>
        </form>

        {/* Right Column: Sticky Live WhatsApp Preview (xl:col-span-5) */}
        <div className="xl:col-span-5 sticky top-6">
          <WhatsappTemplatePreview
            headerType={headerType}
            headerText={headerText}
            bodyText={bodyText}
            footerText={footerText}
            sampleValues={sampleValues}
            buttons={buttons}
          />
        </div>
      </div>
    </div>
  );
}
