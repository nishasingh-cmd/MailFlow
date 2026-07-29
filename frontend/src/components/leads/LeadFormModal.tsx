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

export function LeadFormModal({ isOpen, onClose, lead, onSuccess }: LeadFormModalProps) {
  const { toast } = useToast();
  const isEditing = Boolean(lead);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    website: '',
    linkedin: '',
    industry: '',
    status: 'NEW' as LeadStatus,
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
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
      setFormData({
        name: '',
        email: '',
        company: '',
        phone: '',
        website: '',
        linkedin: '',
        industry: '',
        status: 'NEW',
      });
    }
  }, [lead, isOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Lead name is required.');
      return;
    }

    if (!formData.email.trim()) {
      toast.error('Email address is required.');
      return;
    }

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
      const errorObj = err as { response?: { data?: { error?: string } } };
      toast.error(errorObj.response?.data?.error ?? 'Failed to save lead.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Lead' : 'Add New Lead'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Full Name *"
            placeholder="John Doe"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <Input
            label="Email Address *"
            type="email"
            placeholder="john@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Company Name"
            placeholder="Acme Corp"
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
          />

          <Input
            label="Phone Number"
            placeholder="+1 (555) 000-0000"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Website URL"
            placeholder="https://example.com"
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
          />

          <Input
            label="LinkedIn Profile"
            placeholder="linkedin.com/in/johndoe"
            value={formData.linkedin}
            onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Industry / Sector"
            placeholder="SaaS, E-commerce, etc."
            value={formData.industry}
            onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
          />

          <div>
            <Select
              label="Lead Status"
              options={STATUS_OPTIONS}
              value={formData.status}
              onChange={(val) => setFormData({ ...formData, status: val as LeadStatus })}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-[var(--surface-border)]">
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" loading={isLoading}>
            {isEditing ? 'Update Lead' : 'Create Lead'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
