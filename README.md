# Find Me a Job Backend

Convex modular-monolith backend for the hackathon demo. Matching is deterministic and persisted first; Hermes only explains stored evidence.

## Local configuration

Use only `D:\Projects\find-me-a-job\.env`. Preserve the existing `OPENAI_API_KEY`, `CONVEX_DEPLOYMENT`, `CONVEX_URL`, and `CONVEX_SITE_URL` values. Optional keys are `HERMES_MODEL` and `OPENAI_EMBEDDING_MODEL`.

Do not create `.env.local`, including in the UI repo. Convex actions run remotely and cannot use a laptop-local gateway. Set runtime secrets separately after login, without printing values:

```powershell
npx convex env set OPENAI_API_KEY
npx convex env set HERMES_MODEL
npx convex env set OPENAI_EMBEDDING_MODEL
```

`HERMES_GATEWAY_URL` and `HERMES_GATEWAY_TOKEN` are optional secured Convex runtime settings. When unavailable, the backend uses its grounded OpenAI/fallback path. No resume embeddings or vector similarity are active.

## Setup and verification

```powershell
npm install
npm run codegen
npm run typecheck
npm test
npm test --prefix lever-job-scraper
```

`npm run codegen` may generate a local Convex `.env.local`; remove it and retain only `.env` after generation.

## Lever import

The scraper loads the parent backend `.env` explicitly when invoked from `lever-job-scraper`. It does not need live scraping for the demo.

```powershell
npm run import:lever -- --input .\path\to\output\lever\manifest.json
```

The importer accepts a manifest with `jobs` or one canonical Lever job JSON file. It upserts by `platform + externalJobId`, preserves `embedding` exactly (including `null`), and prints `inserted`, `updated`, `skipped`, and `invalid` counts. Imported jobs retain the existing matching fields and normalized source fields.

## Run orchestration

`run-manager -> matching-specialist -> hermes-explainer` communicate only through persisted Convex records.

- `runs`: immutable input snapshot, status, rankings, explanations, errors
- `toolCalls`: named specialist execution evidence
- `runLogs`: human-readable handoffs by run, agent, and task
- `evaluations`: seeded reproducible scenario results

Matching is deterministic and never calls a model. Hermes receives only persisted ranking evidence and cannot alter scores, ranks, or source data. Explanation failure stores a grounded fallback while the completed ranking remains usable.

## HTTP routes

Existing applicant, recruiter, match, seed, and health routes remain unchanged. New routes return JSON:

- `POST /runs` with `{ "actor": "applicant"|"recruiter", "personaId": "..." }`
- `POST /runs/{runId}/execute`
- `GET /runs/{runId}`
- `GET /runs/{runId}/logs`
- `POST /runs/{runId}/rerun`
- `POST /evaluations/{scenarioId}/run`

## Demo commands

```powershell
npm run seed
# POST /runs with candidate_07 or recruiter_03
# POST /runs/{runId}/execute
# POST /evaluations/applicant-to-job-v1/run
# POST /evaluations/recruiter-to-candidate-v1/run
```

The stable evaluation expectations are `candidate_07 -> job_102` and `recruiter_03 -> candidate_07`.
