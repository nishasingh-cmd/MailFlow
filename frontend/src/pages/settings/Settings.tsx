import { useState } from 'react';
import Profile from './Profile';
import { SmtpSettingsForm } from '../../components/smtp/SmtpSettingsForm';
import { cn } from '../../utils/cn';

export default function Settings() {
  const [activeTab, setActiveTab] = useState<'profile' | 'smtp'>('smtp');

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-[var(--content-primary)] tracking-tight">
          Settings
        </h1>
        <p className="text-sm text-[var(--content-secondary)] mt-0.5">
          Manage your account profile and email server delivery credentials.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--surface-border)] gap-2">
        <button
          onClick={() => setActiveTab('smtp')}
          className={cn(
            'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2',
            activeTab === 'smtp'
              ? 'border-brand-500 text-brand-400'
              : 'border-transparent text-[var(--content-secondary)] hover:text-[var(--content-primary)]'
          )}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          SMTP Server Configuration
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={cn(
            'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2',
            activeTab === 'profile'
              ? 'border-brand-500 text-brand-400'
              : 'border-transparent text-[var(--content-secondary)] hover:text-[var(--content-primary)]'
          )}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          Account Profile
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'smtp' && <SmtpSettingsForm />}
      {activeTab === 'profile' && <Profile />}
    </div>
  );
}
