import assert from 'node:assert/strict';
import test from 'node:test';
import { createEmbedding, discoverLeverJobUrls, parseLeverJob, normalizeJob } from '../src/lever.ts';

const listingHtml = `
  <div class="posting"><a class="posting-title" href="/acme/abc-123">Backend Engineer</a></div>
  <div class="posting"><a href="https://jobs.lever.co/acme/def-456">Product Manager</a></div>
  <a class="posting-title" href="/acme/abc-123">Duplicate</a>
  <a href="https://example.com/not-a-job">Ignore</a>
`;

const jobHtml = `<!doctype html><html><head>
  <script type="application/ld+json">{"@type":"JobPosting","title":"Senior Backend Engineer","hiringOrganization":{"name":"Acme"},"jobLocation":{"address":{"addressLocality":"Bengaluru","addressCountry":"IN"}},"datePosted":"2026-07-10","employmentType":"FULL_TIME"}</script>
</head><body>
  <div class="posting-headline"><h2>Senior Backend Engineer</h2><div class="location">Bengaluru, India</div></div>
  <div class="section-wrapper description"><h3>About the role</h3><p>Build reliable TypeScript and Node.js services.</p><h3>Requirements</h3><ul><li>3-5 years of experience</li><li>TypeScript, Node.js, PostgreSQL</li></ul><p>Salary $120,000 - $150,000 annually. Hybrid.</p></div>
</body></html>`;

test('discovers unique Lever posting URLs only', () => {
  assert.deepEqual(discoverLeverJobUrls(listingHtml, 'https://jobs.lever.co/acme/'), [
    'https://jobs.lever.co/acme/abc-123',
    'https://jobs.lever.co/acme/def-456',
  ]);
});

test('extracts deterministic Lever details and markdown description', () => {
  const parsed = parseLeverJob(jobHtml, 'https://jobs.lever.co/acme/abc-123');
  assert.equal(parsed.jobId, 'abc-123');
  assert.equal(parsed.company, 'Acme');
  assert.equal(parsed.title, 'Senior Backend Engineer');
  assert.equal(parsed.location, 'Bengaluru, India');
  assert.match(parsed.description, /TypeScript and Node\.js services/);
  assert.equal(parsed.postedDate, '2026-07-10');
});

test('normalizes a job to the requested JSON shape with deterministic enrichment', () => {
  const parsed = parseLeverJob(jobHtml, 'https://jobs.lever.co/acme/abc-123');
  const job = normalizeJob(parsed, new Date('2026-07-12T05:39:00Z'));
  assert.equal(job.platform, 'lever');
  assert.equal(job.job_id_external, 'abc-123');
  assert.deepEqual(job.skills, ['TypeScript', 'Node.js', 'PostgreSQL']);
  assert.equal(job.min_years_experience, 3);
  assert.equal(job.max_years_experience, 5);
  assert.equal(job.min_salary, 120000);
  assert.equal(job.max_salary, 150000);
  assert.equal(job.extra_data.work_mode, 'Hybrid');
  assert.equal(job.embedding, null);
  assert.equal(job.is_active, true);
});

test('uses the OpenAI embeddings API with text-embedding-3-small', async () => {
  const calls: Array<{ model: string; input: string }> = [];
  const client = {
    embeddings: {
      create: async (request: { model: string; input: string }) => {
        calls.push(request);
        return { data: [{ embedding: [0.12, -0.34] }] };
      },
    },
  };
  assert.deepEqual(await createEmbedding('backend role', client), [0.12, -0.34]);
  assert.deepEqual(calls, [{ model: 'text-embedding-3-small', input: 'backend role' }]);
});
