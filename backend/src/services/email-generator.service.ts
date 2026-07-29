/**
 * MailFlow — AI Email Generator Engine
 * Phase 7: AI Email Generation
 *
 * Multi-provider execution engine (Google Gemini API, OpenAI GPT, with Intelligent Fallback).
 * Generates personalized cold outreach emails and subject line suggestions based on research.
 */
import { env } from '../config/env';
import { GeneratedEmailResult, GeneratedEmailSections } from '@mailflow/shared';
import { EmailPromptService, PromptContext } from './email-prompt.service';

interface RawGeneratedEmailJSON {
  subjectSuggestions?: string[];
  selectedSubject?: string;
  greeting?: string;
  introduction?: string;
  painPointAcknowledgement?: string;
  solutionIntroduction?: string;
  callToAction?: string;
  closing?: string;
  fullBody?: string;
}

export class EmailGeneratorService {
  /**
   * Generate personalized email and subject line suggestions.
   */
  static async generateEmail(ctx: PromptContext): Promise<GeneratedEmailResult> {
    const prompt = EmailPromptService.buildEmailGenerationPrompt(ctx);
    let rawText = '';
    let providerName = '';

    // 1. Try Gemini API if configured
    if (env.GEMINI_API_KEY) {
      try {
        rawText = await EmailGeneratorService.callGemini(prompt);
        providerName = 'Google Gemini AI';
      } catch (err) {
        console.warn(`[EMAIL_GEN] Gemini failed: ${(err as Error).message}. Trying fallback...`);
      }
    }

    // 2. Try OpenAI API if Gemini failed/unconfigured
    if (!rawText && env.OPENAI_API_KEY) {
      try {
        rawText = await EmailGeneratorService.callOpenAI(prompt);
        providerName = 'OpenAI GPT';
      } catch (err) {
        console.warn(`[EMAIL_GEN] OpenAI failed: ${(err as Error).message}. Trying fallback...`);
      }
    }

    // 3. Intelligent fallback engine if API unavailable
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

    if (env.GEMINI_API_KEY) {
      try {
        rawText = await EmailGeneratorService.callGemini(prompt);
      } catch (err) {
        console.warn('[EmailGenerator] Gemini subject call failed:', (err as Error).message);
      }
    }
    if (!rawText && env.OPENAI_API_KEY) {
      try {
        rawText = await EmailGeneratorService.callOpenAI(prompt);
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

    return [
      `Quick idea for ${ctx.companyName}`,
      `Helping ${ctx.companyName} automate outreach`,
      `Reducing manual sales work at ${ctx.companyName}`,
      `AI workflow for ${ctx.companyName}'s sales team`,
      `Outreach strategy for ${ctx.companyName}`,
    ];
  }

  private static async callGemini(prompt: string): Promise<string> {
    const apiKey = env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20_000);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1200 },
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

  private static async callOpenAI(prompt: string): Promise<string> {
    const apiKey = env.OPENAI_API_KEY;
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
          temperature: 0.3,
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
      const sections: GeneratedEmailSections = {
        greeting: parsed.greeting || `Hi ${ctx.leadName},`,
        introduction:
          parsed.introduction ||
          `I came across ${ctx.companyName}'s work in ${ctx.industry || 'your industry'} and was impressed by your market positioning.`,
        painPointAcknowledgement:
          parsed.painPointAcknowledgement ||
          `Many teams at your scale face challenges with scaling outreach while maintaining authentic personalization.`,
        solutionIntroduction:
          parsed.solutionIntroduction ||
          `At ${ctx.userContext?.userCompany || 'MailFlow'}, we built ${ctx.userContext?.userProductService || 'our platform'} to address this exact bottleneck.`,
        callToAction:
          parsed.callToAction ||
          `Would you be open to a quick 10-minute chat next Tuesday to see if this fits ${ctx.companyName}'s workflow?`,
        closing:
          parsed.closing || `Best regards,\n${ctx.userContext?.userName || 'Sales Specialist'}`,
      };

      const subjects =
        Array.isArray(parsed.subjectSuggestions) && parsed.subjectSuggestions.length >= 3
          ? parsed.subjectSuggestions
          : [
              `Quick idea for ${ctx.companyName}`,
              `Helping ${ctx.companyName} automate outreach`,
              `Reducing manual sales work at ${ctx.companyName}`,
              `AI workflow for ${ctx.companyName}'s sales team`,
              `Outreach strategy for ${ctx.companyName}`,
            ];

      const selectedSubject = parsed.selectedSubject || subjects[0];
      const body =
        parsed.fullBody ||
        `${sections.greeting}\n\n${sections.introduction}\n\n${sections.painPointAcknowledgement}\n\n${sections.solutionIntroduction}\n\n${sections.callToAction}\n\n${sections.closing}`;

      return {
        subjectSuggestions: subjects,
        selectedSubject,
        body,
        sections,
        signature: `${ctx.userContext?.userName || 'Sales Specialist'}\n${ctx.userContext?.userCompany || 'MailFlow'}`,
        template: ctx.template,
        promptUsed,
      };
    } catch (_) {
      return EmailGeneratorService.buildFallbackEmail(ctx);
    }
  }

  private static buildFallbackEmail(ctx: PromptContext): GeneratedEmailResult {
    const senderName = ctx.userContext?.userName || 'Sales Specialist';
    const senderCompany = ctx.userContext?.userCompany || 'MailFlow';
    const senderProduct = ctx.userContext?.userProductService || 'AI Outreach Automation Platform';

    let intro = `I came across ${ctx.companyName}'s work in ${ctx.industry || 'your industry'} and was impressed by your team's positioning.`;
    let pain = `Many growth-stage teams face operational hurdles with scaling outbound outreach while keeping communication authentic.`;
    let solution = `At ${senderCompany}, our ${senderProduct} provides automated company intelligence and personalized messaging to solve this exact problem.`;
    let cta = `Would you have 10 minutes next Tuesday for a brief intro call to explore if this fits ${ctx.companyName}'s workflow?`;

    if (ctx.template === 'Follow-up') {
      intro = `I wanted to follow up on my previous message regarding ${ctx.companyName}'s outbound strategy.`;
      pain = `I know how busy things get when scaling operations and managing lead pipelines.`;
      solution = `We've recently helped teams similar to ${ctx.companyName} reduce manual outreach effort by over 60%.`;
      cta = `Do you have 5 minutes later this week to reconnect?`;
    } else if (ctx.template === 'Partnership') {
      intro = `I'm reaching out because I see a great opportunity for collaboration between ${senderCompany} and ${ctx.companyName}.`;
      pain = `Combining our AI outreach infrastructure with ${ctx.companyName}'s domain leadership could unlock substantial synergy for both teams.`;
      solution = `Our platform allows seamless integration for automated lead research and communication workflows.`;
      cta = `Would you be open to exploring a potential partnership next week?`;
    } else if (ctx.template === 'Product Demo') {
      intro = `I'm reaching out to give ${ctx.companyName} an exclusive preview of our new ${senderProduct}.`;
      pain = `Manual lead research and copy-pasting outbound emails often drains precious sales bandwidth.`;
      solution = `${senderCompany} automates 6-step company research and personalized email drafting in seconds.`;
      cta = `Would you like a quick 10-minute live demo this Thursday?`;
    }

    const sections: GeneratedEmailSections = {
      greeting: `Hi ${ctx.leadName},`,
      introduction: intro,
      painPointAcknowledgement: pain,
      solutionIntroduction: solution,
      callToAction: cta,
      closing: `Best regards,\n${senderName}`,
    };

    const subjects = [
      `Quick idea for ${ctx.companyName}`,
      `Helping ${ctx.companyName} automate outreach`,
      `Reducing manual sales work at ${ctx.companyName}`,
      `AI workflow for ${ctx.companyName}'s sales team`,
      `Outreach strategy for ${ctx.companyName}`,
    ];

    const body = `${sections.greeting}\n\n${sections.introduction}\n\n${sections.painPointAcknowledgement}\n\n${sections.solutionIntroduction}\n\n${sections.callToAction}\n\n${sections.closing}`;

    return {
      subjectSuggestions: subjects,
      selectedSubject: subjects[0],
      body,
      sections,
      signature: `${senderName}\n${senderCompany}`,
      template: ctx.template,
    };
  }
}
