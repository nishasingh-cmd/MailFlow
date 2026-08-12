import { PrismaClient } from '@prisma/client';
import { env } from '../../config/env';
import { personalizeText } from '../../utils/personalization';

const prisma = new PrismaClient();

export class WhatsappGeneratorService {
  private static async callGemini(prompt: string): Promise<string> {
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) return '';

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15_000);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 800 },
        }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`Gemini status ${res.status}`);
      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch {
      return '';
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Generate personalized AI WhatsApp message for a lead
   */
  static async generateMessage(
    userId: string,
    leadId: string,
    objective?: string,
    customCta?: string
  ) {
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, userId },
      include: {
        companyRef: {
          include: { research: true },
        },
      },
    });

    if (!lead) throw new Error('LEAD_NOT_FOUND');

    const companyName = lead.company || lead.companyRef?.name || 'your company';
    const industry = lead.industry || lead.companyRef?.industry || 'your industry';
    const phone = lead.phone || '—';

    let painPointsStr = '';
    if (Array.isArray(lead.companyRef?.research?.painPoints)) {
      painPointsStr = (lead.companyRef?.research?.painPoints as string[]).join(', ');
    }

    const ctaText = customCta || 'Would you be open to a brief 5-min chat this week?';
    const campaignObjective = objective || 'introductory outreach and value proposition';

    if (env.GEMINI_API_KEY) {
      const prompt = `You are a professional B2B outreach specialist. Write a concise, natural, and highly engaging WhatsApp message for a prospect.

PROSPECT DETAILS:
- Name: ${lead.name}
- Company: ${companyName}
- Industry: ${industry}
- Key Challenges / Pain Points: ${painPointsStr || 'Scaling operations and workflow efficiency'}

OUTREACH GOAL:
- Objective: ${campaignObjective}
- Call to Action (CTA): ${ctaText}

REQUIREMENTS:
1. Must be under 800 characters (WhatsApp optimized format).
2. Sounds warm, natural, and conversational (not stiff or robotic).
3. Strictly NO spammy sales jargon ("FREE", "ACT NOW", "GUARANTEED").
4. Mentions prospect's name (${lead.name.split(' ')[0]}) and company name (${companyName}).
5. Includes bullet points or short paragraphs for mobile readability.
6. Ends with the requested call to action.

Return ONLY the exact WhatsApp message text with appropriate emojis. No markdown commentary or extra wrapping.`;

      const generatedText = await this.callGemini(prompt);
      if (generatedText.trim()) {
        return {
          leadId: lead.id,
          leadName: lead.name,
          companyName,
          phone,
          message: generatedText.trim(),
          characterCount: generatedText.trim().length,
        };
      }
    }

    // High-quality fallback template
    const firstName = lead.name.split(' ')[0] || 'there';
    const template = `Hi ${firstName} 👋 Hope you're having a great week!

I came across ${companyName} in the ${industry} space and was really impressed by your team's work.

We've been helping leaders in ${industry} solve challenges around ${painPointsStr || 'operational efficiency and client acquisition'}.

${ctaText}`;

    const personalized = personalizeText(template, lead);

    return {
      leadId: lead.id,
      leadName: lead.name,
      companyName,
      phone,
      message: personalized,
      characterCount: personalized.length,
    };
  }

  /**
   * Generate AI-personalized template variable values ({{1}}, {{2}}, {{3}}) for approved Meta WhatsApp templates.
   * Maps variables into approved template structure without modifying template body text.
   */
  static async generateTemplateVariables(
    userId: string,
    leadId: string,
    templateName?: string,
    templateBodyText?: string
  ) {
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, userId },
      include: {
        companyRef: {
          include: { research: true },
        },
      },
    });

    if (!lead) throw new Error('LEAD_NOT_FOUND');

    const activeTemplateName =
      templateName || env.WHATSAPP_DEFAULT_TEMPLATE_NAME || 'cold_outreach';
    const activeTemplateText =
      templateBodyText ||
      'Hello {{1}},\n\nI came across {{2}} and noticed your work in {{3}}.\n\nI’m reaching out from MailFlow. We help healthcare practices build a stronger digital presence and improve patient outreach.\n\nWould you be available for a brief conversation this week?';

    const firstName = lead.name ? lead.name.split(' ')[0] : 'there';
    const companyName = lead.company || lead.companyRef?.name || 'your company';
    const specialtyOrIndustry = lead.industry || lead.companyRef?.industry || 'your field';
    const phone = lead.phone || '—';

    let variables: Record<string, string> = {
      '1': firstName,
      '2': companyName,
      '3': specialtyOrIndustry,
    };

    if (env.GEMINI_API_KEY) {
      let painPointsStr = '';
      if (Array.isArray(lead.companyRef?.research?.painPoints)) {
        painPointsStr = (lead.companyRef?.research?.painPoints as string[]).join(', ');
      }

      const prompt = `You are a B2B sales personalization AI. Your task is to extract exact, concise values for WhatsApp template variables.

PROSPECT DATA:
- Full Name: ${lead.name}
- First Name: ${firstName}
- Company/Clinic Name: ${companyName}
- Industry/Specialty: ${specialtyOrIndustry}
- Research Highlights / Pain Points: ${painPointsStr || 'Workflow efficiency & patient outreach'}

TEMPLATE STRUCTURE:
"${activeTemplateText}"

INSTRUCTIONS:
1. Provide values for template placeholders {{1}}, {{2}}, {{3}}.
2. {{1}} = First Name or Title + Name (e.g. "${firstName}")
3. {{2}} = Company or Clinic Name (e.g. "${companyName}")
4. {{3}} = Relevant Specialty or Field (e.g. "${specialtyOrIndustry}")
5. Keep values short, professional, and factual. Never invent statistics or fake claims.
6. Return ONLY valid JSON in this exact structure:
{
  "variables": {
    "1": "value1",
    "2": "value2",
    "3": "value3"
  }
}`;

      try {
        const rawJsonStr = await this.callGemini(prompt);
        if (rawJsonStr) {
          const cleanedJson = rawJsonStr
            .replace(/```json/gi, '')
            .replace(/```/g, '')
            .trim();
          const parsed = JSON.parse(cleanedJson) as { variables?: Record<string, string> };
          if (parsed?.variables && typeof parsed.variables === 'object') {
            variables = {
              '1': parsed.variables['1'] || firstName,
              '2': parsed.variables['2'] || companyName,
              '3': parsed.variables['3'] || specialtyOrIndustry,
            };
          }
        }
      } catch (err) {
        console.warn(`[WhatsappGeneratorService] AI variable extraction fallback triggered:`, err);
      }
    }

    // Convert variables object into ordered parameter array [param1, param2, param3]
    const templateParams: string[] = [
      variables['1'] || firstName,
      variables['2'] || companyName,
      variables['3'] || specialtyOrIndustry,
    ];

    // Build resolved preview text by substituting variables into template structure
    let previewText = activeTemplateText;
    Object.entries(variables).forEach(([key, val]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
      previewText = previewText.replace(regex, val);
    });

    return {
      leadId: lead.id,
      leadName: lead.name,
      companyName,
      phone,
      templateName: activeTemplateName,
      templateLang: 'en',
      variables,
      templateParams,
      previewText,
    };
  }
}
