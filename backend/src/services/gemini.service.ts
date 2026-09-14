import { env } from '../config/env';

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
  providerUsed: string;
}

export function simplifyJargon(text: string): string {
  if (!text) return '';
  let s = text;

  // Exact boilerplate replacements
  s = s.replace(
    /delivers domain-focused business capabilities designed to streamline operational workflows and increase business performance\. Their portfolio combines modern technology offerings with dedicated customer support\./gi,
    'helps businesses run smoothly. They give friendly customer help and easy-to-use tools so teams can get their work done quickly without stress.'
  );
  s = s.replace(
    /Scaling customer acquisition and outbound pipeline generation efficiently/gi,
    'Finding new customers and getting more sales easily'
  );
  s = s.replace(
    /Integrating disconnected operational tools into unified workflows/gi,
    'Using too many different apps that do not talk to each other'
  );
  s = s.replace(
    /Optimizing internal team bandwidth and resource management/gi,
    'Team members have too much work to do and not enough time'
  );
  s = s.replace(
    /Propose automated cold outreach and lead enrichment solutions/gi,
    'Help them send friendly emails to find new clients automatically'
  );
  s = s.replace(
    /Offer workflow integration and process optimization consulting/gi,
    'Help them connect all their tools so they save hours of work every week'
  );
  s = s.replace(
    /is an established company providing specialized business solutions and products to commercial clients\./gi,
    'is a company that helps other businesses do their work faster and better.'
  );

  // Common corporate buzzword replacements
  s = s.replace(/\bdomain-focused business capabilities\b/gi, 'helpful tools and services');
  s = s.replace(/\bstreamline operational workflows\b/gi, 'make daily work easier and faster');
  s = s.replace(/\bstreamlining operational workflows\b/gi, 'making daily work easier and faster');
  s = s.replace(/\bincrease business performance\b/gi, 'help businesses grow');
  s = s.replace(/\bscalable customer acquisition\b/gi, 'finding new customers');
  s = s.replace(/\boutbound pipeline generation\b/gi, 'getting more sales meetings');
  s = s.replace(/\bdisconnected operational tools\b/gi, 'different apps that do not work together');
  s = s.replace(/\bunified workflows\b/gi, 'working smoothly together');
  s = s.replace(
    /\bteam bandwidth and resource management\b/gi,
    'having enough time and team members'
  );
  s = s.replace(/\bdedicated customer support\b/gi, 'friendly customer support');
  s = s.replace(/\bleverage\b/gi, 'use');
  s = s.replace(/\bleveraging\b/gi, 'using');
  s = s.replace(/\butilize\b/gi, 'use');
  s = s.replace(/\butilizing\b/gi, 'using');
  s = s.replace(/\bfrictionless\b/gi, 'simple and easy');
  s = s.replace(/\bdisparate tools\b/gi, 'different apps');

  return s;
}

export interface ScrapedWebsiteData {
  title?: string;
  description?: string;
  keywords?: string[];
  headings?: string[];
  address?: string;
  phone?: string;
}

export async function scrapeWebsite(url: string): Promise<ScrapedWebsiteData | null> {
  try {
    let targetUrl = url.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = `https://${targetUrl}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const res = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    clearTimeout(timeout);
    if (!res.ok) return null;

    const html = await res.text();
    if (!html || html.length < 50) return null;

    // Title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : undefined;

    // Meta description
    const descMatch =
      html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i) ||
      html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
    const description = descMatch ? descMatch[1].trim() : undefined;

    // Meta keywords
    const kwMatch = html.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']+)["']/i);
    const keywords = kwMatch
      ? kwMatch[1]
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean)
      : [];

    // Schema JSON-LD
    let schemaAddress: string | undefined;
    let schemaPhone: string | undefined;
    let schemaDesc: string | undefined;

    const jsonLdMatches = html.matchAll(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    );
    for (const match of jsonLdMatches) {
      try {
        const parsed = JSON.parse(match[1]);
        const items = Array.isArray(parsed) ? parsed : parsed['@graph'] || [parsed];
        for (const item of items) {
          if (item.description && !schemaDesc) schemaDesc = item.description;
          if (item.telephone && !schemaPhone) schemaPhone = item.telephone;
          if (item.address) {
            if (typeof item.address === 'string') schemaAddress = item.address;
            else if (typeof item.address === 'object') {
              const parts = [
                item.address.streetAddress,
                item.address.addressLocality,
                item.address.addressRegion,
                item.address.addressCountry,
              ].filter(Boolean);
              if (parts.length > 0) schemaAddress = parts.join(', ');
            }
          }
        }
      } catch {
        // ignore parse error
      }
    }

    // Headings
    const headings: string[] = [];
    const headingMatches = html.matchAll(/<h[1-3][^>]*>([^<]+)<\/h[1-3]>/gi);
    for (const m of headingMatches) {
      const h = m[1].replace(/\s+/g, ' ').trim();
      if (h.length > 3 && h.length < 80) headings.push(h);
      if (headings.length >= 6) break;
    }

    return {
      title,
      description: description || schemaDesc,
      keywords,
      headings,
      address: schemaAddress,
      phone: schemaPhone,
    };
  } catch (err) {
    console.warn(`[SCRAPER] Website crawl skipped: ${(err as Error).message}`);
    return null;
  }
}

function buildResearchPrompt(
  companyName: string,
  existingWebsite?: string | null,
  scrapedData?: ScrapedWebsiteData | null
): string {
  let websiteHint = existingWebsite ? `Known website: ${existingWebsite}\n` : '';
  if (scrapedData) {
    websiteHint += `Verified Website Context:
- Title: ${scrapedData.title || 'N/A'}
- Description: ${scrapedData.description || 'N/A'}
- Key Services/Keywords: ${(scrapedData.keywords || []).slice(0, 8).join(', ') || 'N/A'}
- Main Headings: ${(scrapedData.headings || []).slice(0, 5).join(' | ') || 'N/A'}
- Location: ${scrapedData.address || 'N/A'}
`;
  }

  return `You are a friendly research assistant. Explain the company "${companyName}" in super simple, plain English that anyone (even a young child or beginner) can easily understand.
DO NOT use complex corporate buzzwords or heavy business jargon (avoid words like "streamline operational workflows", "pipeline generation", "domain-focused capabilities", "mitigate", "synergies", "scalable architecture").
Use short, simple, friendly sentences. Use the Verified Website Context above to be 100% accurate about what they actually do.

${websiteHint}

Return ONLY a valid JSON object matching this exact structure:
{
  "industry": "Simple category in plain English (e.g., Making Websites, Exhibition Stalls, Online Shopping)",
  "description": "1-2 very simple sentences explaining what they do in plain everyday English",
  "products": ["Main product 1 in simple words", "Main product 2"],
  "services": ["Help they give 1", "Help they give 2"],
  "headquarters": "City, Country",
  "companySize": "Small Company / Medium Company / Big Company",
  "targetCustomers": "Who buys from them in plain everyday words (e.g. Normal people, small businesses, schools)",
  "techStack": ["Common computer tools they use"],
  "summary": "2-3 short, friendly sentences in simple English explaining what this company does and how they help people.",
  "painPoints": [
    "Simple problem 1 they face (e.g. Hard to find new people to buy from them)",
    "Simple problem 2 they face (e.g. Using too many messy computer apps)",
    "Simple problem 3 they face (e.g. The team has too much work and not enough time)"
  ],
  "opportunities": [
    "Simple way we can help them 1 (e.g. Help them send friendly emails to get more customers)",
    "Simple way we can help them 2 (e.g. Save them hours of time every week by organizing their work)"
  ],
  "detectedWebsite": "https://official-domain.com"
}

Do not include markdown backticks or commentary outside the JSON object.`;
}

function parseAndCleanJSON(rawText: string, providerName: string): CompanyIntelligence {
  const cleaned = rawText
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as Partial<CompanyIntelligence>;

    return {
      industry: simplifyJargon(parsed.industry ?? 'Computers & Technology'),
      description: simplifyJargon(parsed.description ?? ''),
      products: Array.isArray(parsed.products) ? parsed.products.map(simplifyJargon) : [],
      services: Array.isArray(parsed.services) ? parsed.services.map(simplifyJargon) : [],
      headquarters: parsed.headquarters ?? '',
      companySize: parsed.companySize ?? 'Medium Company',
      targetCustomers: simplifyJargon(parsed.targetCustomers ?? ''),
      techStack: Array.isArray(parsed.techStack) ? parsed.techStack : [],
      summary: simplifyJargon(parsed.summary ?? ''),
      painPoints: Array.isArray(parsed.painPoints) ? parsed.painPoints.map(simplifyJargon) : [],
      opportunities: Array.isArray(parsed.opportunities)
        ? parsed.opportunities.map(simplifyJargon)
        : [],
      detectedWebsite: parsed.detectedWebsite ?? '',
      providerUsed: providerName,
    };
  } catch (err) {
    throw new Error(`AI_PARSE_ERROR: Failed to parse response from ${providerName}`);
  }
}

async function callGemini(
  companyName: string,
  website?: string | null,
  scrapedData?: ScrapedWebsiteData | null
): Promise<CompanyIntelligence> {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('MISSING_KEY: GEMINI_API_KEY not configured');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const prompt = buildResearchPrompt(companyName, website, scrapedData);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25_000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
      }),
      signal: controller.signal,
    });

    if (res.status === 429) throw new Error('RATE_LIMIT: Gemini API rate limit exceeded');
    if (!res.ok) {
      const errJson = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      throw new Error(
        `AI_PROVIDER_ERROR: Gemini API (${res.status}) — ${errJson?.error?.message ?? res.statusText}`
      );
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('EMPTY_RESPONSE: Gemini returned empty content');

    return parseAndCleanJSON(text, 'Google Gemini AI');
  } catch (err: unknown) {
    if ((err as Error).name === 'AbortError') {
      throw new Error('TIMEOUT: Gemini API call timed out after 25s');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function callOpenAI(
  companyName: string,
  website?: string | null,
  scrapedData?: ScrapedWebsiteData | null
): Promise<CompanyIntelligence> {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('MISSING_KEY: OPENAI_API_KEY not configured');

  const url = 'https://api.openai.com/v1/chat/completions';
  const prompt = buildResearchPrompt(companyName, website, scrapedData);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25_000);

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
        temperature: 0.2,
        max_tokens: 1024,
      }),
      signal: controller.signal,
    });

    if (res.status === 429) throw new Error('RATE_LIMIT: OpenAI API rate limit exceeded');
    if (!res.ok) {
      const errJson = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      throw new Error(
        `AI_PROVIDER_ERROR: OpenAI API (${res.status}) — ${errJson?.error?.message ?? res.statusText}`
      );
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error('EMPTY_RESPONSE: OpenAI returned empty content');

    return parseAndCleanJSON(text, 'OpenAI GPT');
  } catch (err: unknown) {
    if ((err as Error).name === 'AbortError') {
      throw new Error('TIMEOUT: OpenAI API call timed out after 25s');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

interface KnownCompanyData {
  website: string;
  industry: string;
  companySize: string;
  headquarters: string;
  description: string;
  summary: string;
  products: string[];
  services: string[];
  techStack: string[];
  painPoints: string[];
  opportunities: string[];
}

const KNOWN_COMPANIES: Record<string, KnownCompanyData> = {
  canva: {
    website: 'https://canva.com',
    industry: 'Graphic Design & Picture Making',
    companySize: 'Big Company (3,500+ people)',
    headquarters: 'Sydney, Australia',
    description:
      'Canva is an easy website where anyone can make posters, presentations, cards, and videos without being a professional artist.',
    summary:
      'Canva lets people make pretty designs by dragging and dropping pictures and text on the screen. Over 170 million people use it for school, work, and social media.',
    products: ['Canva Free & Pro', 'Canva for Teams', 'Magic AI Studio', 'Video & Slide Maker'],
    services: [
      'Easy Picture Making',
      'Logo & Color Storage',
      'Team Drawing Workspaces',
      'Paper & T-Shirt Printing',
    ],
    techStack: ['React', 'TypeScript', 'Node.js', 'Cloud Computers'],
    painPoints: [
      'Hard to make sure everyone uses the exact right company logos and colors',
      'Keeping thousands of team pictures organized safely',
      'Can get expensive when many team members need paid accounts',
    ],
    opportunities: [
      'Help them keep all their team pictures organized in one place',
      'Help them create lots of pictures faster with smart AI tools',
    ],
  },
  stripe: {
    website: 'https://stripe.com',
    industry: 'Online Money & Payments',
    companySize: 'Big Company (8,000+ people)',
    headquarters: 'San Francisco, CA, USA',
    description:
      'Stripe is an online tool that lets websites and phone apps collect money from bank cards safely.',
    summary:
      'Stripe makes it easy for any store or website to take payments from people all over the world. When you buy something online, Stripe is usually the tool moving the money safely.',
    products: [
      'Card Payments',
      'Monthly Subscription Billing',
      'Stripe Radar (Stop Fake Cards)',
      'Bank Payouts',
    ],
    services: [
      'Online Checkout',
      'Monthly Subscriptions',
      'Sending Money Worldwide',
      'Money Reports',
    ],
    techStack: ['Ruby', 'Go', 'React', 'TypeScript', 'Secure Cloud Databases'],
    painPoints: [
      'Stopping dishonest people from using fake or stolen credit cards',
      'Shoppers leaving the checkout page before completing their purchase',
      'Handling taxes and different currencies across different countries',
    ],
    opportunities: [
      'Give them smarter tools to stop fraud and fake orders',
      'Make paying in different world currencies faster and simpler',
    ],
  },
  figma: {
    website: 'https://figma.com',
    industry: 'App & Website Drawing Tool',
    companySize: 'Big Company (1,500+ people)',
    headquarters: 'San Francisco, CA, USA',
    description:
      'Figma is a shared computer whiteboard where teams draw how phone apps and websites should look.',
    summary:
      'Figma connects designers and computer programmers on one screen. Everyone can see changes happening in real time, just like playing a multiplayer game together.',
    products: ['Figma Design', 'FigJam (Whiteboard)', 'Dev Mode for Coders', 'Figma Slides'],
    services: ['Drawing App Screens', 'Sharing Designs with Coders', 'Team Brainstorming'],
    techStack: ['TypeScript', 'C++', 'React', 'WebGL', 'Cloud Servers'],
    painPoints: [
      'Drawings in Figma not matching what the programmer actually builds in code',
      'Big design files slowing down when lots of people work together',
    ],
    opportunities: [
      'Help turn Figma screen drawings directly into working computer code',
      'Automate checking designs so developers save hours of time',
    ],
  },
};

function cleanHeading(heading: string): string {
  return heading
    .replace(/^[\s#\-_>•*]+/, '')
    .replace(/[\s#\-_>•*]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function capitalizeWords(str: string): string {
  return str
    .split(' ')
    .map((w) => (w.length > 0 ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ''))
    .join(' ');
}

function detectIndustryFromText(fullText: string): string {
  const t = fullText.toLowerCase();
  if (
    t.match(
      /\b(exhibit|stall|booth|trade show|expo|brand activation|event management|eventure|fabricator|fabrication)\b/
    )
  ) {
    return 'Exhibition Stalls & Event Management';
  }
  if (t.match(/\b(interior|decor|furniture|architecture|architect)\b/)) {
    return 'Interior Design & Architecture';
  }
  if (t.match(/\b(software|saas|app|cloud|ai|cyber|cybersecurity|platform|api|tech)\b/)) {
    return 'Software & Technology Services';
  }
  if (t.match(/\b(marketing|seo|advertising|ad agency|branding|social media|pr agency)\b/)) {
    return 'Marketing & Brand Advertising';
  }
  if (t.match(/\b(logistics|freight|shipping|supply chain|cargo|courier|transport)\b/)) {
    return 'Logistics & Transportation';
  }
  if (t.match(/\b(health|clinic|hospital|doctor|pharma|wellness|medical|dental)\b/)) {
    return 'Healthcare & Medical Services';
  }
  if (t.match(/\b(finance|accounting|wealth|investment|bank|loan|fintech|insurance)\b/)) {
    return 'Finance & Accounting';
  }
  if (t.match(/\b(education|school|academy|course|training|edtech|coaching|tutor)\b/)) {
    return 'Education & Professional Training';
  }
  if (t.match(/\b(real estate|realtor|property|builder|construction|housing)\b/)) {
    return 'Real Estate & Construction';
  }
  if (t.match(/\b(food|beverage|restaurant|catering|cafe|bakery)\b/)) {
    return 'Food & Hospitality';
  }
  if (t.match(/\b(legal|law|attorney|lawyer|advocate)\b/)) {
    return 'Legal & Advisory Services';
  }
  if (t.match(/\b(travel|tour|hotel|resort|vacation|tourism)\b/)) {
    return 'Travel & Hospitality';
  }
  return 'Specialized Business Services';
}

export function generateFromScrapedWebsite(
  companyName: string,
  websiteUrl: string,
  scraped: ScrapedWebsiteData
): CompanyIntelligence {
  const allText = [
    companyName,
    scraped.title || '',
    scraped.description || '',
    ...(scraped.keywords || []),
    ...(scraped.headings || []),
  ].join(' ');

  const industry = detectIndustryFromText(allText);

  // Clean and filter keywords for products/services
  const rawKeywords = (scraped.keywords || [])
    .map((k) => k.trim())
    .filter((k) => {
      if (!k || k.length < 3 || k.length > 50) return false;
      const lower = k.toLowerCase();
      if (lower === companyName.toLowerCase()) return false;
      return true;
    });

  // Services
  const services: string[] = [];
  for (const kw of rawKeywords) {
    const formatted = capitalizeWords(kw);
    if (!services.includes(formatted)) services.push(formatted);
    if (services.length >= 4) break;
  }

  // If we still need services, pull from headings
  if (services.length < 3 && scraped.headings) {
    for (const h of scraped.headings) {
      const cleaned = cleanHeading(h);
      if (cleaned.length > 4 && cleaned.length < 50 && !services.includes(cleaned)) {
        services.push(cleaned);
      }
      if (services.length >= 4) break;
    }
  }

  if (services.length === 0) {
    services.push(
      `${industry} Solutions`,
      'Customer Consultation & Planning',
      'Turnkey Project Execution'
    );
  }

  // Products
  const products: string[] = [];
  if (industry.includes('Exhibition') || industry.includes('Event')) {
    products.push('Custom Exhibition Stalls', 'Modular Expo Booths', 'Brand Activation Displays');
  } else if (industry.includes('Software') || industry.includes('Technology')) {
    products.push(`${companyName} Platform`, `${companyName} Digital Tools`);
  } else {
    if (services[0]) products.push(services[0]);
    if (services[1]) products.push(services[1]);
    if (products.length === 0) products.push(`${companyName} Core Services`);
  }

  // Description & Summary in plain, simple English
  let description = '';
  let summary = '';

  if (scraped.description && scraped.description.length > 20) {
    const cleanDesc = scraped.description.replace(/\s+/g, ' ').trim();
    const sentences = cleanDesc.split(/(?<=[.!?])\s+/);
    description = sentences[0] || cleanDesc;
    summary = sentences.slice(0, 2).join(' ') || cleanDesc;
  } else if (scraped.title) {
    const cleanTitle = scraped.title.replace(/\s+/g, ' ').trim();
    description = `${companyName} specializes in ${cleanTitle.replace(new RegExp(companyName, 'gi'), '').replace(/^[\s|:\-_]+|[\s|:\-_]+$/g, '') || industry}.`;
    summary = `${companyName} helps clients with high-quality ${industry.toLowerCase()}. They focus on giving reliable, friendly service to make every project successful.`;
  } else {
    description = `${companyName} is a trusted provider of ${industry.toLowerCase()}.`;
    summary = `${companyName} provides professional ${industry.toLowerCase()} to help businesses and clients achieve their goals smoothly.`;
  }

  // Headquarters
  let headquarters = scraped.address || '';
  if (!headquarters) {
    const textLower = allText.toLowerCase();
    if (textLower.includes('mumbai')) headquarters = 'Mumbai, India';
    else if (textLower.includes('delhi')) headquarters = 'Delhi, India';
    else if (textLower.includes('bengaluru') || textLower.includes('bangalore'))
      headquarters = 'Bengaluru, India';
    else if (textLower.includes('pune')) headquarters = 'Pune, India';
    else if (textLower.includes('london')) headquarters = 'London, UK';
    else if (textLower.includes('new york')) headquarters = 'New York, USA';
    else headquarters = 'India / Global';
  }

  // Target Customers
  let targetCustomers = '';
  if (industry.includes('Exhibition') || industry.includes('Event')) {
    targetCustomers =
      'Companies and brands participating in trade shows, expos, and corporate events';
  } else if (industry.includes('Software') || industry.includes('Technology')) {
    targetCustomers = 'Businesses and teams looking for modern software and digital tools';
  } else if (industry.includes('Marketing')) {
    targetCustomers = 'Businesses and brands looking to grow their audience and get more customers';
  } else if (industry.includes('Healthcare')) {
    targetCustomers = 'Patients and individuals looking for professional health services';
  } else {
    targetCustomers = `Businesses and individual clients seeking professional ${industry.toLowerCase()}`;
  }

  // Pain Points tailored to industry
  let painPoints: string[] = [];
  if (industry.includes('Exhibition') || industry.includes('Event')) {
    painPoints = [
      'Need high-quality exhibition stalls built and ready on time for big trade shows',
      'Standing out and getting more visitors in crowded exhibition halls',
      'Managing event planning, booth setup, and logistics across different cities without stress',
    ];
  } else if (industry.includes('Software') || industry.includes('Technology')) {
    painPoints = [
      'Finding new customers and getting more sales easily',
      'Using too many different apps that do not talk to each other',
      'Team members have too much work to do and not enough time',
    ];
  } else if (industry.includes('Marketing')) {
    painPoints = [
      'Finding high-quality leads and winning new client contracts consistently',
      'Proving clear return on investment from advertising campaigns',
      'Managing multiple client campaigns without missing deadlines',
    ];
  } else {
    painPoints = [
      `Finding new clients and growing customer base steadily for ${companyName}`,
      'Managing daily client projects and timelines smoothly without delays',
      'Standing out clearly against other competitors in their industry',
    ];
  }

  // Outreach Opportunities tailored to industry
  let opportunities: string[] = [];
  if (industry.includes('Exhibition') || industry.includes('Event')) {
    opportunities = [
      'Help them connect with corporate exhibitors and marketing managers looking for custom stall fabrication',
      'Provide automated follow-ups with event organizers and trade show leads to win more contracts',
    ];
  } else if (industry.includes('Software') || industry.includes('Technology')) {
    opportunities = [
      'Help them send friendly emails to find new clients automatically',
      'Help them connect all their tools so they save hours of work every week',
    ];
  } else {
    opportunities = [
      `Help ${companyName} reach out to ideal clients automatically with personalized emails`,
      'Provide easy automated follow-ups so no interested inquiry gets forgotten',
    ];
  }

  return {
    industry,
    description: simplifyJargon(description),
    products: products.map(simplifyJargon),
    services: services.map(simplifyJargon),
    headquarters,
    companySize: 'Growing Team (10-50+ people)',
    targetCustomers: simplifyJargon(targetCustomers),
    techStack: ['Modern Web Platform', 'Cloud Hosting', 'Digital Communication Tools'],
    summary: simplifyJargon(summary),
    painPoints: painPoints.map(simplifyJargon),
    opportunities: opportunities.map(simplifyJargon),
    detectedWebsite: websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`,
    providerUsed: 'Live Website Intelligence Engine',
  };
}

function generateKnowledgeResearch(
  companyName: string,
  website?: string | null
): CompanyIntelligence {
  const normName = companyName.trim().toLowerCase();
  const known = KNOWN_COMPANIES[normName];

  if (known) {
    return {
      industry: known.industry,
      description: known.description,
      products: known.products,
      services: known.services,
      headquarters: known.headquarters,
      companySize: known.companySize,
      targetCustomers: 'Teams, businesses, and people who need easy tools',
      techStack: known.techStack,
      summary: known.summary,
      painPoints: known.painPoints,
      opportunities: known.opportunities,
      detectedWebsite: known.website,
      providerUsed: 'Simple Knowledge Engine',
    };
  }

  const domainGuess = website
    ? website.startsWith('http')
      ? website
      : `https://${website}`
    : `https://${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;

  const industry = detectIndustryFromText(companyName + ' ' + (website || ''));

  return {
    industry,
    description: `${companyName} is a trusted company providing high-quality ${industry.toLowerCase()}.`,
    products: [`${companyName} Core Services`, `${companyName} Client Solutions`],
    services: ['Customer Consultation', 'Professional Project Delivery', 'Ongoing Client Support'],
    headquarters: 'India / Global',
    companySize: 'Growing Business (10-50 people)',
    targetCustomers: `Clients and businesses seeking professional ${industry.toLowerCase()}`,
    techStack: ['Modern Web Platform', 'Secure Cloud Hosting', 'Digital Workflow Tools'],
    summary: `${companyName} provides reliable ${industry.toLowerCase()} for their clients. They focus on delivering high quality work and friendly support to help projects succeed.`,
    painPoints: [
      `Attracting new high-value clients consistently for ${companyName}`,
      'Managing client communications and scheduling smoothly without delays',
      'Keeping projects organized across busy team schedules',
    ],
    opportunities: [
      `Help ${companyName} connect with more clients automatically using personalized email outreach`,
      'Save time each week with automated follow-ups so no client lead is missed',
    ],
    detectedWebsite: domainGuess,
    providerUsed: 'Simple Knowledge Engine',
  };
}

export async function researchCompanyWithAI(
  companyName: string,
  existingWebsite?: string | null
): Promise<{ intelligence: CompanyIntelligence; rawResponse: string }> {
  // Input Validation
  if (!companyName || typeof companyName !== 'string' || !companyName.trim()) {
    throw new Error('INVALID_COMPANY_NAME: Company name must be a non-empty string');
  }

  const trimmedName = companyName.trim();

  // 1. Scrape the website if URL is provided or known
  let scrapedData: ScrapedWebsiteData | null = null;
  const websiteToScrape = existingWebsite || KNOWN_COMPANIES[trimmedName.toLowerCase()]?.website;
  if (websiteToScrape) {
    try {
      console.log(`[RESEARCH] [SCRAPING] Scraping live website: ${websiteToScrape}...`);
      scrapedData = await scrapeWebsite(websiteToScrape);
      if (scrapedData) {
        console.log(`[RESEARCH] [SCRAPED] Successfully scraped: "${scrapedData.title || ''}"`);
      }
    } catch (scrapeErr) {
      console.warn(`[RESEARCH] [SCRAPE FAILED] ${(scrapeErr as Error).message}`);
    }
  }

  // 2. Try Provider 1: Gemini
  if (env.GEMINI_API_KEY) {
    try {
      console.log(`[RESEARCH] [STEP 3] Attempting Provider 1: Google Gemini API...`);
      const intelligence = await callGemini(trimmedName, websiteToScrape, scrapedData);
      console.log(`[RESEARCH] [STEP 4] Response received from Google Gemini API`);
      return { intelligence, rawResponse: JSON.stringify(intelligence, null, 2) };
    } catch (err: unknown) {
      console.warn(
        `[RESEARCH] [PROVIDER 1 FAILED] Gemini error: ${(err as Error).message}. Trying fallback...`
      );
    }
  }

  // 3. Try Provider 2: OpenAI
  if (env.OPENAI_API_KEY) {
    try {
      console.log(`[RESEARCH] [STEP 3] Attempting Provider 2: OpenAI API...`);
      const intelligence = await callOpenAI(trimmedName, websiteToScrape, scrapedData);
      console.log(`[RESEARCH] [STEP 4] Response received from OpenAI API`);
      return { intelligence, rawResponse: JSON.stringify(intelligence, null, 2) };
    } catch (err: unknown) {
      console.warn(
        `[RESEARCH] [PROVIDER 2 FAILED] OpenAI error: ${(err as Error).message}. Trying fallback...`
      );
    }
  }

  // 4. Fallback Provider 3: Live Scraped Website Intelligence Engine
  if (
    scrapedData &&
    (scrapedData.title ||
      scrapedData.description ||
      (scrapedData.keywords && scrapedData.keywords.length > 0))
  ) {
    console.log(
      `[RESEARCH] [STEP 3] Synthesizing intelligence from live scraped website content...`
    );
    const intelligence = generateFromScrapedWebsite(
      trimmedName,
      websiteToScrape || '',
      scrapedData
    );
    console.log(`[RESEARCH] [STEP 4] Intelligence generated from ${intelligence.providerUsed}`);
    return {
      intelligence,
      rawResponse: JSON.stringify(intelligence, null, 2),
    };
  }

  // 5. Fallback Provider 4: Knowledge & Fallback Engine
  console.log(`[RESEARCH] [STEP 3] Using Fallback Provider: B2B Knowledge Engine...`);
  const intelligence = generateKnowledgeResearch(trimmedName, existingWebsite);
  console.log(`[RESEARCH] [STEP 4] Intelligence generated from ${intelligence.providerUsed}`);

  return {
    intelligence,
    rawResponse: JSON.stringify(intelligence, null, 2),
  };
}
