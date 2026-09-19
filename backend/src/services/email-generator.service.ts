import { env } from '../config/env';
import { GeneratedEmailResult, GeneratedEmailSections } from '@mailflow/shared';
import { EmailPromptService, PromptContext } from './email-prompt.service';
import { EmailValidationService } from '../modules/email-generation/email-validation.service';

interface RawGeneratedEmailJSON {
  leadId?: string;
  subjectSuggestions?: string[];
  selectedSubject?: string;
  greeting?: string;
  introduction?: string;
  painPointAcknowledgement?: string;
  solutionIntroduction?: string;
  callToAction?: string;
  closing?: string;
  personalizationFact?: string;
  valueProposition?: string;
  cta?: string;
  evidenceUsed?: string[];
  fullBody?: string;
}

export class EmailGeneratorService {
  /**
   * Generate personalized email and subject line suggestions strictly grounded in research.
   */
  static async generateEmail(ctx: PromptContext): Promise<GeneratedEmailResult> {
    const prompt = EmailPromptService.buildEmailGenerationPrompt(ctx);
    let rawText = '';
    let providerName = '';

    const temperature = ctx.regenerate ? 0.65 : 0.25;

    // Resolve AI keys: Prefer user's configured settings key, fallback to env keys
    const geminiKey =
      ctx.userProvider === 'GEMINI' && ctx.userApiKey ? ctx.userApiKey : env.GEMINI_API_KEY;
    const openaiKey =
      ctx.userProvider === 'OPENAI' && ctx.userApiKey ? ctx.userApiKey : env.OPENAI_API_KEY;

    // 1. Try Gemini API if configured
    if (geminiKey) {
      try {
        rawText = await EmailGeneratorService.callGemini(prompt, temperature, geminiKey);
        providerName = 'Google Gemini AI';
      } catch (err) {
        console.warn(`[EMAIL_GEN] Gemini failed: ${(err as Error).message}. Trying fallback...`);
      }
    }

    // 2. Try OpenAI API if Gemini failed/unconfigured
    if (!rawText && openaiKey) {
      try {
        rawText = await EmailGeneratorService.callOpenAI(prompt, temperature, openaiKey);
        providerName = 'OpenAI GPT';
      } catch (err) {
        console.warn(`[EMAIL_GEN] OpenAI failed: ${(err as Error).message}. Trying fallback...`);
      }
    }

    // 3. Evidence-based grounded synthesis engine if external API unavailable
    if (!rawText) {
      return EmailGeneratorService.buildFallbackEmail(ctx);
    }

    return EmailGeneratorService.parseEmailResult(rawText, ctx, providerName, prompt);
  }

  /**
   * Generate 5 subject line suggestions only.
   */
  static async generateSubjectLines(ctx: PromptContext): Promise<string[]> {
    const prompt = EmailPromptService.buildSubjectLinesPrompt(ctx);
    let rawText = '';

    const geminiKey =
      ctx.userProvider === 'GEMINI' && ctx.userApiKey ? ctx.userApiKey : env.GEMINI_API_KEY;
    const openaiKey =
      ctx.userProvider === 'OPENAI' && ctx.userApiKey ? ctx.userApiKey : env.OPENAI_API_KEY;

    if (geminiKey) {
      try {
        rawText = await EmailGeneratorService.callGemini(prompt, 0.7, geminiKey);
      } catch (err) {
        console.warn('[EmailGenerator] Gemini subject call failed:', (err as Error).message);
      }
    }
    if (!rawText && openaiKey) {
      try {
        rawText = await EmailGeneratorService.callOpenAI(prompt, 0.7, openaiKey);
      } catch (err) {
        console.warn('[EmailGenerator] OpenAI subject call failed:', (err as Error).message);
      }
    }

    if (rawText) {
      try {
        const cleaned = rawText
          .replace(/```json\s*/gi, '')
          .replace(/```\s*/g, '')
          .trim();
        const parsed = JSON.parse(cleaned) as { subjectSuggestions?: string[] };
        if (Array.isArray(parsed.subjectSuggestions) && parsed.subjectSuggestions.length >= 3) {
          return parsed.subjectSuggestions;
        }
      } catch (err) {
        console.warn('[EmailGenerator] Failed to parse subject line JSON:', (err as Error).message);
      }
    }

    const industryClean = ctx.industry ? ` (${ctx.industry})` : '';
    return [
      `Quick idea for ${ctx.companyName}${industryClean}`,
      `Streamlining outreach for ${ctx.companyName}`,
      `Connecting with ${ctx.companyName}`,
      `Outreach collaboration for ${ctx.companyName}`,
      `Intro regarding ${ctx.companyName}'s growth initiatives`,
    ];
  }

  private static async callGemini(
    prompt: string,
    temperature = 0.25,
    apiKey: string
  ): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20_000);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature, maxOutputTokens: 1200 },
        }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`Gemini status ${res.status}`);
      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private static async callOpenAI(
    prompt: string,
    temperature = 0.25,
    apiKey: string
  ): Promise<string> {
    const url = 'https://api.openai.com/v1/chat/completions';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20_000);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature,
          max_tokens: 1200,
        }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`OpenAI status ${res.status}`);
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      return data?.choices?.[0]?.message?.content || '';
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private static parseEmailResult(
    rawText: string,
    ctx: PromptContext,
    _providerName: string,
    promptUsed: string
  ): GeneratedEmailResult {
    const cleaned = rawText
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    try {
      const parsed = JSON.parse(cleaned) as RawGeneratedEmailJSON;
      const firstName = ctx.leadName.split(' ')[0] || ctx.leadName;
      const senderName = ctx.userContext?.userName || 'Sales Specialist';
      const senderCompany = ctx.userContext?.userCompany || 'MailFlow';

      // Build structured sections
      const greeting = parsed.greeting || `Hi ${firstName},`;
      const introduction =
        parsed.introduction ||
        parsed.personalizationFact ||
        `I came across ${ctx.companyName}'s work in ${ctx.industry || 'your domain'} and wanted to connect directly.`;

      const valueProposition =
        parsed.valueProposition ||
        parsed.solutionIntroduction ||
        `${senderCompany} helps teams research leads and create personalized outreach faster from a single workflow.`;

      const cta =
        parsed.cta ||
        parsed.callToAction ||
        `Would you be open to a brief 10-minute conversation to explore if this fits your current workflow?`;

      const closing = parsed.closing || `Best regards,\n${senderName}`;

      let body =
        parsed.fullBody ||
        `${greeting}\n\n${introduction}\n\n${valueProposition}\n\n${cta}\n\n${closing}`;

      const subjects =
        Array.isArray(parsed.subjectSuggestions) && parsed.subjectSuggestions.length >= 3
          ? parsed.subjectSuggestions
          : [
              `Quick idea for ${ctx.companyName}`,
              `Outreach workflow for ${ctx.companyName}`,
              `Streamlining outreach at ${ctx.companyName}`,
              `Connecting with ${ctx.companyName}`,
              `Growth initiatives for ${ctx.companyName}`,
            ];

      let selectedSubject = parsed.selectedSubject || subjects[0];

      // Run Validation Layer
      const validation = EmailValidationService.validateEmailContent(selectedSubject, body, {
        leadId: ctx.leadId || '',
        leadName: ctx.leadName,
        companyName: ctx.companyName,
        verifiedIndustry: ctx.industry,
        verifiedProductsServices: ctx.products,
        verifiedSummary: ctx.companySummary,
        verifiedCompanySize: ctx.companySize,
        jobTitle: ctx.jobTitle,
      });

      if (!validation.isValid) {
        console.warn(`[EmailGenerator] Validation violations detected:`, validation.violations);
        if (validation.repairedBody && validation.repairedSubject) {
          body = validation.repairedBody;
          selectedSubject = validation.repairedSubject;
        }
      }

      const sections: GeneratedEmailSections = {
        greeting,
        introduction,
        painPointAcknowledgement: '',
        solutionIntroduction: valueProposition,
        callToAction: cta,
        closing,
      };

      return {
        subjectSuggestions: subjects,
        selectedSubject,
        body,
        sections,
        signature: `${senderName}\n${senderCompany}`,
        template: ctx.template,
        promptUsed,
      };
    } catch (_) {
      return EmailGeneratorService.buildFallbackEmail(ctx);
    }
  }

  /**
   * Evidence-based synthesis engine when external LLM API is unconfigured or unavailable.
   * Dynamically constructs a natural, professional email grounded strictly in ctx.
   */
  static buildFallbackEmail(ctx: PromptContext): GeneratedEmailResult {
    const senderName = ctx.userContext?.userName || 'Nisha Singh';
    const senderCompany = ctx.userContext?.userCompany || 'MailFlow';
    const firstName = ctx.leadName.split(' ')[0] || ctx.leadName;

    // Pick top verified product or service
    const primaryProduct = ctx.products?.[0] || ctx.services?.[0] || null;
    const secondaryProduct = ctx.products?.[1] || ctx.services?.[1] || null;
    const industryOrFocus = ctx.industry || ctx.businessFocus || 'your domain';

    const seed = ctx.regenSeed || Math.floor(Math.random() * 10000);
    const varIdx = Math.abs(seed) % 3;

    // Grounded introductions based on actual research facts
    let intro = '';
    if (primaryProduct && secondaryProduct) {
      const intros = [
        `I came across ${ctx.companyName}'s work across ${primaryProduct.toLowerCase()} and ${secondaryProduct.toLowerCase()}. Given your focus in ${industryOrFocus}, I wanted to reach out directly.`,
        `I was looking at ${ctx.companyName}'s work in ${primaryProduct.toLowerCase()} and ${secondaryProduct.toLowerCase()} across ${industryOrFocus}, and thought MailFlow could be relevant for your team.`,
        `Given ${ctx.companyName}'s expertise in ${primaryProduct.toLowerCase()} and ${secondaryProduct.toLowerCase()}, I wanted to connect regarding your outbound outreach workflow.`,
      ];
      intro = intros[varIdx % intros.length];
    } else if (primaryProduct) {
      const intros = [
        `I came across ${ctx.companyName}'s work in ${primaryProduct.toLowerCase()}. Given your presence in ${industryOrFocus}, I wanted to reach out directly.`,
        `I was reviewing ${ctx.companyName}'s capabilities in ${primaryProduct.toLowerCase()} and wanted to connect regarding your outreach initiatives.`,
        `Given ${ctx.companyName}'s focus on ${primaryProduct.toLowerCase()} in ${industryOrFocus}, I thought MailFlow might be relevant for your team.`,
      ];
      intro = intros[varIdx % intros.length];
    } else if (ctx.companySummary) {
      // Use concise verified summary snippet
      const cleanSummary = ctx.companySummary.replace(/\.$/, '').trim();
      intro = `I came across ${ctx.companyName} and was reading about your work: "${cleanSummary}". I wanted to connect directly regarding keeping outbound outreach personalized.`;
    } else {
      intro = `I came across ${ctx.companyName}'s work in ${industryOrFocus} and wanted to connect directly regarding keeping outbound outreach personalized.`;
    }

    // Template specific adjustments
    if (ctx.template === 'Partnership') {
      intro = `Given ${ctx.companyName}'s standing in ${industryOrFocus}, I wanted to reach out regarding a potential collaboration between ${senderCompany} and ${ctx.companyName}.`;
    } else if (ctx.template === 'Follow-up') {
      intro = `Circling back on my previous note regarding ${ctx.companyName}'s outreach workflow in ${industryOrFocus}.`;
    } else if (ctx.template === 'Product Demo') {
      intro = `I wanted to reach out regarding ${ctx.companyName}'s outreach initiatives in ${industryOrFocus} and share a quick demonstration of our platform.`;
    }

    // Grounded value proposition using approved MailFlow description
    const valueProps = [
      `${senderCompany} helps teams research leads and create personalized outreach faster from a single workflow.`,
      `We built ${senderCompany} to help teams automate lead research and draft personalized outbound messaging without manual bottlenecks.`,
      `${senderCompany} assists teams with lead intelligence and personalized communication so you can focus on conversations.`,
    ];
    const valueProp = valueProps[varIdx % valueProps.length];

    // Grounded date-free CTAs
    const ctas = [
      `Would you be open to a brief 10-minute conversation to explore if this fits ${ctx.companyName}'s current workflow?`,
      `Would you be open to a quick 10-minute chat sometime this week?`,
      `Let me know if you would be open to a brief conversation to see if this could be helpful for your team.`,
    ];
    let cta = ctas[varIdx % ctas.length];

    if (ctx.template === 'Product Demo') {
      cta = `Would you be open to a brief 10-minute walkthrough tailored to ${ctx.companyName}?`;
    } else if (ctx.template === 'Partnership') {
      cta = `Would you be open to exploring potential synergies over a brief introductory chat?`;
    }

    const greeting = `Hi ${firstName},`;
    const closing = `Best,\n${senderName}`;
    const body = `${greeting}\n\n${intro}\n\n${valueProp}\n\n${cta}\n\n${closing}`;

    const subjects = [
      `Quick idea for ${ctx.companyName}`,
      `Outreach workflow for ${ctx.companyName}`,
      `Streamlining outreach at ${ctx.companyName}`,
      `Connecting with ${ctx.companyName}`,
      `Growth initiatives for ${ctx.companyName}`,
    ];

    // Double-check with validation layer
    const validation = EmailValidationService.validateEmailContent(subjects[0], body, {
      leadId: ctx.leadId || '',
      leadName: ctx.leadName,
      companyName: ctx.companyName,
      verifiedIndustry: ctx.industry,
      verifiedProductsServices: ctx.products,
      verifiedSummary: ctx.companySummary,
      verifiedCompanySize: ctx.companySize,
      jobTitle: ctx.jobTitle,
    });

    const finalBody = validation.repairedBody || body;
    const finalSubject = validation.repairedSubject || subjects[0];

    const sections: GeneratedEmailSections = {
      greeting,
      introduction: intro,
      painPointAcknowledgement: '',
      solutionIntroduction: valueProp,
      callToAction: cta,
      closing,
    };

    return {
      subjectSuggestions: subjects,
      selectedSubject: finalSubject,
      body: finalBody,
      sections,
      signature: `${senderName}\n${senderCompany}`,
      template: ctx.template,
    };
  }
}
