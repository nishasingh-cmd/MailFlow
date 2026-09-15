/**
 * MailFlow — Email Validation Service
 * Pre-Send & Pre-Display Validation Layer
 *
 * Ensures generated emails are strictly grounded in lead-specific company research:
 * - Prevents hallucinated industries
 * - Blocks unapproved marketing claims (e.g. "15+ hours weekly", "10x", "high-converting")
 * - Blocks invented meeting dates (e.g. "next Tuesday", "Thursday at 2 PM")
 * - Blocks unsupported company-size / scale claims (e.g. "at your scale")
 * - Blocks invented employee job roles
 */

export interface ValidationContext {
  leadId: string;
  leadName: string;
  companyName: string;
  verifiedIndustry?: string | null;
  verifiedProductsServices?: string[];
  verifiedSummary?: string | null;
  verifiedCompanySize?: string | null;
  jobTitle?: string | null;
}

export interface ValidationResult {
  isValid: boolean;
  violations: string[];
  evidenceUsed: string[];
  repairedBody?: string;
  repairedSubject?: string;
}

// Common unrelated industry keywords to check against if not in research
const KNOWN_INDUSTRY_KEYWORDS: Record<string, string[]> = {
  healthcare: [
    'healthcare',
    'health tech',
    'healthtech',
    'medical',
    'hospital',
    'clinical',
    'pharmaceutical',
  ],
  fintech: ['fintech', 'banking', 'wealth management', 'crypto', 'blockchain'],
  real_estate: ['real estate', 'realtor', 'property management'],
  automotive: ['automotive', 'car dealership', 'automaker', 'vehicle manufacturing'],
  hospitality: ['hotel chain', 'restaurant management', 'food service'],
  aerospace: ['aerospace', 'aviation defense'],
};

// Disallowed unsupported marketing claims
const UNSUPPORTED_CLAIM_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  {
    pattern: /\b15\+\s*hours\s*(weekly|every\s*week|a\s*week)?\b/i,
    description: 'Unsupported claim: "15+ hours weekly"',
  },
  {
    pattern: /\b(10x|3x|5x)\s*(roi|conversions?|reply\s*rates?)?\b/i,
    description: 'Unsupported multiplier claim (e.g. 10x, 3x ROI)',
  },
  {
    pattern: /\bguaranteed\s*(responses?|meetings?|sales?|results?)\b/i,
    description: 'Unsupported guarantee claim',
  },
  {
    pattern: /\bhigh-converting\b/i,
    description: 'Unsupported marketing buzzword "high-converting"',
  },
  {
    pattern: /\bindustry-leading\b/i,
    description: 'Unsupported marketing buzzword "industry-leading"',
  },
];

// Disallowed invented dates & specific meeting times
const INVENTED_DATE_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  {
    pattern: /\bnext\s+(tuesday|monday|wednesday|thursday|friday|saturday|sunday)\b/i,
    description: 'Invented meeting day (e.g. "next Tuesday")',
  },
  {
    pattern: /\bthis\s+(tuesday|thursday|friday)\s+(afternoon|morning|at\s+\d+)?\b/i,
    description: 'Invented meeting day/time (e.g. "this Thursday afternoon")',
  },
  {
    pattern: /\btomorrow\s+(morning|afternoon|at\s+\d+)?\b/i,
    description: 'Invented date "tomorrow"',
  },
  {
    pattern: /\b(at\s+)?\d{1,2}\s*(am|pm)\b/i,
    description: 'Invented specific time of day (e.g. "at 2 PM")',
  },
  { pattern: /\bthursday\s+at\s+\d+/i, description: 'Invented meeting day and time' },
];

// Disallowed generic scale / size claims
const UNSUPPORTED_SCALE_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  {
    pattern: /\b(teams?\s+at\s+(your|[\w\s]+'?s?)\s*scale)\b/i,
    description: 'Unsupported scale claim ("teams at your scale")',
  },
  { pattern: /\bat\s+your\s+scale\b/i, description: 'Unsupported scale claim ("at your scale")' },
  {
    pattern: /\b(your\s+)?rapidly\s+growing\s+team\b/i,
    description: 'Unsupported growth claim ("rapidly growing team")',
  },
  {
    pattern: /\bas\s+a\s+leading\s+enterprise\b/i,
    description: 'Unsupported enterprise scale claim',
  },
  {
    pattern: /\byour\s+large\s+organization\b/i,
    description: 'Unsupported organization size claim',
  },
];

export class EmailValidationService {
  /**
   * Validate generated email subject and body against the prospect's verified research context.
   */
  static validateEmailContent(
    subject: string,
    body: string,
    ctx: ValidationContext
  ): ValidationResult {
    const violations: string[] = [];
    const evidenceUsed: string[] = [];
    const fullText = `${subject}\n${body}`.toLowerCase();

    // 1. Industry Consistency Check
    const verifiedIndustry = (ctx.verifiedIndustry || '').toLowerCase();
    const verifiedSummary = (ctx.verifiedSummary || '').toLowerCase();
    const verifiedProducts = (ctx.verifiedProductsServices || [])
      .map((p) => p.toLowerCase())
      .join(' ');
    const combinedVerifiedText = `${verifiedIndustry} ${verifiedSummary} ${verifiedProducts}`;

    for (const [, keywords] of Object.entries(KNOWN_INDUSTRY_KEYWORDS)) {
      const isActuallyInResearch = keywords.some((kw) => combinedVerifiedText.includes(kw));
      if (!isActuallyInResearch) {
        for (const kw of keywords) {
          // Check if email explicitly mentions this industry keyword
          const regex = new RegExp(`\\b${kw}\\b`, 'i');
          if (regex.test(fullText)) {
            violations.push(
              `Hallucinated industry detected: mentions "${kw}" which is not supported by verified research.`
            );
            break;
          }
        }
      }
    }

    // 2. Unsupported Claims Check
    for (const { pattern, description } of UNSUPPORTED_CLAIM_PATTERNS) {
      if (pattern.test(fullText)) {
        violations.push(description);
      }
    }

    // 3. Invented Dates Check
    for (const { pattern, description } of INVENTED_DATE_PATTERNS) {
      if (pattern.test(fullText)) {
        violations.push(description);
      }
    }

    // 4. Unsupported Scale Claims Check (unless research verified company size)
    const hasVerifiedSize = Boolean(
      ctx.verifiedCompanySize &&
      ctx.verifiedCompanySize.trim() &&
      !ctx.verifiedCompanySize.toLowerCase().includes('not verified') &&
      !ctx.verifiedCompanySize.toLowerCase().includes('unknown')
    );

    if (!hasVerifiedSize) {
      for (const { pattern, description } of UNSUPPORTED_SCALE_PATTERNS) {
        if (pattern.test(fullText)) {
          violations.push(description);
        }
      }
    }

    // 5. Invented Job Titles Check (if jobTitle not provided)
    if (!ctx.jobTitle || !ctx.jobTitle.trim()) {
      const inventedTitleRegex =
        /\b(as\s+(the\s+)?(marketing\s+director|vp\s+of|head\s+of|chief\s+executive|cto|cmo|ceo|managing\s+director))\b/i;
      if (inventedTitleRegex.test(fullText)) {
        violations.push('Invented job title/role detected when lead has no verified job title.');
      }
    }

    // 6. Evidence Identification
    if (ctx.verifiedIndustry && fullText.includes(ctx.verifiedIndustry.toLowerCase())) {
      evidenceUsed.push(`Industry: ${ctx.verifiedIndustry}`);
    }
    if (ctx.verifiedProductsServices && ctx.verifiedProductsServices.length > 0) {
      for (const prod of ctx.verifiedProductsServices) {
        if (fullText.includes(prod.toLowerCase())) {
          evidenceUsed.push(`Product/Service: ${prod}`);
        }
      }
    }
    if (ctx.companyName && fullText.includes(ctx.companyName.toLowerCase())) {
      evidenceUsed.push(`Company Name: ${ctx.companyName}`);
    }

    // Attempt safe repair if violations are cleanly removable
    let repairedBody = body;
    let repairedSubject = subject;

    if (violations.length > 0) {
      // Clean dates: replace "next Tuesday" / specific days with date-free alternative
      repairedBody = repairedBody
        .replace(
          /\bnext\s+(tuesday|monday|wednesday|thursday|friday|saturday|sunday)\b/gi,
          'sometime this week'
        )
        .replace(/\bthis\s+(tuesday|thursday|friday)\s+afternoon\b/gi, 'sometime this week')
        .replace(/\btomorrow\s+morning\b/gi, 'this week')
        .replace(/\btomorrow\b/gi, 'soon')
        .replace(/\bat\s+\d{1,2}\s*(am|pm)\b/gi, '')
        .replace(/\b15\+\s*hours\s*(weekly|every\s*week|a\s*week)?\b/gi, 'hours each week')
        .replace(/\bhigh-converting\s+/gi, '')
        .replace(/\bindustry-leading\s+/gi, '')
        .replace(
          /Many teams at [^.\n]+'s scale find it challenging to scale outbound messaging without losing deep account personalization\./gi,
          `Scaling outbound messaging while maintaining authentic personalization is a key priority for outreach teams.`
        )
        .replace(
          /Many teams at your scale face challenges with scaling outreach while maintaining authentic personalization\./gi,
          `Scaling outbound messaging while maintaining authentic personalization is a key priority for outreach teams.`
        )
        .replace(
          /At MailFlow, we built an AI-native engine that researches each lead and drafts high-converting outreach in seconds, saving teams 15\+ hours weekly\./gi,
          `MailFlow helps teams research leads and create personalized outreach faster from one workflow.`
        )
        .replace(/saving teams 15\+ hours weekly\./gi, 'streamlining the entire outreach workflow.')
        .replace(
          /Are you open to a brief 10-minute chat next Tuesday to explore if this fits [^?]+\?/gi,
          `Would you be open to a brief 10-minute chat to explore if this fits your current workflow?`
        )
        .replace(
          /Would you have 10 minutes next Tuesday for a brief intro call/gi,
          `Would you have 10 minutes for a brief intro call`
        );

      repairedSubject = repairedSubject
        .replace(/\bhigh-converting\s+/gi, '')
        .replace(/\b15\+\s*hours\b/gi, 'time');
    }

    return {
      isValid: violations.length === 0,
      violations,
      evidenceUsed,
      repairedBody,
      repairedSubject,
    };
  }
}
