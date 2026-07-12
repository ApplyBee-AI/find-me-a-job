# Find Me a Job Backend Architecture

## Purpose

The backend supports two independent, role-specific workflows on the same Convex deployment:

1. **Recruiter flow** — a recruiter describes a role and receives ranked applicant matches plus recruiter-agent guidance.
2. **Applicant flow** — an applicant profile is matched to active jobs and receives applicant-agent guidance for a selected job.

The UI is a separate client. It calls the public Convex functions or the HTTP routes below; no UI behavior belongs in this repository.

---

## Shared Components

### Convex data model

`convex/schema.ts` defines the shared tables:

- `jobs` — shared Lever/imported postings. Current scraped records use `externalId`; legacy demo records retain `publicId`, and both identifiers are supported during the migration.
- `applicants` — applicant profile and resume-derived evidence, indexed by `publicId`.
- `recruiters` — recruiter hiring requirements, indexed by `publicId`.
- `sessions` — persistent conversational state for either role.
- `runLogs` — audit trail for each assistant run.

A session and log record use `role: "applicant" | "recruiter"`, which keeps the two workflows distinguishable while sharing the same persistence conventions.

### Matching

`convex/lib/matching.ts` performs deterministic, explainable matching before any LLM call:

- applicant → jobs: compares applicant skills, target roles, location/remote preference, and experience against job requirements.
- recruiter → applicants: compares recruiter priority skills, target role, work mode, and interview focus against applicant profiles.

The deterministic match object is the source of truth for scores and gaps. The LLM is only allowed to explain the supplied data; it must not invent candidate or job facts.

### Agent runtime and fallback

`convex/hermes.ts` provides both role-specific Convex actions.

- If `OPENAI_API_KEY` is configured in Convex, the action calls OpenAI Responses using `HERMES_MODEL` (default: `gpt-4.1`).
- If no key is configured or the model does not return text, the action returns a deterministic fallback answer from `convex/lib/matching.ts`.
- Every run writes a `sessions` record and a `runLogs` audit record.

---

## Recruiter Flow

### Goal

Help a recruiter identify and evaluate applicants for a role.

### Request flow

```text
Recruiter UI
  → GET /recruiters
  → GET /recruiters/:recruiterId
  → GET /recruiters/:recruiterId/candidate-matches
  → POST /recruiters/:recruiterId/ask-agent
  → Convex: recruiters.getByPublicId + recruiters.getCandidateMatches
  → deterministic recruiter-to-candidate ranking
  → Convex: hermes.askRecruiter
  → OpenAI explanation or deterministic fallback
  → sessions + runLogs
  → recruiter UI response
```

### API contract

- `GET /recruiters` — list recruiter personas.
- `GET /recruiters/:recruiterId` — retrieve one recruiter profile.
- `GET /recruiters/:recruiterId/candidate-matches` — return top ranked applicants.
- `POST /recruiters/:recruiterId/ask-agent`
  - body: `{ "query": string, "sessionId"?: string, "selectedCandidateId"?: string }`
  - result: selected candidate, top matches, answer, execution mode, `sessionId`, and `runId`.

The generic equivalent is `POST /match/recruiter-to-candidates` with `{ "recruiterId": string, "limit"?: number }`.

---

## Applicant Flow

### Goal

Help an applicant understand their strongest job matches, evidence, skill gaps, and next steps for a selected role.

### Request flow

```text
Applicant UI
  → GET /applicants
  → GET /applicants/:applicantId
  → GET /applicants/:applicantId/job-matches
  → POST /applicants/:applicantId/ask-agent
  → Convex: applicants.getByPublicId + applicants.getJobMatches
  → deterministic applicant-to-job ranking
  → Convex: hermes.askApplicant
  → OpenAI explanation or deterministic fallback
  → sessions + runLogs
  → applicant UI response
```

### API contract

- `GET /applicants` — list applicant personas.
- `GET /applicants/:applicantId` — retrieve one applicant profile.
- `GET /applicants/:applicantId/job-matches` — return top ranked jobs and match reasons/gaps.
- `POST /applicants/:applicantId/ask-agent`
  - body: `{ "query": string, "sessionId"?: string, "selectedJobId"?: string }`
  - result: selected job, top matches, answer, execution mode, `sessionId`, and `runId`.

The generic equivalent is `POST /match/applicant-to-jobs` with `{ "applicantId": string, "limit"?: number }`.

### Applicant session behavior

1. The caller supplies an existing `sessionId`, or `hermes.askApplicant` creates one.
2. The selected job is the supplied `selectedJobId` when it is in the top matches; otherwise the highest-ranked job is used.
3. The backend persists `selectedMatchId`, the applicant query, the latest ranked job IDs, and a run ID.
4. The caller reuses the returned `sessionId` for follow-up questions about the same applicant/job context.

---

## Existing Backend Mapping

| Concern | Recruiter implementation | Applicant implementation |
| --- | --- | --- |
| Profile query | `convex/recruiters.ts` | `convex/applicants.ts` |
| Match query | `getCandidateMatches` | `getJobMatches` |
| Agent action | `hermes.askRecruiter` | `hermes.askApplicant` |
| HTTP routes | `/recruiters/*` | `/applicants/*` |
| Match endpoint | `/match/recruiter-to-candidates` | `/match/applicant-to-jobs` |
| Session role | `"recruiter"` | `"applicant"` |

The applicant path already exists in the current backend and follows the same conventions as the recruiter path. No backend schema or endpoint change is required solely to expose this documented flow.

---

## Data Boundaries

- The production `jobs` table is the shared job source.
- Applicant records must be created/imported in the `applicants` table before the applicant flow can return matches.
- Local synthetic resumes are test fixtures only. They are not automatically synced into Convex and must be explicitly transformed/imported before use as applicant records.
- Do not expose `OPENAI_API_KEY` to a UI client. It belongs only in Convex environment variables when live LLM responses are desired.

---

## Verification

Backend verification should cover:

1. applicant lookup by `publicId`;
2. deterministic applicant-to-job ranking;
3. selected-job fallback when no valid selection is supplied;
4. session and run-log persistence with `role: "applicant"`;
5. deterministic fallback behavior when `OPENAI_API_KEY` is absent;
6. parity with the recruiter flow without coupling either UI.
