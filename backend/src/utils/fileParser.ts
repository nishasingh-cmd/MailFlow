import * as xlsx from 'xlsx';
import { ColumnMapping, ParsedFilePreview } from '@mailflow/shared';

const FIELD_KEYWORDS: Record<string, string[]> = {
  name: [
    'name',
    'full name',
    'fullname',
    'contact name',
    'contact',
    'first name',
    'person name',
    'lead name',
  ],
  email: ['email', 'email address', 'e-mail', 'mail', 'emailaddress', 'contact email'],
  company: [
    'company',
    'company name',
    'organization',
    'org',
    'business',
    'company_name',
    'account',
  ],
  phone: ['phone', 'phone number', 'mobile', 'telephone', 'cell', 'contact number', 'phone_number'],
  website: ['website', 'url', 'domain', 'web', 'site', 'company website', 'link'],
  linkedin: ['linkedin', 'linkedin url', 'profile', 'linkedin profile', 'linkedin_url'],
  industry: ['industry', 'sector', 'niche', 'vertical', 'business type'],
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

  const normalizedHeaders = headers.map((h) => h.trim().toLowerCase());

  for (const [targetField, keywords] of Object.entries(FIELD_KEYWORDS)) {
    let matchIndex = normalizedHeaders.findIndex((h) => keywords.includes(h));

    if (matchIndex === -1) {
      matchIndex = normalizedHeaders.findIndex((h) =>
        keywords.some((kw) => h.includes(kw) || kw.includes(h))
      );
    }

    if (matchIndex !== -1) {
      mapping[targetField] = headers[matchIndex];
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
  const rawJson = xlsx.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });

  if (!rawJson || rawJson.length === 0) {
    throw new Error('FILE_EMPTY: The uploaded file has no data rows.');
  }

  const headers = Object.keys(rawJson[0]);
  if (headers.length === 0) {
    throw new Error('INVALID_FORMAT: Could not detect valid headers in the file.');
  }

  const sampleRows = rawJson.slice(0, 10).map((row) => {
    const cleanedRow: Record<string, string> = {};
    headers.forEach((h) => {
      cleanedRow[h] = row[h] != null ? String(row[h]).trim() : '';
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
  const rawJson = xlsx.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });

  if (!rawJson || rawJson.length === 0) return [];
  const headers = Object.keys(rawJson[0]);

  return rawJson.map((row) => {
    const cleanedRow: Record<string, string> = {};
    headers.forEach((h) => {
      cleanedRow[h] = row[h] != null ? String(row[h]).trim() : '';
    });
    return cleanedRow;
  });
}
