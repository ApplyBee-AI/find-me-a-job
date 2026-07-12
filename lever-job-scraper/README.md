# Lever Job Scraper

A sibling service for `find-me-a-job`, located at:

`/Users/sudeepreddy/Documents/HERMES/lever-job-scraper`

It discovers postings from Lever listing pages, fetches individual job pages, converts descriptions to Markdown, applies deterministic normalization, optionally enriches with Instructor/OpenAI, optionally creates OpenAI embeddings, and writes one JSON document per job plus a JSON manifest.

## Run

```bash
npm install
npm test
npm run scrape -- --output ./output --max-jobs-per-company 1
```

The default run targets 12 live Lever listing pages. It writes the first job from each successful company, requiring at least 10 successful companies. The latest run produced 11 job JSON documents for 11 companies.

Output layout:

```text
output/lever/manifest.json
output/lever/<company>/lever-<job-id>.json
```

## Optional enrichment

No credentials are required for deterministic scraping. Configure these only when enrichment is desired:

```bash
# Instructor/OpenAI structured extraction and OpenAI embeddings
# Set this in your local shell or a gitignored .env file; never commit it.
export OPENAI_API_KEY=...
export OPENAI_MODEL=gpt-4o-mini
export OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

Without `OPENAI_API_KEY`, `embedding` is emitted as `null` and deterministic skills, salary, experience, work mode, and coordinate fallbacks are used.

## Current scrape artifact

`output/lever/manifest.json` contains the 11-job verified result generated on 2026-07-12.
