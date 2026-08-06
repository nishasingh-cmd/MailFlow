import { EmailTemplateType, UserOutreachContext } from '@mailflow/shared';

export interface PromptContext {
  leadName: string;
  leadEmail?: string;
  companyName: string;
  companySummary?: string | null;
  industry?: string | null;
  products?: string[];
  services?: string[];
  painPoints?: string[];
  opportunities?: string[];
  companySize?: string | null;
  template: EmailTemplateType;
  customInstructions?: string;
  userContext?: UserOutreachContext;
  regenerate?: boolean;
  regenSeed?: number;
}

export class EmailPromptService {
  /**
   * Build structured prompt for complete AI Email Generation.
   */
  static buildEmailGenerationPrompt(ctx: PromptContext): string {
    const senderName = ctx.userContext?.userName || 'Sales Specialist';
    const senderCompany = ctx.userContext?.userCompany || 'MailFlow';
    const senderProduct = ctx.userContext?.userProductService || 'AI Outreach Automation Platform';

    const productsStr = ctx.products?.length ? ctx.products.join(', ') : 'N/A';
    const servicesStr = ctx.services?.length ? ctx.services.join(', ') : 'N/A';
    const painPointsStr = ctx.painPoints?.length
      ? ctx.painPoints.map((p) => `- ${p}`).join('\n')
      : `- Manual outreach workflow bottlenecks\n- Scaling outreach without losing personalization`;
    const oppsStr = ctx.opportunities?.length
      ? ctx.opportunities.map((o) => `- ${o}`).join('\n')
      : `- Automating B2B outreach with hyper-personalized intelligence`;

    const regenNotice = ctx.regenerate
      ? `\nREGENERATION VARIATION NOTICE (Seed: ${ctx.regenSeed || Date.now()}):\nThis is an explicit request to REGENERATE a completely NEW email version. You MUST generate distinct, fresh subject line suggestions and write a different value hook, intro phrasing, and CTA angle than standard output while keeping the core context intact.\n`
      : '';

    return `You are an elite B2B outbound strategist crafting high-converting, personalized cold outreach emails.
${regenNotice}
PROSPECT & COMPANY CONTEXT:
- Prospect Name: ${ctx.leadName}
- Target Company: ${ctx.companyName}
- Industry: ${ctx.industry || 'Technology'}
- Company Overview: ${ctx.companySummary || 'Leading organization in their sector.'}
- Company Size: ${ctx.companySize || 'Mid-Market'}
- Products Offered: ${productsStr}
- Services Offered: ${servicesStr}

IDENTIFIED PAIN POINTS FOR ${ctx.companyName}:
${painPointsStr}

OUTREACH OPPORTUNITIES FOR ${ctx.companyName}:
${oppsStr}

SENDER DETAILS:
- Sender Name: ${senderName}
- Sender Company: ${senderCompany}
- Sender Product/Service: ${senderProduct}

EMAIL TEMPLATE FRAMEWORK: ${ctx.template}
${ctx.customInstructions ? `SPECIAL CUSTOM INSTRUCTIONS: ${ctx.customInstructions}` : ''}

REQUIREMENTS:
1. Write a natural, concise, professional email tailored specifically for ${ctx.companyName} and ${ctx.leadName}.
2. Avoid generic corporate buzzwords, overly promotional language, or robotic phrasing.
3. Structure the email into clear components: Greeting, Personalised Introduction, Pain-point Acknowledgement, Solution Introduction, Call to Action, and Closing.
4. Provide 5 creative, distinct subject line suggestions.
5. Return ONLY a valid JSON object with no markdown surrounding it, matching this exact schema:

{
  "subjectSuggestions": [
    "Quick idea for ${ctx.companyName}",
    "Helping ${ctx.companyName} streamline outreach",
    "Reducing manual sales work at ${ctx.companyName}",
    "AI workflow for ${ctx.companyName}'s sales team",
    "Streamlining ${ctx.companyName}'s growth pipeline"
  ],
  "selectedSubject": "Quick idea for ${ctx.companyName}",
  "greeting": "Hi ${ctx.leadName},",
  "introduction": "I came across ${ctx.companyName}'s work in ${ctx.industry || 'your industry'} and was impressed by your team's positioning.",
  "painPointAcknowledgement": "Many teams at your scale face challenges with scaling outreach while maintaining authentic personalization.",
  "solutionIntroduction": "At ${senderCompany}, we built ${senderProduct} to solve this exact problem by automating research and email generation.",
  "callToAction": "Would you be open to a brief 10-minute chat next Tuesday to explore if this fits ${ctx.companyName}'s current workflow?",
  "closing": "Best regards,\\n${senderName}",
  "fullBody": "Hi ${ctx.leadName},\\n\\nI came across ${ctx.companyName}'s work in ${ctx.industry || 'your industry'} and was impressed by your team's positioning.\\n\\nMany teams at your scale face challenges with scaling outreach while maintaining authentic personalization.\\n\\nAt ${senderCompany}, we built ${senderProduct} to solve this exact problem by automating research and email generation.\\n\\nWould you be open to a brief 10-minute chat next Tuesday to explore if this fits ${ctx.companyName}'s current workflow?\\n\\nBest regards,\\n${senderName}"
}`;
  }

  /**
   * Build structured prompt for Subject Line generation only.
   */
  static buildSubjectLinesPrompt(ctx: PromptContext): string {
    return `Generate 5 creative, professional, non-spammy email subject line suggestions for pitching to ${ctx.leadName} at ${ctx.companyName}.

Context:
- Company: ${ctx.companyName}
- Industry: ${ctx.industry || 'Technology'}
- Template Focus: ${ctx.template}

Return ONLY a valid JSON object:
{
  "subjectSuggestions": [
    "Quick idea for ${ctx.companyName}",
    "Helping ${ctx.companyName} automate outreach",
    "Reducing manual sales work at ${ctx.companyName}",
    "AI workflow for ${ctx.companyName}'s growth team",
    "Ideas for ${ctx.companyName}'s Q3 targets"
  ]
}`;
  }
}
