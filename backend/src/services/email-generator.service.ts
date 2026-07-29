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
    console.log(
      `[EmailGenerator] Service generating email for ${ctx.leadName} (${ctx.companyName}). Regenerate: ${!!ctx.regenerate}`
    );
    const prompt = EmailPromptService.buildEmailGenerationPrompt(ctx);
    let rawText = '';
    let providerName = '';

    const temperature = ctx.regenerate ? 0.75 : 0.35;

    // 1. Try Gemini API if configured
    if (env.GEMINI_API_KEY) {
      try {
        rawText = await EmailGeneratorService.callGemini(prompt, temperature);
        providerName = 'Google Gemini AI';
      } catch (err) {
        console.warn(`[EMAIL_GEN] Gemini failed: ${(err as Error).message}. Trying fallback...`);
      }
    }

    // 2. Try OpenAI API if Gemini failed/unconfigured
    if (!rawText && env.OPENAI_API_KEY) {
      try {
        rawText = await EmailGeneratorService.callOpenAI(prompt, temperature);
        providerName = 'OpenAI GPT';
      } catch (err) {
        console.warn(`[EMAIL_GEN] OpenAI failed: ${(err as Error).message}. Trying fallback...`);
      }
    }

    // 3. Intelligent fallback engine if API unavailable
    if (!rawText) {
      console.log(`[EmailGenerator] Using multi-variation fallback engine.`);
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
        rawText = await EmailGeneratorService.callGemini(prompt, 0.7);
      } catch (err) {
        console.warn('[EmailGenerator] Gemini subject call failed:', (err as Error).message);
      }
    }
    if (!rawText && env.OPENAI_API_KEY) {
      try {
        rawText = await EmailGeneratorService.callOpenAI(prompt, 0.7);
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

  private static async callGemini(prompt: string, temperature = 0.35): Promise<string> {
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

  private static async callOpenAI(prompt: string, temperature = 0.35): Promise<string> {
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

    const seed = ctx.regenSeed || Math.floor(Math.random() * 10000);
    const varIdx = Math.abs(seed) % 4;

    const intros = [
      `I came across ${ctx.companyName}'s work in ${ctx.industry || 'your industry'} and was impressed by your team's positioning.`,
      `I've been following ${ctx.companyName}'s growth trajectory in ${ctx.industry || 'the sector'} and wanted to reach out directly.`,
      `Noticeably, ${ctx.companyName} has been making strong strides in ${ctx.industry || 'your field'}, which caught my attention.`,
      `Reaching out as I see significant potential for ${ctx.companyName} to elevate your current outbound outreach workflow.`,
    ];

    const painPoints = [
      `Many growth-stage teams face operational hurdles with scaling outbound outreach while keeping communication authentic.`,
      `Scaling personalized outreach across multiple decision-makers often creates severe manual bottlenecks for sales teams.`,
      `Balancing high lead volume with tailored individual messaging is a common struggle for expanding organizations.`,
      `Managing lead intelligence manually can drain sales efficiency and slow down campaign momentum.`,
    ];

    const solutions = [
      `At ${senderCompany}, our ${senderProduct} provides automated company intelligence and personalized messaging to solve this exact problem.`,
      `With ${senderCompany}, teams use our ${senderProduct} to automate lead research and draft hyper-personalized emails in seconds.`,
      `${senderCompany}'s ${senderProduct} eliminates manual research friction while maintaining 100% human-touch messaging quality.`,
      `Our solution at ${senderCompany} automates the heavy lifting of lead research, enabling your team to focus on closing deals.`,
    ];

    const ctas = [
      `Would you have 10 minutes next Tuesday for a brief intro call to explore if this fits ${ctx.companyName}'s workflow?`,
      `Are you open to a quick 5-minute preview next week to see how this works for ${ctx.companyName}?`,
      `Would Thursday at 2 PM work for a brief 10-minute demonstration tailored to ${ctx.companyName}?`,
      `If this aligns with your Q3 priorities, could we schedule a quick 10-minute discovery chat?`,
    ];

    if (ctx.template === 'Follow-up') {
      intros[0] = `I wanted to follow up on my previous message regarding ${ctx.companyName}'s outbound strategy.`;
      intros[1] = `Following up on my note from last week about streamlining ${ctx.companyName}'s lead research.`;
    } else if (ctx.template === 'Partnership') {
      intros[0] = `I'm reaching out because I see a great opportunity for collaboration between ${senderCompany} and ${ctx.companyName}.`;
      intros[1] = `Exploring potential synergies between ${senderCompany} and ${ctx.companyName} prompted me to write.`;
    } else if (ctx.template === 'Product Demo') {
      intros[0] = `I'm reaching out to give ${ctx.companyName} an exclusive preview of our new ${senderProduct}.`;
      intros[1] = `Would love to share a short 10-minute live demonstration of ${senderProduct} built for ${ctx.companyName}.`;
    }

    const sections: GeneratedEmailSections = {
      greeting: `Hi ${ctx.leadName},`,
      introduction: intros[varIdx % intros.length],
      painPointAcknowledgement: painPoints[varIdx % painPoints.length],
      solutionIntroduction: solutions[varIdx % solutions.length],
      callToAction: ctas[varIdx % ctas.length],
      closing: `Best regards,\n${senderName}`,
    };

    const subjectPools = [
      [
        `Quick idea for ${ctx.companyName}`,
        `Helping ${ctx.companyName} automate outreach`,
        `Reducing manual sales work at ${ctx.companyName}`,
        `AI workflow for ${ctx.companyName}'s sales team`,
        `Outreach strategy for ${ctx.companyName}`,
      ],
      [
        `Idea for ${ctx.companyName}'s outreach`,
        `Streamlining ${ctx.companyName}'s growth pipeline`,
        `Automating sales research for ${ctx.companyName}`,
        `Quick question regarding ${ctx.companyName}`,
        `Scaling ${ctx.companyName}'s outbound workflow`,
      ],
      [
        `New approach for ${ctx.companyName}`,
        `AI intelligence for ${ctx.companyName}'s team`,
        `Outreach efficiency at ${ctx.companyName}`,
        `Quick thought for ${ctx.leadName} @ ${ctx.companyName}`,
        `Optimizing lead engagement at ${ctx.companyName}`,
      ],
      [
        `Partnership idea for ${ctx.companyName}`,
        `Accelerating ${ctx.companyName}'s pipeline`,
        `Modernizing outreach for ${ctx.companyName}`,
        `Brief note for ${ctx.leadName}`,
        `${ctx.companyName} + ${senderCompany} workflow`,
      ],
    ];

    const subjects = subjectPools[varIdx % subjectPools.length];
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
