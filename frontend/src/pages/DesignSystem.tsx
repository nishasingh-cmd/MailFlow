/**
 * DesignSystem Showcase — Phase 2 only.
 * Displays all UI components for visual testing. Not an application page.
 */
import { useState } from 'react';
import {
  Button,
  Input,
  Textarea,
  Select,
  Modal,
  Drawer,
  Sidebar,
  Navbar,
  Card,
  Table,
  Badge,
  Avatar,
  ToastContainer,
  Loader,
  PageLoader,
  EmptyState,
  Skeleton,
  type Column,
  type SidebarSection,
} from '../components/ui';
import { useTheme } from '../hooks/useTheme';
import { useToast } from '../hooks/useToast';

/* ───────── Icons ───────── */
const icons = {
  mail: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  ),
  chart: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  ),
  users: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  ),
  settings: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  plus: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  ),
  search: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  ),
};

/* ───────── Sample table data ───────── */
interface Lead {
  id: number;
  name: string;
  email: string;
  status: 'active' | 'pending' | 'inactive';
  score: number;
  created: string;
}

const leads: Lead[] = [
  {
    id: 1,
    name: 'Alice Johnson',
    email: 'alice@acme.com',
    status: 'active',
    score: 92,
    created: '2025-01-12',
  },
  {
    id: 2,
    name: 'Bob Martinez',
    email: 'bob@globex.io',
    status: 'pending',
    score: 67,
    created: '2025-01-10',
  },
  {
    id: 3,
    name: 'Carol Williams',
    email: 'carol@initech.co',
    status: 'inactive',
    score: 34,
    created: '2025-01-08',
  },
  {
    id: 4,
    name: 'David Chen',
    email: 'david@hooli.com',
    status: 'active',
    score: 88,
    created: '2025-01-06',
  },
];

const leadColumns: Column<Lead>[] = [
  {
    key: 'name',
    header: 'Name',
    sortable: true,
    render: (row) => (
      <div className="flex items-center gap-2.5">
        <Avatar name={row.name} size="sm" />
        <div>
          <p className="font-medium text-[var(--content-primary)]">{row.name}</p>
          <p className="text-xs text-[var(--content-tertiary)]">{row.email}</p>
        </div>
      </div>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    render: (row) => (
      <Badge
        variant={
          row.status === 'active' ? 'success' : row.status === 'pending' ? 'warning' : 'neutral'
        }
        dot
      >
        {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
      </Badge>
    ),
  },
  {
    key: 'score',
    header: 'Score',
    sortable: true,
    align: 'right',
    render: (row) => (
      <span
        className={
          row.score >= 80 ? 'text-green-400' : row.score >= 50 ? 'text-amber-400' : 'text-red-400'
        }
      >
        {row.score}
      </span>
    ),
  },
  { key: 'created', header: 'Created', render: (row) => row.created },
];

const sidebarSections: SidebarSection[] = [
  {
    title: 'Main',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: icons.chart },
      { id: 'leads', label: 'Leads', icon: icons.users, badge: 12 },
      { id: 'campaigns', label: 'Campaigns', icon: icons.mail, badge: 3 },
    ],
  },
  {
    title: 'Account',
    items: [{ id: 'settings', label: 'Settings', icon: icons.settings }],
  },
];

/* ───────── Section wrapper ───────── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-14">
      <div className="mb-6 flex items-center gap-3">
        <h2 className="text-lg font-semibold text-[var(--content-primary)]">{title}</h2>
        <div className="flex-1 h-px bg-[var(--surface-border)]" />
      </div>
      {children}
    </section>
  );
}

/* ───────── Main Showcase ───────── */
export default function DesignSystem() {
  const { isDark, toggleTheme } = useTheme();
  const { toast, toasts, removeToast } = useToast();

  // State
  const [inputVal, setInputVal] = useState('');
  const [textareaVal, setTextareaVal] = useState('');
  const [selectVal, setSelectVal] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSide, setDrawerSide] = useState<'left' | 'right'>('right');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarActive, setSidebarActive] = useState('leads');
  const [tableLoading, setTableLoading] = useState(false);
  const [showPageLoader, setShowPageLoader] = useState(false);
  const [passwordVal, setPasswordVal] = useState('');
  const [sortKey, setSortKey] = useState<string | undefined>();
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : d === 'desc' ? null : 'asc'));
      if (sortDir === null) setSortKey(undefined);
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const simulateTableLoading = () => {
    setTableLoading(true);
    setTimeout(() => setTableLoading(false), 2000);
  };

  const simulatePageLoader = () => {
    setShowPageLoader(true);
    setTimeout(() => setShowPageLoader(false), 2000);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--surface-bg)]">
      {/* ── Sidebar ── */}
      <Sidebar
        sections={sidebarSections}
        activeId={sidebarActive}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
        logo={
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              M
            </div>
            {!sidebarCollapsed && (
              <span className="font-semibold text-sm text-[var(--content-primary)]">MailFlow</span>
            )}
          </div>
        }
        footer={
          !sidebarCollapsed ? (
            <div className="flex items-center gap-2 px-1">
              <Avatar name="Nisha Singh" size="sm" online={true} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[var(--content-primary)] truncate">
                  Nisha Singh
                </p>
                <p className="text-2xs text-[var(--content-tertiary)]">Admin</p>
              </div>
            </div>
          ) : (
            <Avatar name="Nisha Singh" size="sm" online={true} />
          )
        }
      />

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Navbar */}
        <Navbar
          logo={
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--content-secondary)]">
              <span>Design System</span>
              <span className="text-[var(--content-tertiary)]">/</span>
              <span className="text-[var(--content-primary)]">Components</span>
            </div>
          }
          onThemeToggle={toggleTheme}
          isDark={isDark}
          user={{ name: 'Nisha Singh' }}
          notificationCount={4}
          onNotificationClick={() => toast.info('No new notifications')}
        />

        {/* Scrollable content area */}
        <main className="flex-1 overflow-y-auto px-6 py-8 max-w-5xl mx-auto w-full">
          <div className="mb-10">
            <Badge variant="brand" size="sm">
              Phase 2
            </Badge>
            <h1 className="mt-2 text-3xl font-bold text-[var(--content-primary)] tracking-tight">
              Design System
            </h1>
            <p className="mt-1.5 text-[var(--content-secondary)]">
              All reusable MailFlow components — for development testing only.
            </p>
          </div>

          {/* ── Buttons ── */}
          <Section title="Buttons">
            <div className="space-y-6">
              <div>
                <p className="text-xs uppercase tracking-widest text-[var(--content-tertiary)] mb-3">
                  Variants
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button variant="primary">Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="danger">Danger</Button>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-[var(--content-tertiary)] mb-3">
                  Sizes
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="sm">Small</Button>
                  <Button size="md">Medium</Button>
                  <Button size="lg">Large</Button>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-[var(--content-tertiary)] mb-3">
                  States &amp; Icons
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button loading>Loading</Button>
                  <Button disabled>Disabled</Button>
                  <Button leftIcon={icons.plus}>New Campaign</Button>
                  <Button variant="outline" rightIcon={icons.search}>
                    Search
                  </Button>
                </div>
              </div>
            </div>
          </Section>

          {/* ── Inputs ── */}
          <Section title="Inputs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input
                label="Email address"
                placeholder="you@company.com"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                leftIcon={icons.mail}
              />
              <Input
                label="Password"
                type="password"
                placeholder="Enter your password"
                value={passwordVal}
                onChange={(e) => setPasswordVal(e.target.value)}
              />
              <Input
                label="With error"
                placeholder="Enter value"
                error="This field is required."
                defaultValue="invalid"
              />
              <Input
                label="Success state"
                placeholder="Verified"
                success
                defaultValue="alice@acme.com"
                hint="Email has been verified."
              />
              <Input
                label="Disabled"
                placeholder="Can't edit this"
                disabled
                defaultValue="Read only value"
              />
              <Input
                label="With hint"
                placeholder="Subdomain"
                hint="Only letters, numbers, and hyphens."
              />
            </div>
          </Section>

          {/* ── Textarea ── */}
          <Section title="Textarea">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Textarea
                label="Campaign message"
                placeholder="Write your message…"
                value={textareaVal}
                onChange={(e) => setTextareaVal(e.target.value)}
                maxLength={200}
                showCount
              />
              <Textarea
                label="With error"
                placeholder="Required field"
                error="Message is too short. Minimum 20 characters."
                defaultValue="too short"
                resize="none"
              />
            </div>
          </Section>

          {/* ── Select ── */}
          <Section title="Select">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Select
                label="Campaign status"
                placeholder="Choose a status…"
                value={selectVal}
                onChange={setSelectVal}
                options={[
                  { label: 'Draft', value: 'draft' },
                  { label: 'Active', value: 'active' },
                  { label: 'Paused', value: 'paused' },
                  { label: 'Completed', value: 'completed' },
                  { label: 'Archived', value: 'archived', disabled: true },
                ]}
              />
              <Select
                label="Searchable select"
                placeholder="Search countries…"
                searchable
                options={[
                  { label: 'United States', value: 'us' },
                  { label: 'United Kingdom', value: 'uk' },
                  { label: 'Canada', value: 'ca' },
                  { label: 'Australia', value: 'au' },
                  { label: 'India', value: 'in' },
                  { label: 'Germany', value: 'de' },
                  { label: 'France', value: 'fr' },
                ]}
              />
            </div>
          </Section>

          {/* ── Badges ── */}
          <Section title="Badges">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="success">Success</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="error">Error</Badge>
                <Badge variant="info">Info</Badge>
                <Badge variant="neutral">Neutral</Badge>
                <Badge variant="brand">Brand</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="success" dot>
                  Active
                </Badge>
                <Badge variant="warning" dot>
                  Pending
                </Badge>
                <Badge variant="error" dot>
                  Failed
                </Badge>
                <Badge variant="neutral" dot size="sm">
                  Small
                </Badge>
              </div>
            </div>
          </Section>

          {/* ── Avatars ── */}
          <Section title="Avatars">
            <div className="space-y-5">
              <div className="flex items-end gap-4">
                <Avatar name="Alice Johnson" size="xs" />
                <Avatar name="Bob Martinez" size="sm" />
                <Avatar name="Carol Williams" size="md" />
                <Avatar name="David Chen" size="lg" />
                <Avatar name="Eve Thompson" size="xl" />
              </div>
              <div className="flex items-center gap-4">
                <Avatar name="Online User" size="md" online={true} />
                <Avatar name="Offline User" size="md" online={false} />
                <Avatar size="md" />
                <Avatar
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80"
                  name="Tom Avatar"
                  size="md"
                />
              </div>
            </div>
          </Section>

          {/* ── Cards ── */}
          <Section title="Cards">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card header="Default Card">
                <p className="text-sm text-[var(--content-secondary)]">
                  Standard card with a header section and body content for general use.
                </p>
              </Card>
              <Card
                variant="elevated"
                header="Elevated Card"
                footer={
                  <Button size="sm" variant="secondary">
                    View Details
                  </Button>
                }
              >
                <p className="text-sm text-[var(--content-secondary)]">
                  Has a stronger shadow for emphasis and a footer action.
                </p>
              </Card>
              <Card
                variant="interactive"
                header="Interactive Card"
                onClick={() => toast.info('Card clicked!')}
              >
                <p className="text-sm text-[var(--content-secondary)]">
                  Hover to see the lift effect. Click me!
                </p>
              </Card>
            </div>
          </Section>

          {/* ── Table ── */}
          <Section title="Table">
            <div className="space-y-3">
              <div className="flex items-center gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={simulateTableLoading}>
                  Simulate Loading
                </Button>
              </div>
              <Table
                columns={leadColumns}
                data={leads}
                keyExtractor={(r) => r.id}
                loading={tableLoading}
                sortKey={sortKey}
                sortDirection={sortDir}
                onSort={handleSort}
              />
            </div>
          </Section>

          {/* ── Loaders ── */}
          <Section title="Loaders">
            <div className="space-y-6">
              <div>
                <p className="text-xs uppercase tracking-widest text-[var(--content-tertiary)] mb-3">
                  Variants
                </p>
                <div className="flex items-center gap-8">
                  <Loader variant="spinner" size="md" />
                  <Loader variant="dots" size="md" />
                  <Loader variant="pulse" size="md" />
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-[var(--content-tertiary)] mb-3">
                  Sizes
                </p>
                <div className="flex items-center gap-8">
                  <Loader variant="spinner" size="xs" />
                  <Loader variant="spinner" size="sm" />
                  <Loader variant="spinner" size="md" />
                  <Loader variant="spinner" size="lg" />
                </div>
              </div>
              <div>
                <Button variant="outline" size="sm" onClick={simulatePageLoader}>
                  Show Page Loader (2s)
                </Button>
              </div>
            </div>
          </Section>

          {/* ── Skeleton ── */}
          <Section title="Skeletons">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs uppercase tracking-widest text-[var(--content-tertiary)] mb-3">
                  Text
                </p>
                <Skeleton variant="text" lines={4} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-[var(--content-tertiary)] mb-3">
                  Card
                </p>
                <Skeleton variant="card" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-[var(--content-tertiary)] mb-3">
                  Avatar
                </p>
                <div className="flex gap-3">
                  <Skeleton variant="avatar" className="w-8 h-8" />
                  <Skeleton variant="avatar" />
                  <Skeleton variant="avatar" className="w-12 h-12" />
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-[var(--content-tertiary)] mb-3">
                  Table rows
                </p>
                <Skeleton variant="table-row" rows={3} />
              </div>
            </div>
          </Section>

          {/* ── Empty State ── */}
          <Section title="Empty States">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card variant="default">
                <EmptyState
                  title="No campaigns found"
                  description="Create your first email campaign to start reaching your audience."
                  action={{
                    label: 'New Campaign',
                    onClick: () => toast.success('Campaign created!'),
                  }}
                  secondaryAction={{ label: 'Learn more', onClick: () => {}, variant: 'outline' }}
                />
              </Card>
              <Card variant="default">
                <EmptyState
                  icon={icons.users}
                  title="No leads yet"
                  description="Import your contacts or add leads manually."
                  size="sm"
                  action={{ label: 'Import Leads', onClick: () => toast.info('Import started') }}
                />
              </Card>
            </div>
          </Section>

          {/* ── Modal ── */}
          <Section title="Modal & Drawer">
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setDrawerSide('right');
                  setDrawerOpen(true);
                }}
              >
                Right Drawer
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setDrawerSide('left');
                  setDrawerOpen(true);
                }}
              >
                Left Drawer
              </Button>
            </div>
          </Section>

          {/* ── Toasts ── */}
          <Section title="Toast Notifications">
            <div className="flex flex-wrap gap-3">
              <Button
                variant="primary"
                size="sm"
                onClick={() =>
                  toast.success({
                    title: 'Campaign sent!',
                    description: 'Your campaign was delivered to 1,234 contacts.',
                  })
                }
              >
                Success Toast
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() =>
                  toast.error({
                    title: 'Failed to send',
                    description: 'Please check your SMTP configuration.',
                  })
                }
              >
                Error Toast
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  toast.warning({
                    title: 'Rate limit approaching',
                    description: "You've used 80% of your daily send limit.",
                  })
                }
              >
                Warning Toast
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => toast.info('New lead imported from CSV.')}
              >
                Info Toast
              </Button>
            </div>
          </Section>

          {/* Sidebar demo section */}
          <Section title="Sidebar Navigation">
            <div className="flex gap-2 mb-3">
              {sidebarSections[0].items.map((item) => (
                <Button
                  key={item.id}
                  size="sm"
                  variant={sidebarActive === item.id ? 'primary' : 'outline'}
                  onClick={() => setSidebarActive(item.id)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
            <p className="text-sm text-[var(--content-secondary)]">
              The sidebar on the left is live — click items above to change the active state, or
              collapse it using the toggle arrow.
            </p>
          </Section>
        </main>
      </div>

      {/* ── Overlays ── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Confirm Send Campaign"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setModalOpen(false);
                toast.success('Campaign sent!');
              }}
            >
              Send Now
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p>
            You're about to send this campaign to{' '}
            <strong className="text-[var(--content-primary)]">4,821 contacts</strong>. This action
            cannot be undone.
          </p>
          <div className="rounded-lg bg-[var(--surface-elevated)] border border-[var(--surface-border)] p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--content-tertiary)]">Campaign</span>
              <span className="font-medium text-[var(--content-primary)]">Q1 Product Launch</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--content-tertiary)]">Schedule</span>
              <span className="font-medium text-[var(--content-primary)]">Immediately</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--content-tertiary)]">Recipients</span>
              <span className="font-medium text-[var(--content-primary)]">4,821</span>
            </div>
          </div>
          <p className="text-xs text-[var(--content-tertiary)]">
            Tip: You can preview the campaign before sending from the Campaigns list.
          </p>
        </div>
      </Modal>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        side={drawerSide}
        title="Lead Details"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setDrawerOpen(false)}>
              Close
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setDrawerOpen(false);
                toast.success('Changes saved!');
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Avatar name="Alice Johnson" size="lg" online />
            <div>
              <p className="font-semibold text-[var(--content-primary)]">Alice Johnson</p>
              <p className="text-sm text-[var(--content-tertiary)]">alice@acme.com</p>
              <Badge variant="success" dot size="sm" className="mt-1">
                Active
              </Badge>
            </div>
          </div>
          <div className="h-px bg-[var(--surface-border)]" />
          <Input label="Full name" defaultValue="Alice Johnson" />
          <Input label="Email" defaultValue="alice@acme.com" />
          <Select
            label="Status"
            value="active"
            options={[
              { label: 'Active', value: 'active' },
              { label: 'Pending', value: 'pending' },
              { label: 'Inactive', value: 'inactive' },
            ]}
          />
          <Textarea label="Notes" placeholder="Add notes about this lead…" resize="none" />
        </div>
      </Drawer>

      {/* Toast container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Page loader */}
      {showPageLoader && <PageLoader label="Loading dashboard…" />}
    </div>
  );
}
