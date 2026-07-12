# Find Me a Job Backend

Convex backend for the hackathon demo. This service keeps deterministic job and candidate matching as the source of truth, then uses Hermes as the explanation and follow-up layer.

## What This Backend Does

- Stores seeded demo data for jobs, applicants, and recruiter personas.
- Computes deterministic matches with a visible score breakdown.
- Exposes applicant and recruiter APIs for the UI.
- Uses Hermes to explain rankings, missing skills, and next steps.
- Persists lightweight session memory and run logs in Convex.

## Architecture

- `Convex` is the system of record for demo state, memory, and logs.
- `Matching engine` is deterministic and returns score reasons first.
- `Hermes gateway` sits on top of those results and handles natural-language explanations.
- `HTTP endpoints` in [`convex/http.ts`](D:\Projects\find-me-a-job\convex\http.ts) are the integration surface for the UI.

This follows the UI repo contract in `find-me-a-job-UI-Repo/docs/Architecture.md` and `find-me-a-job-UI-Repo/docs/Features.md`:

- Modular monolith over microservices.
- Deterministic ranking before LLM explanation.
- Persisted run state and logs for judge-visible demo evidence.

## Tables

- `jobs`: normalized role records for applicant matching
- `applicants`: seeded candidate personas and resume evidence
- `recruiters`: seeded hiring stories and skill priorities
- `sessions`: current role, persona, last query, selected match, last run
- `runLogs`: Hermes activity trail for observability

## Match Response Shape

Applicant-to-job and recruiter-to-candidate matches use this shape:

```json
{
  "score": 86,
  "summary": "Strong fit for Backend Engineer roles.",
  "matchedSkills": ["Python", "FastAPI", "Docker"],
  "missingSkills": ["AWS", "PostgreSQL"],
  "nextStep": "Highlight or build evidence for AWS and PostgreSQL next."
}
```

Each record also includes a `reasons` object:

```json
{
  "skillMatch": 92,
  "roleMatch": 90,
  "experienceMatch": 75,
  "locationMatch": 100,
  "semanticMatch": 78
}
```

## Hermes Gateway

Hermes is implemented in [`convex/hermes.ts`](D:\Projects\find-me-a-job\convex\hermes.ts).

Inputs:

- current role
- selected applicant or recruiter persona
- deterministic top matches
- selected job or candidate
- user query

Behavior:

- explains why a match scored well or poorly
- suggests missing skills or resume improvements
- recommends recruiter interview prompts
- persists session memory and run logs

If `OPENAI_API_KEY` is available in Convex env, Hermes calls the OpenAI Responses API. If the key is missing or the model call fails, the backend falls back to grounded deterministic responses so the demo still works.

## HTTP API

Applicant:

- `GET /applicants`
- `GET /applicants/{id}`
- `GET /applicants/{id}/job-matches`
- `POST /applicants/{id}/ask-agent`

Recruiter:

- `GET /recruiters`
- `GET /recruiters/{id}`
- `GET /recruiters/{id}/candidate-matches`
- `POST /recruiters/{id}/ask-agent`

Shared:

- `POST /match/applicant-to-jobs`
- `POST /match/recruiter-to-candidates`

Utility:

- `GET /health`
- `POST /seed`

Example applicant agent request:

```json
{
  "query": "Why is this only a 72% match?",
  "selectedJobId": "job_101"
}
```

Example recruiter agent request:

```json
{
  "query": "Why is Candidate 7 ranked first?",
  "selectedCandidateId": "candidate_07"
}
```

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Initialize or link this repo to a Convex project:

```bash
npx convex dev
```

This step generates `convex/_generated/*` and prompts you to create or select the Convex project.

3. Set backend env in Convex:

- `OPENAI_API_KEY`
- optional: `HERMES_MODEL` (defaults to `gpt-4.1`)

4. Seed the demo data:

```bash
npm run seed
```

5. Run the backend locally:

```bash
npm run dev
```

## Frontend Integration Notes

- The UI can call the HTTP routes directly once Convex is running.
- Applicant pages should use `candidate_07` for the strongest demo path.
- Recruiter pages should use `recruiter_03` for the strongest Hermes explanation path.
- Run logs can be queried from the `runLogs` table during the demo to show memory and orchestration evidence.

## Repo Layout

```text
convex/
├── applicants.ts
├── hermes.ts
├── http.ts
├── jobs.ts
├── logs.ts
├── matching.ts
├── recruiters.ts
├── schema.ts
├── seed.ts
├── sessions.ts
└── lib/
    ├── matching.ts
    └── seedData.ts
```

## Current Limitation

This repo does not include checked-in Convex generated files yet. Run `npx convex dev` once after linking the project so `convex/_generated` is created before typechecking or deployment.
