# Applicant Flow Reimplementation Prompt and Backend Reference

## Use this document as the prompt

You are implementing or restoring the Find Me a Job applicant backend flow in a repository that may have merge conflicts. Treat this file as the functional source of truth for the applicant flow. Preserve the recruiter flow and do **not** change UI files unless a separate request explicitly asks for UI work.

Your objective is to restore a tested Convex applicant pipeline that:

1. stores or upserts applicant profiles;
2. matches applicants to the shared Lever jobs table;
3. supports both the current Lever job identifier (`externalId`) and legacy demo identifier (`publicId`);
4. serves applicant profile, matches, and assistant calls through HTTP;
5. uses OpenAI only when configured and otherwise gives deterministic fallback guidance;
6. persists session and run-log records; and
7. preserves existing shared jobs during seeds and migrations.

Never put credentials in source, HTTP responses, `NEXT_PUBLIC_*` variables, test output, or this document.

---

## Repository workflow map

| File | Responsibility |
|---|---|
| `convex/schema.ts` | Shared Convex tables, validators, and indexes. |
| `convex/applicants.ts` | Applicant list/get, job matches, applicant upsert, and resume parsing action. |
| `convex/recruiters.ts` | Existing recruiter list/get and candidate-matching flow. Preserve it. |
| `convex/jobs.ts` | Job lookup compatible with both identifiers. |
| `convex/matching.ts` | Deterministic applicant-to-job and recruiter-to-candidate rankers. |
| `convex/lib/matching.ts` | Pure matching/scoring and deterministic fallback answer generation. |
| `convex/lib/leverImport.ts` | Maps raw Lever scraper output to the shared external-ID job record shape. |
| `convex/hermes.ts` | Applicant/recruiter assistant actions, OpenAI Responses calls, session persistence, and logs. |
| `convex/sessions.ts` | Session upsert/read operations. |
| `convex/logs.ts` | Run-log writes/reads. |
| `convex/seed.ts` | Seeds applicants/recruiters only; must preserve the shared jobs table. |
| `convex/http.ts` | Public HTTP routes and request validation. |
| `scripts/smoke-applicant-api.mjs` | Repeatable local caller that verifies the live applicant API contract. |
| `tests/applicant-matching.test.ts` | Unit regression test for matching an `externalId` Lever record. |
| `tests/importer.test.ts` | Unit regression tests for Lever import mapping and deterministic upsert classification. |
| `architecture.md` | Recruiter/applicant architecture and data-boundary overview. |

---

## Shared data contract

### `jobs`

The deployment can contain two valid job shapes during migration:

1. Current imported Lever jobs use `externalId`, `jobUrl`, `applicationLink`, `summary`, `requirements`, `isRemote`, and `extraData`.
2. Legacy demo jobs use `publicId`, `applyUrl`, `workMode`, and `highlights`.

Required fields common to both shapes:

```ts
{
  company: string;
  title: string;
  location: string;
  skills: string[];
  experienceLevel: string;
  description: string;
}
```

Compatibility rules:

```ts
const jobId = job.publicId ?? job.externalId;
const workMode = job.workMode ?? (job.isRemote ? "Remote" : "");
const highlights = job.highlights ?? [job.summary, job.requirements].filter(Boolean);
const minYearsExperience = job.minYearsExperience ?? 0;
```

Keep both indexes:

```ts
.index("by_public_id", ["publicId"])
.index("by_external_id", ["externalId"])
```

Do not replace the jobs schema with a strict legacy-only schema and do not use `seedDemo({ force: true })` to wipe jobs. The known development dataset contains current external-ID Lever records plus legacy public-ID records.

### `applicants`

```ts
{
  publicId: string;
  name: string;
  targetRoles: string[];
  skills: string[];
  resumeText: string;
  location: string;
  remote: boolean;
  experienceYears: number;
  education: string;
  availability: string;
  projects: string[];
  evidenceLines: string[];
  profileStory: string;
}
```

Index: `by_public_id` on `publicId`.

### Sessions and logs

- `sessions` stores `sessionId`, role, persona ID, selected match, recent query, latest run ID, match IDs, and update timestamp.
- `runLogs` records role, persona, session, agent type, action, message, optional JSON payload, and timestamp.
- The applicant assistant must write both after every response, whether live or fallback.

---

## Applicant workflow

```text
resume text (optional)
  -> applicants.parseResume action
  -> applicants.upsertApplicant mutation
  -> applicants.getJobMatches query
  -> deterministic rankJobsForApplicant
  -> HTTP response / applicant UI
  -> hermes.askApplicant action
  -> OpenAI Responses API when configured, otherwise deterministic fallback
  -> sessions.upsert + logs.write
```

### Resume parsing and upsert

`applicants.parseResume` accepts:

```ts
{ resumeText: string }
```

It generates a public applicant ID. When `OPENAI_API_KEY` exists in Convex environment configuration, it calls OpenAI Responses using `HERMES_MODEL` or `gpt-4.1` by default and asks for structured applicant data. If the call is unavailable or fails, it uses deterministic heuristics:

- scans known skill terms;
- uses a short first line as a candidate name when appropriate;
- retains safe fallback profile defaults.

It must then call `applicants.upsertApplicant` and return the stored profile. Keep the OpenAI key server-side only.

### Deterministic matching method

`rankJobsForApplicant(applicant, jobs)` must:

1. normalize string comparisons by trim/lowercase;
2. find skill overlap;
3. calculate missing skills;
4. score target-role alignment;
5. score experience using `minYearsExperience ?? 0`;
6. score location with remote compatibility;
7. calculate lightweight token-overlap semantic relevance using resume/projects against job title, description, and highlights/summary/requirements;
8. calculate and clamp the final score:

```text
skill match       40%
role match        25%
experience match  20%
location match    10%
semantic match     5%
```

9. sort descending by final score; and
10. return this contract:

```ts
{
  applicantId: string;
  jobId: string;
  score: number; // integer 0–100
  reasons: {
    skillMatch: number;
    roleMatch: number;
    experienceMatch: number;
    locationMatch: number;
    semanticMatch: number;
  };
  summary: string;
  matchedSkills: string[];
  missingSkills: string[];
  evidenceLines: string[];
  nextStep: string;
}
```

### Applicant assistant method

`hermes.askApplicant` accepts:

```ts
{
  applicantId: string;
  query: string;
  sessionId?: string;
  selectedJobId?: string;
}
```

Method sequence:

1. load applicant;
2. calculate the top five matches;
3. select the requested job match, or default to the highest ranked match;
4. resolve the selected job by `publicId` then `externalId`;
5. generate deterministic fallback guidance from match evidence;
6. if `OPENAI_API_KEY` is set, call `POST https://api.openai.com/v1/responses` with `HERMES_MODEL` or `gpt-4.1` and only the supplied applicant/job/match facts;
7. mark the result `mode: "live"` only when valid model text is returned; otherwise use `mode: "fallback"`;
8. persist session and run log; and
9. return:

```ts
{
  sessionId: string;
  runId: string;
  mode: "live" | "fallback";
  answer: string;
  selectedMatch: ApplicantJobMatch;
  topMatches: ApplicantJobMatch[];
}
```

---

## HTTP API contract

All endpoints are implemented in `convex/http.ts` and use the configured Convex HTTP site URL. Do not hard-code a deployment URL in source.

| Method | Route | Success contract |
|---|---|---|
| `GET` | `/health` | `{ "ok": true, "service": "find-me-a-job-backend" }` |
| `GET` | `/applicants` | `Applicant[]` |
| `GET` | `/applicants/:applicantId` | `Applicant` or `404 { "error": ... }` |
| `GET` | `/applicants/:applicantId/job-matches` | `{ applicant: Applicant, matches: ApplicantJobMatch[] }` |
| `POST` | `/match/applicant-to-jobs` | body `{ applicantId: string, limit?: number }`; returns `ApplicantJobMatch[]` |
| `POST` | `/applicants/:applicantId/ask-agent` | body `{ query: string, sessionId?: string, selectedJobId?: string }`; returns assistant contract above |
| `POST` | `/seed` | Seeds applicants/recruiters; preserves jobs |

Invalid request behavior:

- unknown applicant route: HTTP `404` with `{ error: string }`;
- missing `applicantId` for `/match/applicant-to-jobs`: HTTP `400` with `{ error: string }`;
- missing string `query` for `ask-agent`: HTTP `400` with `{ error: string }`.

The recruiter API is parallel and must remain intact:

```text
GET  /recruiters
GET  /recruiters/:recruiterId
GET  /recruiters/:recruiterId/candidate-matches
POST /recruiters/:recruiterId/ask-agent
POST /match/recruiter-to-candidates
```

---

## Recreate/development procedure

1. Install dependencies without changing lockfiles:

```bash
npm ci
```

2. Connect this backend checkout to the intended **development** Convex deployment. If prompted, select the existing project deliberately. Do not select production for exploratory testing.

```bash
npx convex dev --once --typecheck enable
```

3. Confirm existing job records before changing schema:

```bash
npx convex data jobs --limit 200 --format json
```

4. If existing records use `externalId`, preserve the compatibility schema and both indexes described above. Do not delete jobs to force a schema change.

5. Configure server-side OpenAI only through Convex environment settings if live assistant/resume parsing is desired:

```bash
npx convex env set OPENAI_API_KEY
npx convex env set HERMES_MODEL gpt-4.1
```

Never expose these values to browser code or commit them.

6. Deploy/check the development functions again:

```bash
npx convex dev --once --typecheck enable
```

---

## Required tests

Run all of these before claiming the workflow is restored:

```bash
npm run typecheck
node --test tests/*.test.ts
npm run test:applicant-api
git diff --check
npm audit --omit=dev --audit-level=high
```

The API smoke script loads `CONVEX_SITE_URL` from `.env.local` or the shell environment and verifies, in one bounded run:

- health endpoint;
- applicant listing and profile lookup;
- ranked applicant matches;
- direct applicant matching;
- one applicant assistant response;
- valid `live` or `fallback` mode;
- returned `sessionId`.

The unit suite must include:

- matching a current Lever `externalId` record;
- Lever importer contract mapping;
- deterministic upsert classification.

For scraper validation, run from `lever-job-scraper/`:

```bash
npx tsc --noEmit
npm test
```

---

## Merge-conflict resolution rules

1. Prefer the shared-job compatibility model over either a pure legacy or pure new schema.
2. Keep `jobs.getByPublicId` behavior compatible: check `publicId`, then `externalId`.
3. Preserve recruiter endpoints and behavior.
4. Preserve the deterministic fallback path. OpenAI must be optional, not required for matching or guidance.
5. Do not delete jobs in seed/reset code.
6. Do not add UI changes in this backend restoration.
7. Regenerate Convex bindings and run the full test matrix after resolving conflicts.
8. Report any deployment/schema migration that would delete indexes, alter existing tables, or change production data before performing it.

## Completion criteria

The reimplementation is complete only when the applicant API smoke script passes, `npm run typecheck` passes, all unit tests pass, current `externalId` jobs produce ranked matches, the assistant returns a non-empty live/fallback answer plus session ID, and the shared jobs count remains unchanged after seeding.
