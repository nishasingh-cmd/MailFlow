import { useState, useEffect, FormEvent } from 'react';
import { Lead, LeadStatus } from '@mailflow/shared';
import { leadService } from '../../services/lead.service';
import { Modal, Input, Select, Button } from '../ui';
import { useToast } from '../../hooks/useToast';

interface LeadFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead?: Lead | null;
  onSuccess: () => void;
}

const STATUS_OPTIONS = [
  { value: 'NEW', label: 'New' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'QUALIFIED', label: 'Qualified' },
  { value: 'UNSUBSCRIBED', label: 'Unsubscribed' },
  { value: 'BOUNCED', label: 'Bounced' },
];

const EMPTY_FORM = {
  name: '',
  email: '',
  company: '',
  phone: '',
  website: '',
  linkedin: '',
  industry: '',
  status: 'NEW' as LeadStatus,
};

export function LeadFormModal({ isOpen, onClose, lead, onSuccess }: LeadFormModalProps) {
  const { toast } = useToast();
  const isEditing = Boolean(lead);

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof typeof EMPTY_FORM, string>>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Populate form when editing, reset when adding
  useEffect(() => {
    if (isOpen) {
      if (lead) {
        setFormData({
          name: lead.name ?? '',
          email: lead.email ?? '',
          company: lead.company ?? '',
          phone: lead.phone ?? '',
          website: lead.website ?? '',
          linkedin: lead.linkedin ?? '',
          industry: lead.industry ?? '',
          status: lead.status ?? 'NEW',
        });
      } else {
        setFormData(EMPTY_FORM);
      }
      setErrors({});
    }
  }, [lead, isOpen]);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof typeof EMPTY_FORM, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required.';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    if (isLoading) return; // prevent double-submit

    setIsLoading(true);

    try {
      if (isEditing && lead) {
        await leadService.updateLead(lead.id, formData);
        toast.success('Lead updated successfully.');
      } else {
        await leadService.createLead(formData);
        toast.success('Lead created successfully.');
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: string }; status?: number } };
      const status = errorObj.response?.status;
      const serverMsg = errorObj.response?.data?.error;

      console.error('[LeadForm] API error:', status, serverMsg, err);

      if (status === 409) {
        toast.error('A lead with this email address already exists.');
        setErrors((prev) => ({ ...prev, email: 'This email already exists in your leads.' }));
      } else if (status === 400 && serverMsg) {
        toast.error(serverMsg);
      } else {
        toast.error(serverMsg ?? 'Failed to save lead. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const field = (key: keyof typeof EMPTY_FORM) => ({
    value: formData[key],
    error: errors[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [key]: e.target.value }));
      if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
    },
  });

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Lead' : 'Add New Lead'}
      size="lg"
      persistent={isLoading}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Full Name *" placeholder="John Doe" {...field('name')} required autoFocus />
          <Input
            label="Email Address *"
            type="email"
            placeholder="john@example.com"
            {...field('email')}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Company Name"
            placeholder="Acme Corp"
            value={formData.company}
            onChange={(e) => setFormData((prev) => ({ ...prev, company: e.target.value }))}
          />
          <Input
            label="Phone Number"
            placeholder="+1 (555) 000-0000"
            value={formData.phone}
            onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Website URL"
            placeholder="https://example.com"
            value={formData.website}
            onChange={(e) => setFormData((prev) => ({ ...prev, website: e.target.value }))}
          />
          <Input
            label="LinkedIn Profile"
            placeholder="linkedin.com/in/johndoe"
            value={formData.linkedin}
            onChange={(e) => setFormData((prev) => ({ ...prev, linkedin: e.target.value }))}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Industry / Sector"
            placeholder="SaaS, E-commerce, etc."
            value={formData.industry}
            onChange={(e) => setFormData((prev) => ({ ...prev, industry: e.target.value }))}
          />
          <div>
            <Select
              label="Lead Status"
              options={STATUS_OPTIONS}
              value={formData.status}
              onChange={(val) => setFormData((prev) => ({ ...prev, status: val as LeadStatus }))}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-[var(--surface-border)]">
          <Button variant="ghost" onClick={onClose} type="button" disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" loading={isLoading} disabled={isLoading}>
            {isLoading
              ? isEditing
                ? 'Updating...'
                : 'Creating...'
              : isEditing
                ? 'Update Lead'
                : 'Create Lead'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
