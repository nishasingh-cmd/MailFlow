interface LeadData {
  name?: string | null;
  email?: string | null;
  company?: string | null;
  industry?: string | null;
  phone?: string | null;
  website?: string | null;
  linkedin?: string | null;
  customFields?: unknown;
  companyRef?: {
    name?: string | null;
    industry?: string | null;
    research?: {
      summary?: string | null;
      painPoints?: unknown;
    } | null;
  } | null;
}

export function personalizeText(templateText: string, lead: LeadData): string {
  if (!templateText) return '';

  const nameParts = (lead.name || '').trim().split(/\s+/);
  const firstName = nameParts[0] || 'Friend';
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
  const company = lead.company || lead.companyRef?.name || 'your company';
  const industry = lead.industry || lead.companyRef?.industry || 'your industry';

  let painPointsStr = '';
  if (Array.isArray(lead.companyRef?.research?.painPoints)) {
    painPointsStr = (lead.companyRef?.research?.painPoints as string[]).join(', ');
  } else if (typeof lead.companyRef?.research?.painPoints === 'string') {
    painPointsStr = lead.companyRef?.research?.painPoints;
  }

  const replacements: Record<string, string> = {
    firstName,
    lastName,
    name: lead.name || 'Friend',
    email: lead.email || '',
    company,
    industry,
    phone: lead.phone || '',
    website: lead.website || '',
    linkedin: lead.linkedin || '',
    painPoints: painPointsStr || 'industry challenges',
  };

  if (lead.customFields && typeof lead.customFields === 'object') {
    Object.entries(lead.customFields).forEach(([key, val]) => {
      replacements[key] = String(val ?? '');
    });
  }

  let result = templateText;
  Object.entries(replacements).forEach(([key, value]) => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
    result = result.replace(regex, value);
  });

  return result;
}
