import { EmailTemplateType, UserOutreachContext } from '@mailflow/shared';

export interface PromptContext {
  leadId?: string;
  leadName: string;
  leadEmail?: string;
  companyName: string;
  jobTitle?: string | null;
  companySummary?: string | null;
  industry?: string | null;
  products?: string[];
  services?: string[];
  painPoints?: string[];
  opportunities?: string[];
  targetAudience?: string | null;
  businessFocus?: string | null;
  companySize?: string | null;
  location?: string | null;
  personalizationInsights?: string | null;
  verifiedFacts?: string[];
  hypotheses?: string[];
  unknowns?: string[];
  sources?: Array<{ name: string; url?: string; type?: string; confidence?: string }>;
  template: EmailTemplateType;
  customInstructions?: string;
  userContext?: UserOutreachContext;
  regenerate?: boolean;
  regenSeed?: number;
  userApiKey?: string | null;
  userProvider?: 'OPENAI' | 'GEMINI' | null;
}

export class EmailPromptService {
  /**
   * Build structured prompt for complete AI Email Generation.
   * Enforces that verified lead research is the single source of truth.
   */
  static buildEmailGenerationPrompt(ctx: PromptContext): string {
    const senderName = ctx.userContext?.userName || 'Sales Specialist';
    const senderCompany = ctx.userContext?.userCompany || 'MailFlow';
    const senderProduct = ctx.userContext?.userProductService || 'AI Outreach Platform';

    const productsStr = ctx.products?.length ? ctx.products.join(', ') : 'Not explicitly listed';
    const servicesStr = ctx.services?.length ? ctx.services.join(', ') : 'Not explicitly listed';
    const painPointsStr = ctx.painPoints?.length
      ? ctx.painPoints.map((p) => `- [Hypothesis/Observed]: ${p}`).join('\n')
      : `- Standard outreach efficiency and personalization bottlenecks`;
    const oppsStr = ctx.opportunities?.length
      ? ctx.opportunities.map((o) => `- ${o}`).join('\n')
      : `- Helping ${ctx.companyName} engage prospects with tailored outreach`;

    const regenNotice = ctx.regenerate
      ? `\nREGENERATION NOTICE (Seed: ${ctx.regenSeed || Date.now()}):\nGenerate a distinct variation with a fresh subject line and phrasing while adhering 100% to the verified facts.\n`
      : '';

    return `You are generating ONE personalized B2B outreach email for ONE specific lead.
The supplied lead and lead-specific research are the single source of truth.
${regenNotice}
==================================================
VERIFIED LEAD & COMPANY RESEARCH (SOURCE OF TRUTH)
==================================================
- Lead ID: ${ctx.leadId || 'N/A'}
- Lead Name: ${ctx.leadName}
- Lead Job Title: ${ctx.jobTitle || 'Role not specified (DO NOT invent a job title)'}
- Target Company: ${ctx.companyName}
- Verified Industry: ${ctx.industry || 'Business Services (DO NOT assume Technology/Healthcare unless stated)'}
- Verified Company Summary: ${ctx.companySummary || 'Company operating in ' + (ctx.industry || 'its domain')}
- Products Offered: ${productsStr}
- Services Offered: ${servicesStr}
- Target Audience: ${ctx.targetAudience || 'Clients in their target market'}
- Key Business Focus: ${ctx.businessFocus || 'Delivering specialized solutions'}
- Location: ${ctx.location || 'Not specified'}
- Company Size: ${ctx.companySize || 'Not verified (DO NOT make company-size or scale assumptions)'}
- Personalization Insights: ${ctx.personalizationInsights || 'Focus on verified business focus and offerings'}

IDENTIFIED PAIN POINTS / HYPOTHESES:
${painPointsStr}

OUTREACH RELEVANCE / OPPORTUNITIES:
${oppsStr}

SENDER INFORMATION:
- Sender Name: ${senderName}
- Sender Company: ${senderCompany}
- Sender Offering: ${senderProduct}
- Approved Product Description: MailFlow helps teams research leads and create personalized outreach faster from one workflow.

EMAIL FRAMEWORK: ${ctx.template}
${ctx.customInstructions ? `SPECIAL CUSTOM DIRECTIVES: ${ctx.customInstructions}` : ''}

==================================================
STRICT FACTUAL GROUNDING RULES
==================================================
1. RESEARCH IS THE SOURCE OF TRUTH:
   - Use ONLY facts supported by the verified research above.
   - NEVER override the research with external model assumptions.
   - If the company is in Exhibition / Events, NEVER say Healthcare, Tech, or unrelated fields.
2. NO GENERIC SCALE OR SIZE CLAIMS:
   - DO NOT write "At your scale...", "Many teams at your scale...", "Your rapidly growing team...", or "As a leading enterprise..." unless verified in research.
3. NO UNSUPPORTED MAILFLOW CLAIMS:
   - DO NOT write "saving teams 15+ hours weekly", "10x ROI", "3x conversions", "guaranteed meetings", or "high-converting".
   - Use only safe, approved descriptions: "${senderCompany} helps teams research prospects and draft personalized outreach faster."
4. NO INVENTED DATES OR TIMES:
   - NEVER write "next Tuesday", "tomorrow", "next week", "Thursday at 2 PM", or specific meeting dates.
   - Use date-free CTAs: "Would you be open to a brief 10-minute chat to explore if this is relevant for your team?"
5. NO INVENTED JOB ROLES:
   - If lead job title is missing or unverified, do not guess (e.g. do NOT invent "Marketing Director" or "VP").
   - Greet simply as: "Hi ${ctx.leadName.split(' ')[0]},"
6. HYPOTHESES ARE NOT FACTS:
   - Frame pain points carefully without claiming "I know you are struggling with X".
7. WRITE NATURALLY:
   - Write a concise, natural, professional B2B outreach email (under 120 words).
   - Do NOT dump research verbatim.

==================================================
OUTPUT SCHEMA (STRICT JSON ONLY)
==================================================
Return ONLY valid JSON matching this schema:
{
  "leadId": "${ctx.leadId || ''}",
  "subjectSuggestions": [
    "Subject line 1 specifically mentioning ${ctx.companyName} or its domain",
    "Subject line 2 tailored to ${ctx.template}",
    "Subject line 3 relevant to ${ctx.companyName}",
    "Subject line 4 professional and concise",
    "Subject line 5 focused on collaboration/value"
  ],
  "selectedSubject": "Best subject line from suggestions",
  "greeting": "Hi ${ctx.leadName.split(' ')[0]},",
  "personalizationFact": "Exact verified fact from research used to personalize the intro",
  "valueProposition": "1-2 sentences on how ${senderCompany} helps teams research prospects and create personalized outreach",
  "cta": "Date-free call to action inviting a brief conversation",
  "closing": "Best regards,\\n${senderName}",
  "evidenceUsed": [
    "Field or quote from research supporting the personalization"
  ],
  "fullBody": "Complete email body combining greeting, intro, value proposition, cta, and closing"
}`;
  }

  /**
   * Build structured prompt for Subject Line generation only.
   */
  static buildSubjectLinesPrompt(ctx: PromptContext): string {
    return `Generate 5 creative, professional, non-spammy email subject line suggestions for pitching to ${ctx.leadName} at ${ctx.companyName}.

Context:
- Company: ${ctx.companyName}
- Verified Industry: ${ctx.industry || 'Business Services'}
- Template Focus: ${ctx.template}

Rules:
- Grounded strictly in the company name and verified industry.
- No spam triggers, no ALL CAPS, no deceptive claims.
- Return ONLY valid JSON matching:
{
  "subjectSuggestions": [
    "Subject 1",
    "Subject 2",
    "Subject 3",
    "Subject 4",
    "Subject 5"
  ]
}`;
  }
}
