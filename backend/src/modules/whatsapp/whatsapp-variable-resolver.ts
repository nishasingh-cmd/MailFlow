/**
 * Authoritative WhatsApp Template Variable Resolver
 *
 * Single source of truth for resolving positional template parameters ({{1}}, {{2}}, ...)
 * from campaign variable mappings against lead dataset columns.
 *
 * Used across:
 * 1. Campaign Live Preview
 * 2. Campaign Review / Pre-send Validation
 * 3. Queue Generation (DeliveryService / WhatsappService)
 * 4. Worker Execution
 * 5. Meta API Payload
 */

export interface VariableResolutionResult {
  /** Positional array for Meta Cloud API in exact {{1}}, {{2}}, {{3}} order */
  params: string[];
  /** Keyed map for preview substitution: { "1": "Rahul", "2": "Dr. Sharma" } */
  variables: Record<string, string>;
  /** Missing variable detections for pre-send warning / validation */
  missingVariables: Array<{ variableIndex: string; column: string }>;
  /** Whether all mapped variables have non-empty values for this lead */
  isValid: boolean;
}

export interface DetectedTemplateVariable {
  index: string;
  placeholder: string;
  contextSnippet: string;
}

/**
 * Detects all Meta positional placeholders ({{1}}, {{2}}, ...) from template body text
 * and extracts contextual snippets for clear UI mapping.
 */
export function detectTemplateVariables(bodyText: string): DetectedTemplateVariable[] {
  if (!bodyText) return [];

  const regex = /\{\{\s*(\d+)\s*\}\}/g;
  const foundIndices = new Set<number>();
  let match: RegExpExecArray | null;

  while ((match = regex.exec(bodyText)) !== null) {
    const num = parseInt(match[1], 10);
    if (!isNaN(num) && num > 0) {
      foundIndices.add(num);
    }
  }

  const sortedNums = Array.from(foundIndices).sort((a, b) => a - b);

  return sortedNums.map((num) => {
    const placeholder = `{{${num}}}`;
    const pos = bodyText.indexOf(placeholder);
    let contextSnippet = placeholder;

    if (pos !== -1) {
      const start = Math.max(0, pos - 15);
      const end = Math.min(bodyText.length, pos + placeholder.length + 15);
      const prefix = start > 0 ? '...' : '';
      const suffix = end < bodyText.length ? '...' : '';
      contextSnippet = `${prefix}${bodyText.substring(start, end).trim()}${suffix}`;
    }

    return {
      index: String(num),
      placeholder,
      contextSnippet,
    };
  });
}

export interface SenderBusinessContext {
  user?: {
    name?: string | null;
    email?: string | null;
    companyName?: string | null;
  } | null;
  businessProfile?: {
    businessName?: string | null;
    website?: string | null;
    industry?: string | null;
    location?: string | null;
    companySize?: string | null;
    businessDescription?: string | null;
    productsOrServices?: string | null;
    valueProposition?: string | null;
    targetAudience?: string | null;
    idealCustomerProfile?: string | null;
  } | null;
}

export function isBusinessProfileField(fieldName?: string | null): boolean {
  if (!fieldName) return false;
  const lower = fieldName.trim().toLowerCase();
  return (
    lower.startsWith('my ') ||
    lower.startsWith('[business]') ||
    lower.startsWith('business.') ||
    lower === 'sender name' ||
    lower === 'sender company' ||
    lower === 'business name' ||
    lower === 'business website'
  );
}

/**
 * Resolves values for all mapped variables from a lead and sender business context.
 * Authoritative: USER-SELECTED COLUMN / BUSINESS FIELD = AUTHORITATIVE SOURCE.
 */
export function resolveCampaignTemplateVariables(
  mapping: Record<string, string> | null | undefined,
  lead?: {
    name?: string | null;
    email?: string | null;
    company?: string | null;
    phone?: string | null;
    website?: string | null;
    linkedin?: string | null;
    industry?: string | null;
    customFields?: unknown;
  } | null,
  senderContext?: SenderBusinessContext | null
): VariableResolutionResult {
  const safeMapping = mapping && typeof mapping === 'object' ? mapping : {};

  // Extract all numerical keys and sort them ascending
  const rawKeys = Object.keys(safeMapping)
    .map((k) => parseInt(k, 10))
    .filter((k) => !isNaN(k) && k > 0)
    .sort((a, b) => a - b);

  const maxIndex = rawKeys.length > 0 ? Math.max(...rawKeys) : 0;

  const params: string[] = [];
  const variables: Record<string, string> = {};
  const missingVariables: Array<{ variableIndex: string; column: string }> = [];

  const custom = (
    lead?.customFields && typeof lead.customFields === 'object'
      ? (lead.customFields as Record<string, unknown>)
      : {}
  ) as Record<string, unknown>;

  for (let i = 1; i <= maxIndex; i++) {
    const varIdx = String(i);
    const targetColumn = safeMapping[varIdx];

    if (!targetColumn || !targetColumn.trim()) {
      params.push('');
      variables[varIdx] = '';
      missingVariables.push({ variableIndex: varIdx, column: targetColumn || `{{${varIdx}}}` });
      continue;
    }

    const colName = targetColumn.trim();
    const lowerCol = colName.toLowerCase();
    let resolvedVal: unknown = undefined;

    // 1. Check sender / business profile inputs (from initial client onboarding)
    if (
      lowerCol === 'my business name' ||
      lowerCol === 'business name' ||
      lowerCol === 'my company' ||
      lowerCol === 'sender company' ||
      lowerCol === 'business.businessname' ||
      lowerCol === '[business] business name'
    ) {
      resolvedVal =
        senderContext?.businessProfile?.businessName || senderContext?.user?.companyName || '';
    } else if (
      lowerCol === 'my name (sender)' ||
      lowerCol === 'my name' ||
      lowerCol === 'sender name' ||
      lowerCol === 'business.sendername' ||
      lowerCol === '[business] sender name'
    ) {
      resolvedVal = senderContext?.user?.name || '';
    } else if (
      lowerCol === 'my website' ||
      lowerCol === 'business website' ||
      lowerCol === 'sender website' ||
      lowerCol === 'business.website' ||
      lowerCol === '[business] website'
    ) {
      resolvedVal = senderContext?.businessProfile?.website || '';
    } else if (
      lowerCol === 'my products / services' ||
      lowerCol === 'products or services' ||
      lowerCol === 'products / services' ||
      lowerCol === 'business.productsservices' ||
      lowerCol === '[business] products / services'
    ) {
      resolvedVal = senderContext?.businessProfile?.productsOrServices || '';
    } else if (
      lowerCol === 'my industry' ||
      lowerCol === 'business industry' ||
      lowerCol === 'business.industry' ||
      lowerCol === '[business] industry'
    ) {
      resolvedVal = senderContext?.businessProfile?.industry || '';
    } else if (
      lowerCol === 'my value proposition' ||
      lowerCol === 'business.valueproposition' ||
      lowerCol === '[business] value proposition'
    ) {
      resolvedVal = senderContext?.businessProfile?.valueProposition || '';
    } else if (
      lowerCol === 'my business description' ||
      lowerCol === 'business.businessdescription'
    ) {
      resolvedVal = senderContext?.businessProfile?.businessDescription || '';
    } else if (lowerCol === 'my location' || lowerCol === 'business.location') {
      resolvedVal = senderContext?.businessProfile?.location || '';
    }

    // 2. Direct match on lead's customFields (preserving original uploaded spreadsheet column name)
    if (resolvedVal === undefined) {
      if (custom[colName] !== undefined && custom[colName] !== null) {
        resolvedVal = custom[colName];
      } else {
        // 3. Case-insensitive match on customFields
        const matchedKey = Object.keys(custom).find(
          (k) => k.toLowerCase() === lowerCol && !k.startsWith('_')
        );
        if (matchedKey && custom[matchedKey] !== undefined && custom[matchedKey] !== null) {
          resolvedVal = custom[matchedKey];
        }
      }
    }

    // 4. Fallback to standard CRM attributes if not found in customFields
    if (resolvedVal === undefined || resolvedVal === null || String(resolvedVal).trim() === '') {
      if (['name', 'contact name', 'lead name', 'full name', 'patient name'].includes(lowerCol)) {
        resolvedVal = lead?.name;
      } else if (['company', 'company name', 'organization', 'clinic name'].includes(lowerCol)) {
        resolvedVal = lead?.company;
      } else if (
        ['phone', 'phone number', 'mobile', 'mobile number', 'whatsapp'].includes(lowerCol)
      ) {
        resolvedVal = lead?.phone;
      } else if (['email', 'email address'].includes(lowerCol)) {
        if (lead?.email && !lead.email.includes('@internal.mailflow')) {
          resolvedVal = lead.email;
        }
      } else if (['website', 'website url', 'url', 'domain'].includes(lowerCol)) {
        resolvedVal = lead?.website;
      } else if (['linkedin', 'linkedin url', 'profile'].includes(lowerCol)) {
        resolvedVal = lead?.linkedin;
      } else if (['industry', 'sector', 'field', 'specialty'].includes(lowerCol)) {
        resolvedVal = lead?.industry;
      }
    }

    // 5. Clean and stringify
    const finalStr =
      resolvedVal !== undefined && resolvedVal !== null ? String(resolvedVal).trim() : '';

    if (!finalStr) {
      missingVariables.push({ variableIndex: varIdx, column: colName });
    }

    params.push(finalStr);
    variables[varIdx] = finalStr;
  }

  return {
    params,
    variables,
    missingVariables,
    isValid: missingVariables.length === 0,
  };
}
