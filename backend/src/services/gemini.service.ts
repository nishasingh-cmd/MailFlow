/**
 * MailFlow — Gemini AI Service
 * Phase 6: AI Company Research
 *
 * Calls Google Gemini REST API to generate structured company intelligence.
 * Uses gemini-1.5-flash (free tier, fast inference).
 */
import { env } from '../config/env';

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export interface CompanyIntelligence {
  industry: string;
  description: string;
  products: string[];
  services: string[];
  headquarters: string;
  companySize: string;
  targetCustomers: string;
  techStack: string[];
  summary: string;
  painPoints: string[];
  opportunities: string[];
  detectedWebsite: string;
}

/**
 * Build the structured prompt for company research
 */
function buildResearchPrompt(companyName: string, existingWebsite?: string | null): string {
  const websiteHint = existingWebsite ? `Known website: ${existingWebsite}` : '';

  return `You are a B2B market intelligence analyst. Research the company "${companyName}" and return a detailed JSON object.

${websiteHint}

Return ONLY a valid JSON object (no markdown, no explanation) with exactly these fields:

{
  "industry": "Primary industry sector (string)",
  "description": "2-3 sentence business description (string)",
  "products": ["Product 1", "Product 2"] (array of strings, max 6),
  "services": ["Service 1", "Service 2"] (array of strings, max 6),
  "headquarters": "City, Country (string)",
  "companySize": "Startup / SMB / Mid-Market / Enterprise / Unknown (string)",
  "targetCustomers": "Who their ideal customers are (string)",
  "techStack": ["Tech 1", "Tech 2"] (array of known public technologies, max 8),
  "summary": "100-150 word AI summary of what the company does, their market positioning, main offerings, and business focus (string)",
  "painPoints": [
    "Likely pain point 1 (e.g. scaling customer support)",
    "Likely pain point 2",
    "Likely pain point 3",
    "Likely pain point 4",
    "Likely pain point 5"
  ],
  "opportunities": [
    "Outreach opportunity 1 (e.g. AI-powered support automation)",
    "Outreach opportunity 2",
    "Outreach opportunity 3",
    "Outreach opportunity 4"
  ],
  "detectedWebsite": "Official website URL (string, e.g. https://example.com, or empty string if unknown)"
}

If information is unavailable, use empty strings or empty arrays. Never return null. Always return valid JSON.`;
}

/**
 * Parse Gemini response — extract the JSON content from text output
 */
function parseGeminiResponse(responseText: string): CompanyIntelligence {
  // Strip markdown code fences if present
  const cleaned = responseText
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as Partial<CompanyIntelligence>;

    return {
      industry: parsed.industry ?? '',
      description: parsed.description ?? '',
      products: Array.isArray(parsed.products) ? parsed.products : [],
      services: Array.isArray(parsed.services) ? parsed.services : [],
      headquarters: parsed.headquarters ?? '',
      companySize: parsed.companySize ?? '',
      targetCustomers: parsed.targetCustomers ?? '',
      techStack: Array.isArray(parsed.techStack) ? parsed.techStack : [],
      summary: parsed.summary ?? '',
      painPoints: Array.isArray(parsed.painPoints) ? parsed.painPoints : [],
      opportunities: Array.isArray(parsed.opportunities) ? parsed.opportunities : [],
      detectedWebsite: parsed.detectedWebsite ?? '',
    };
  } catch {
    throw new Error(`GEMINI_PARSE_ERROR: Failed to parse AI response as JSON`);
  }
}

/**
 * Call Gemini API with a text prompt, returns raw text response
 */
async function callGeminiRaw(prompt: string): Promise<string> {
  const apiKey = env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY not configured. Add GEMINI_API_KEY to backend/.env to enable AI research.'
    );
  }

  const url = `${GEMINI_API_URL}?key=${apiKey}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000); // 30s timeout

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      throw new Error(
        `GEMINI_API_ERROR: ${response.status} — ${errorBody?.error?.message ?? response.statusText}`
      );
    }

    const body = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };

    const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('GEMINI_EMPTY_RESPONSE: No content in AI response');
    }

    return text;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Research a company using Gemini AI — main exported function
 */
export async function researchCompanyWithAI(
  companyName: string,
  existingWebsite?: string | null
): Promise<{ intelligence: CompanyIntelligence; rawResponse: string }> {
  const prompt = buildResearchPrompt(companyName, existingWebsite);
  const rawResponse = await callGeminiRaw(prompt);
  const intelligence = parseGeminiResponse(rawResponse);
  return { intelligence, rawResponse };
}
