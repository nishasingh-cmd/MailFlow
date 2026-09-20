import * as xlsx from 'xlsx';
import { ColumnMapping, ParsedFilePreview } from '@mailflow/shared';

const FIELD_KEYWORDS: Record<string, string[]> = {
  email: [
    'email',
    'email address',
    'email_address',
    'e-mail',
    'mail',
    'emailaddress',
    'contact email',
    'contact_email',
  ],
  name: [
    'name',
    'full name',
    'fullname',
    'contact name',
    'contact_name',
    'first name',
    'firstname',
    'person name',
    'lead name',
    'lead_name',
    'client name',
  ],
  phone: [
    'contacts',
    'contact',
    'contact number',
    'contact_number',
    'contact no',
    'contact_no',
    'contact no.',
    'contact numbers',
    'phone',
    'phone number',
    'phone_number',
    'phonenumber',
    'phone no',
    'phone_no',
    'phone no.',
    'phones',
    'mobile',
    'mobile number',
    'mobile_number',
    'mobilenumber',
    'mobile no',
    'mobile_no',
    'mobile no.',
    'mobiles',
    'whatsapp',
    'whatsapp number',
    'whatsapp_number',
    'whatsapp no',
    'whatsapp_no',
    'wa',
    'wa number',
    'wa_number',
    'telephone',
    'telephone number',
    'telephone_number',
    'telephone no',
    'tel',
    'cell',
    'cellphone',
    'cell number',
    'cell no',
    'ph',
    'ph no',
    'ph_no',
  ],
  company: [
    'company',
    'company name',
    'company_name',
    'organization',
    'org',
    'business',
    'business name',
    'business_name',
    'account',
    'client company',
  ],
  website: [
    'website',
    'url',
    'domain',
    'web',
    'site',
    'company website',
    'company_website',
    'link',
  ],
  linkedin: [
    'linkedin',
    'linkedin url',
    'profile',
    'linkedin profile',
    'linkedin_url',
    'linkedin_profile',
  ],
  industry: ['industry', 'sector', 'niche', 'vertical', 'business type', 'business_type'],
};

export function autoDetectColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    name: '',
    email: '',
    company: '',
    phone: '',
    website: '',
    linkedin: '',
    industry: '',
  };

  const normalizedHeaders = headers.map((h) =>
    h.trim().toLowerCase().replace(/[_-]/g, ' ').replace(/\s+/g, ' ')
  );

  const usedHeaderIndices = new Set<number>();

  // Pass 1: Exact matches
  for (const [targetField, keywords] of Object.entries(FIELD_KEYWORDS)) {
    const matchIndex = normalizedHeaders.findIndex(
      (h, idx) =>
        !usedHeaderIndices.has(idx) && keywords.some((kw) => kw.replace(/[_-]/g, ' ') === h)
    );

    if (matchIndex !== -1) {
      mapping[targetField] = headers[matchIndex];
      usedHeaderIndices.add(matchIndex);
    }
  }

  // Pass 2: Word-boundary / safe inclusion matches for unmapped fields
  for (const [targetField, keywords] of Object.entries(FIELD_KEYWORDS)) {
    if (mapping[targetField]) continue; // Already mapped

    const matchIndex = normalizedHeaders.findIndex(
      (h, idx) =>
        !usedHeaderIndices.has(idx) &&
        keywords.some((kw) => {
          const cleanKw = kw.replace(/[_-]/g, ' ');
          // For short keywords (<= 4 chars like 'tel', 'cell', 'org', 'site', 'mail'), require word boundary
          if (cleanKw.length <= 4) {
            const regex = new RegExp(`\\b${cleanKw}\\b`, 'i');
            return regex.test(h);
          }
          return h.includes(cleanKw);
        })
    );

    if (matchIndex !== -1) {
      mapping[targetField] = headers[matchIndex];
      usedHeaderIndices.add(matchIndex);
    }
  }

  return mapping;
}

export function parseFileBuffer(
  fileBuffer: Buffer,
  fileName: string,
  fileSize: number
): ParsedFilePreview {
  const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('FILE_EMPTY: The uploaded file contains no sheets.');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rawJson = xlsx.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: '',
    raw: false,
  });

  if (!rawJson || rawJson.length === 0) {
    throw new Error('FILE_EMPTY: The uploaded file has no data rows.');
  }

  // Scan all rows to discover all unique column headers in order of appearance
  const headerSet = new Set<string>();
  rawJson.forEach((row) => {
    Object.keys(row).forEach((k) => {
      const trimmed = k.trim();
      if (trimmed) {
        headerSet.add(trimmed);
      }
    });
  });
  const headers = Array.from(headerSet);

  if (headers.length === 0) {
    throw new Error('INVALID_FORMAT: Could not detect valid headers in the file.');
  }

  const sampleRows = rawJson.slice(0, 10).map((row) => {
    const cleanedRow: Record<string, string> = {};
    headers.forEach((h) => {
      const rawVal =
        row[h] !== undefined ? row[h] : Object.entries(row).find(([k]) => k.trim() === h)?.[1];
      cleanedRow[h] = rawVal != null ? String(rawVal).trim() : '';
    });
    return cleanedRow;
  });

  const autoMapping = autoDetectColumnMapping(headers);

  return {
    headers,
    autoMapping,
    sampleRows,
    totalRows: rawJson.length,
    fileName,
    fileSize,
  };
}

/**
 * Parse full file rows for validation processing
 */
export function parseAllRows(fileBuffer: Buffer): Record<string, string>[] {
  const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const worksheet = workbook.Sheets[firstSheetName];
  const rawJson = xlsx.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: '',
    raw: false,
  });

  if (!rawJson || rawJson.length === 0) return [];

  // Scan all rows to discover all unique column headers in order of appearance
  const headerSet = new Set<string>();
  rawJson.forEach((row) => {
    Object.keys(row).forEach((k) => {
      const trimmed = k.trim();
      if (trimmed) {
        headerSet.add(trimmed);
      }
    });
  });
  const headers = Array.from(headerSet);

  return rawJson.map((row) => {
    const cleanedRow: Record<string, string> = {};
    headers.forEach((h) => {
      const rawVal =
        row[h] !== undefined ? row[h] : Object.entries(row).find(([k]) => k.trim() === h)?.[1];
      cleanedRow[h] = rawVal != null ? String(rawVal).trim() : '';
    });
    return cleanedRow;
  });
}
