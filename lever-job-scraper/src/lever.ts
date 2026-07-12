import { randomUUID } from 'node:crypto';
import * as cheerio from 'cheerio';
import Instructor from '@instructor-ai/instructor';
import { NodeHtmlMarkdown } from 'node-html-markdown';
import OpenAI from 'openai';
import { z } from 'zod';

export interface ParsedLeverJob {
  jobId: string;
  company: string;
  title: string;
  location: string;
  description: string;
  url: string;
  postedDate: string | null;
  employmentType: string | null;
}

export interface LeverJob {
  id: string;
  job_id_external: string;
  platform: 'lever';
  company: string;
  job_title: string;
  location: string;
  salary_range: string | null;
  job_url: string;
  application_link: string;
  description: string;
  summary: string;
  requirements: string;
  skills: string[];
  job_type: string;
  employment_type: string;
  seniority_level: string;
  experience_level: string;
  is_remote: boolean;
  min_years_experience: number | null;
  max_years_experience: number | null;
  min_salary: number | null;
  max_salary: number | null;
  latitude: number | null;
  longitude: number | null;
  sector_tags: string[];
  is_external: boolean;
  posted_date: string | null;
  scraped_at: string;
  is_active: boolean;
  extra_data: { work_mode: 'Remote' | 'Hybrid' | 'On-site'; company_logo: string | null; perks: string[] };
  embedding: number[] | null;
}

type JsonLd = Record<string, unknown>;

const KNOWN_SKILLS = [
  'TypeScript', 'JavaScript', 'Node.js', 'React', 'Next.js', 'Python', 'Java', 'Go', 'Ruby', 'PHP',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'AWS', 'Azure', 'GCP', 'Docker',
  'Kubernetes', 'Terraform', 'GraphQL', 'REST', 'SQL', 'Spark', 'Kafka', 'Airflow', 'Tableau',
  'Figma', 'Salesforce', 'Machine Learning', 'LLM', 'OpenAI', 'C++', 'C#', 'Swift', 'Kotlin',
];

const CITY_COORDINATES: Record<string, [number, number]> = {
  bengaluru: [12.9716, 77.5946], bangalore: [12.9716, 77.5946],
  'san francisco': [37.7749, -122.4194], 'new york': [40.7128, -74.006],
  london: [51.5072, -0.1276], 'los angeles': [34.0522, -118.2437],
  seattle: [47.6062, -122.3321], austin: [30.2672, -97.7431],
  toronto: [43.6532, -79.3832], boston: [42.3601, -71.0589],
};

const AiEnrichmentSchema = z.object({
  skills: z.array(z.string()).default([]),
  requirements: z.string().default(''),
  summary: z.string().default(''),
  salary_range: z.string().nullable().default(null),
  min_experience: z.number().nullable().default(null),
  max_experience: z.number().nullable().default(null),
  latitude: z.number().nullable().default(null),
  longitude: z.number().nullable().default(null),
  work_mode: z.enum(['Remote', 'Hybrid', 'On-site']).nullable().default(null),
  job_type: z.string().nullable().default(null),
});
type AiEnrichment = z.infer<typeof AiEnrichmentSchema>;

function clean(value: string | undefined | null): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function markdown(value: string): string {
  return value.replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function parseJsonLd($: cheerio.CheerioAPI): JsonLd[] {
  const data: JsonLd[] = [];
  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      const parsed = JSON.parse($(element).text());
      const values = Array.isArray(parsed) ? parsed : parsed['@graph'] ?? [parsed];
      for (const value of values) if (value && typeof value === 'object') data.push(value as JsonLd);
    } catch { /* invalid JSON-LD is non-fatal */ }
  });
  return data;
}

function getPosting(items: JsonLd[]): JsonLd | undefined {
  return items.find((item) => item['@type'] === 'JobPosting' || (Array.isArray(item['@type']) && item['@type'].includes('JobPosting')));
}

function stringField(value: unknown): string | null {
  return typeof value === 'string' ? clean(value) || null : null;
}

function companyFromUrl(url: string): string {
  const slug = new URL(url).pathname.split('/').filter(Boolean)[0] ?? 'Unknown';
  return slug.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function discoverLeverJobUrls(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const base = new URL(baseUrl);
  const found = new Set<string>();
  $('a.posting-title, .posting a').each((_, element) => {
    const href = $(element).attr('href');
    if (!href) return;
    try {
      const url = new URL(href, base).toString().replace(/\/$/, '');
      const parsed = new URL(url);
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (parsed.hostname.endsWith('lever.co') && parts.length >= 2 && parts[0] === base.pathname.split('/').filter(Boolean)[0]) found.add(url);
    } catch { /* ignore malformed links */ }
  });
  return [...found];
}

export function parseLeverJob(html: string, url: string): ParsedLeverJob {
  const $ = cheerio.load(html);
  const posting = getPosting(parseJsonLd($));
  const jsonTitle = stringField(posting?.title);
  const ogTitle = $('meta[property="og:title"]').attr('content');
  const title = clean(jsonTitle ?? ogTitle ?? $('h1.jd-header-title, .posting-headline h2, h1').first().text() ?? $('title').text()) || 'Unknown role';
  const hiringOrg = posting?.hiringOrganization as JsonLd | undefined;
  let company = clean(stringField(hiringOrg?.name) ?? $('.company-name, .employer').first().text() ?? companyFromUrl(url));
  if ((company === 'Lever' || company === 'Unknown') && title.includes(' - ')) company = title.split(' - ')[0];
  const jobLocation = posting?.jobLocation as JsonLd | undefined;
  const address = jobLocation?.address as JsonLd | undefined;
  const location = clean($('.location, [data-qa="job-location"]').first().text() ?? stringField(address?.addressLocality) ?? 'Remote');
  const descriptionElement = $('.section-wrapper.description, .posting-description, [data-qa="job-description"]').first();
  const descriptionHtml = descriptionElement.length ? descriptionElement.html() ?? '' : $('body').html() ?? '';
  const description = markdown(new NodeHtmlMarkdown({ bulletMarker: '-' }).translate(descriptionHtml));
  return {
    jobId: new URL(url).pathname.split('/').filter(Boolean).at(-1) ?? randomUUID(),
    company: company || companyFromUrl(url), title, location, description, url,
    postedDate: stringField(posting?.datePosted), employmentType: stringField(posting?.employmentType),
  };
}

function extractSkills(text: string): string[] {
  return KNOWN_SKILLS.filter((skill) => new RegExp(`(?<![\\w+#])${skill.replace('.', '\\.').replace('+', '\\+').replace(/ /g, '\\s+')}(?![\\w+#])`, 'i').test(text));
}

function parseExperience(text: string, title: string): [number | null, number | null] {
  const range = text.match(/\b(\d{1,2})\s*(?:-|–|to)\s*(\d{1,2})\s*(?:years?|yrs?)\b/i);
  if (range) return [Number(range[1]), Number(range[2])];
  const plus = text.match(/\b(\d{1,2})\s*\+\s*(?:years?|yrs?)\b/i);
  if (plus) return [Number(plus[1]), null];
  if (/\b(senior|staff|principal|lead)\b/i.test(title)) return [5, null];
  if (/\b(junior|entry|graduate|intern)\b/i.test(title)) return [0, 1];
  return [null, null];
}

function parseSalary(text: string): { range: string | null; min: number | null; max: number | null } {
  const match = text.match(/(?:\$\s*)?(\d{2,3}(?:,\d{3})?|\d{2,3})\s*(k)?\s*(?:-|–|to)\s*(?:\$\s*)?(\d{2,3}(?:,\d{3})?|\d{2,3})\s*(k)?(?:\s*(?:per year|annually|\/year))?/i);
  if (!match) return { range: null, min: null, max: null };
  const value = (raw: string, hasK: boolean) => {
    const number = Number(raw.replace(/,/g, ''));
    return hasK || number < 1000 ? number * 1000 : number;
  };
  const min = value(match[1], Boolean(match[2])); const max = value(match[3], Boolean(match[4]));
  return { range: `$${min.toLocaleString()} - $${max.toLocaleString()} annually`, min, max };
}

function workMode(text: string): 'Remote' | 'Hybrid' | 'On-site' {
  if (/\bhybrid\b/i.test(text)) return 'Hybrid';
  if (/\bremote\b/i.test(text)) return 'Remote';
  return 'On-site';
}

function coordinates(location: string): [number | null, number | null] {
  const normalized = location.toLowerCase();
  for (const [city, values] of Object.entries(CITY_COORDINATES)) if (normalized.includes(city)) return values;
  return [null, null];
}

function seniority(title: string): string {
  if (/\b(intern|junior|entry|graduate)\b/i.test(title)) return 'Entry Level';
  if (/\b(senior|staff|principal|lead|manager|director)\b/i.test(title)) return 'Senior Level';
  return 'Mid Level';
}

export function normalizeJob(parsed: ParsedLeverJob, scrapedAt = new Date()): LeverJob {
  const skills = extractSkills(parsed.description);
  const [minYears, maxYears] = parseExperience(parsed.description, parsed.title);
  const salary = parseSalary(parsed.description);
  const mode = workMode(`${parsed.location} ${parsed.description}`);
  const [latitude, longitude] = coordinates(parsed.location);
  const reqSection = parsed.description.match(/(?:requirements?|qualifications?)[\s\S]{0,1500}/i)?.[0] ?? '';
  const excerpt = parsed.description.slice(0, 360);
  const employment = parsed.employmentType === 'FULL_TIME' ? 'Full-time' : parsed.employmentType?.replace(/_/g, ' ') ?? 'Unknown';
  return {
    id: randomUUID(), job_id_external: parsed.jobId, platform: 'lever', company: parsed.company, job_title: parsed.title,
    location: parsed.location, salary_range: salary.range, job_url: parsed.url, application_link: parsed.url,
    description: parsed.description, summary: excerpt, requirements: reqSection, skills,
    job_type: parsed.employmentType ?? 'UNKNOWN', employment_type: employment,
    seniority_level: seniority(parsed.title), experience_level: seniority(parsed.title),
    is_remote: mode === 'Remote', min_years_experience: minYears, max_years_experience: maxYears,
    min_salary: salary.min, max_salary: salary.max, latitude, longitude,
    sector_tags: ['Technology'], is_external: true, posted_date: parsed.postedDate,
    scraped_at: scrapedAt.toISOString(), is_active: true,
    extra_data: { work_mode: mode, company_logo: null, perks: [] }, embedding: null,
  };
}

export async function fetchWithTimeout(url: string, timeoutMs = 20_000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, redirect: 'follow', headers: { 'user-agent': 'find-me-a-job-lever-scraper/1.0' } });
    if (response.url !== url && new URL(response.url).hostname !== new URL(url).hostname) throw new Error(`cross-host redirect blocked: ${url}`);
    return response;
  } finally { clearTimeout(timer); }
}

type EmbeddingClient = {
  embeddings: {
    create: (request: { model: string; input: string }) => Promise<{ data: Array<{ embedding: number[] }> }>;
  };
};

export async function createEmbedding(text: string, injectedClient?: EmbeddingClient): Promise<number[] | null> {
  if (!injectedClient && !process.env.OPENAI_API_KEY) return null;
  const client = injectedClient ?? new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.embeddings.create({
    model: process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small',
    input: text,
  });
  return response.data[0]?.embedding ?? null;
}

async function enrichWithAi(job: LeverJob): Promise<AiEnrichment | null> {
  if (!process.env.OPENAI_API_KEY) return null;
  const client = Instructor({
    client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
    mode: 'TOOLS',
  });
  return client.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    messages: [{
      role: 'user',
      content: `Extract only supported facts from this Lever posting.\n\nTITLE: ${job.job_title}\n\nDESCRIPTION:\n${job.description}`,
    }],
    response_model: { schema: AiEnrichmentSchema, name: 'LeverJobEnrichment' },
  });
}

function applyAiEnrichment(job: LeverJob, ai: AiEnrichment): void {
  job.skills = ai.skills.length ? [...new Set(ai.skills)] : job.skills;
  job.requirements = ai.requirements || job.requirements;
  job.summary = ai.summary || job.summary;
  job.salary_range = ai.salary_range ?? job.salary_range;
  job.min_years_experience = ai.min_experience ?? job.min_years_experience;
  job.max_years_experience = ai.max_experience ?? job.max_years_experience;
  job.latitude = ai.latitude ?? job.latitude;
  job.longitude = ai.longitude ?? job.longitude;
  job.extra_data.work_mode = ai.work_mode ?? job.extra_data.work_mode;
  job.is_remote = job.extra_data.work_mode === 'Remote';
  job.job_type = ai.job_type ?? job.job_type;
}

export async function enrichAndEmbed(job: LeverJob): Promise<LeverJob> {
  const ai = await enrichWithAi(job);
  if (ai) applyAiEnrichment(job, ai);
  const composite = [job.job_title, job.company, job.location, job.summary, job.requirements, job.description, job.skills.join(', ')].join('\n');
  job.embedding = await createEmbedding(composite);
  return job;
}
