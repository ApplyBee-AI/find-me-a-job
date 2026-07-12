import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import pLimit from 'p-limit';
import { discoverLeverJobUrls, enrichAndEmbed, fetchWithTimeout, normalizeJob, parseLeverJob, type LeverJob } from './lever.ts';

// Always load the backend-owned configuration, even when this command is run from this child folder.
config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env') });

const DEFAULT_COMPANIES = [
  'https://jobs.lever.co/applydigital',
  'https://jobs.lever.co/employ',
  'https://jobs.lever.co/gohighlevel',
  'https://jobs.lever.co/dlocal',
  'https://jobs.lever.co/erg',
  'https://jobs.lever.co/rws',
  'https://jobs.lever.co/fi',
  'https://jobs.lever.co/sprinto',
  'https://jobs.lever.co/paytm',
  'https://jobs.lever.co/cred',
  'https://jobs.lever.co/jobgether',
  'https://jobs.lever.co/openx',
];

function argument(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  return index >= 0 ? (process.argv[index + 1] ?? fallback) : fallback;
}

function companySlug(url: string): string {
  return new URL(url).pathname.split('/').filter(Boolean)[0] ?? 'unknown';
}

function sleep(milliseconds: number): Promise<void> { return new Promise((resolve) => setTimeout(resolve, milliseconds)); }

async function scrapeListing(
  listingUrl: string,
  outputRoot: string,
  maxJobs: number,
  limit: ReturnType<typeof pLimit>,
): Promise<{ company: string; jobs: LeverJob[]; error?: string }> {
  const company = companySlug(listingUrl);
  try {
    const listingResponse = await fetchWithTimeout(listingUrl);
    if (!listingResponse.ok) throw new Error(`listing HTTP ${listingResponse.status}`);
    const urls = discoverLeverJobUrls(await listingResponse.text(), listingUrl).slice(0, maxJobs);
    if (urls.length === 0) throw new Error('no job URLs found');
    const jobs = (await Promise.all(urls.map((url) => limit(async () => {
      await sleep(1000 + Math.floor(Math.random() * 2001));
      const response = await fetchWithTimeout(url);
      if (response.status === 404 || response.status === 410) return null;
      if (!response.ok) throw new Error(`job HTTP ${response.status} for ${url}`);
      return enrichAndEmbed(normalizeJob(parseLeverJob(await response.text(), url)));
    })))).filter((job): job is LeverJob => job !== null);
    const directory = join(outputRoot, 'lever', company);
    await mkdir(directory, { recursive: true });
    await Promise.all(jobs.map((job) => writeFile(join(directory, `lever-${job.job_id_external}.json`), `${JSON.stringify(job, null, 2)}\n`)));
    return { company, jobs };
  } catch (error) {
    return { company, jobs: [], error: error instanceof Error ? error.message : String(error) };
  }
}

async function main(): Promise<void> {
  const outputRoot = argument('--output', join(process.cwd(), 'output'));
  const maxJobs = Number(argument('--max-jobs-per-company', '1'));
  const requested = process.argv.filter((value) => value.startsWith('https://jobs.lever.co/'));
  const companies = requested.length ? requested : DEFAULT_COMPANIES;
  const limit = pLimit(5);
  const results = await Promise.all(companies.map((url) => scrapeListing(url, outputRoot, maxJobs, limit)));
  const jobs = results.flatMap((result) => result.jobs);
  const manifest = {
    generated_at: new Date().toISOString(), platform: 'lever', companies_requested: companies,
    companies_succeeded: results.filter((result) => result.jobs.length > 0).map((result) => result.company),
    failures: results.filter((result) => result.error).map(({ company, error }) => ({ company, error })),
    job_count: jobs.length, jobs,
  };
  await mkdir(join(outputRoot, 'lever'), { recursive: true });
  await writeFile(join(outputRoot, 'lever', 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify({ job_count: jobs.length, companies_succeeded: manifest.companies_succeeded.length, failures: manifest.failures }, null, 2));
  if (manifest.companies_succeeded.length < 10) process.exitCode = 2;
}

void main();
