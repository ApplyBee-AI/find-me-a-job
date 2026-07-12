# Future Presentation Notes — Find Me a Job

## Purpose

This is an honest presentation outline for use only if the project reaches a selection/demo stage. It records what exists today, what can be demonstrated, and what must not be claimed yet.

## Current evidence we can show

### 1. Provenance-first development evaluation set

- Started with a local review set of **12 public educational resume examples**.
- Sources: three Carnegie Mellon University career-service sample packets.
- Coverage: business (4), computer science (5), engineering (3).
- Every selected PDF has source packet/page, source URL, SHA-256 checksum, and extractable-text validation.
- After explicit approval, the development database contains 12 **sanitized synthetic demo applicant profiles** derived from those examples:
  - original contact details removed;
  - fictional Indian and Western demo names and locations assigned;
  - source provenance retained;
  - `text-embedding-3-small` embeddings generated; and
  - profiles marked `public-educational-example`.
- Original PDFs remain local-only and excluded from Git.

Suggested phrase:
> “We use a provenance-first evaluation path: 12 publicly available educational examples are traceable to source, sanitized before development ingestion, and represented as clearly labeled synthetic demo profiles rather than real applicants.”

### 2. Applicant pipeline

The development backend currently demonstrates:

```text
Applicant profile
  → deterministic job matching
  → ranked match explanations and gap analysis
  → applicant assistant guidance
  → session and run-log persistence
```

Evidence already verified:

- applicant list and profile lookup;
- top ranked job matches;
- direct matching API;
- assistant response with a returned session ID;
- live OpenAI mode when server configuration is present, with deterministic fallback available;
- current Lever jobs and legacy demo jobs both supported through identifier compatibility.

Suggested phrase:
> “The applicant experience is not just a chat response: every recommendation is grounded in a deterministic score breakdown, matched skills, missing skills, evidence lines, and a next action.”

### 3. Safe shared-data migration

- Shared job records use current Lever `externalId` values.
- Legacy demo records use `publicId` values.
- The backend matches against both shapes rather than deleting data to force a migration.
- Seeding preserves existing jobs.

Suggested phrase:
> “We designed for integration reality: the system accepts the existing job contract while preserving legacy compatibility, instead of requiring a destructive data reset.”

### 4. Reproducibility and testing

Available evidence:

- backend TypeScript typecheck;
- unit tests for external-ID matching and importer mapping;
- local API smoke test for the applicant flow;
- scraper typecheck and tests;
- dependency audit;
- documented reimplementation prompt in `docs.md`.

Suggested phrase:
> “The workflow is reproducible: a new engineer or agent can follow the documented API contract, run the test matrix, and re-create the applicant flow without relying on tribal knowledge.”

## Recommended presentation sequence

1. **Problem** — job matching is opaque; applicants do not know why a role fits or what to improve.
2. **Trust design** — show provenance-first resume review before any ingestion.
3. **Applicant demo** — select a profile, show top matches, expand score reasons and skill gaps.
4. **Agent demo** — ask a job-specific question; show grounded response, selected match, and session continuity.
5. **Architecture** — show deterministic scoring + optional AI explanation + Convex persistence.
6. **Reliability** — show tests, fallback behavior, schema compatibility, and job-preserving seed behavior.
7. **Roadmap** — scale only after review/approval gates.

## Metrics to collect before a real pitch

Do not invent results. Instrument and measure these after an approved corpus import:

| Metric | Why it matters |
|---|---|
| Reviewed examples / approved examples / rejected examples | Shows human control and data quality. |
| Provenance coverage | Every imported document should have a source and checksum. |
| Parse success rate | Measures structured applicant extraction quality. |
| Match relevance review score | Human judgment of top-3 match quality. |
| Assistant fallback rate | Shows model/dependency resilience. |
| Match and assistant latency | Demonstrates product responsiveness. |
| Session continuation success | Verifies multi-turn applicant guidance. |
| Skill-gap action completion | Future measure of applicant usefulness. |

## Scale roadmap — present only as planned work

### Phase 1: Controlled evaluation

- Human review of the current 12 examples.
- Explicit approval list before database import.
- No external resume content committed to Git.

### Phase 2: Approved ingestion

- Parse only approved examples into structured applicant records.
- Retain document provenance and import timestamp.
- Add deletion/retention controls.
- Re-run matching and API smoke tests against imported profiles.

### Phase 3: Broader benchmark

- Expand to a larger, consented or clearly licensed corpus.
- Define role/category coverage targets.
- Add blinded human match-quality evaluation.
- Compare deterministic matching, embedding-assisted matching, and agent explanations.

### Phase 4: Production readiness

- Authentication and authorization.
- Private document storage and deletion controls.
- Audit views for imports, matching, and agent runs.
- Rate limits, monitoring, cost controls, and privacy review.

## Claims to avoid

Do not claim any of the following unless they become true and are measured:

- “We imported 12 resumes into Convex.”
- “We have real applicant data.”
- “The model is unbiased.”
- “The agent always provides correct career advice.”
- “The evaluation set is production-grade.”
- “We have scaled the corpus beyond the current 12 review examples.”

## Presentation-builder prompt

```text
Create a concise technical product presentation for Find Me a Job. Be precise and evidence-based.

Current verified state:
- A Convex applicant pipeline lists profiles, ranks job matches, provides score reasons/gaps, supports an applicant assistant, and persists sessions/logs.
- Matching uses deterministic skill, role, experience, location, and semantic-relevance signals; AI is optional and has a deterministic fallback.
- A local-only review set contains 12 publicly available educational resume examples from 3 career-service source packets. After explicit approval, the development Convex database contains 12 sanitized, provenance-linked synthetic demo profiles derived from those examples, each with a `text-embedding-3-small` embedding. Original PDFs and contact details are not stored in Convex.
- Existing Lever job data and legacy demo job data are compatible without destructive migration.
- Type checks, unit tests, scraper tests, API smoke tests, and a dependency audit have passed.

Required slides:
1. Problem and applicant pain point.
2. Trust-first resume review and provenance gate.
3. Applicant journey: profile → ranked jobs → gap analysis → agent guidance.
4. Architecture: Convex, deterministic matcher, optional OpenAI response, sessions/logs.
5. Reliability and test evidence.
6. Controlled scaling roadmap.
7. Clear request/next step.

Rules:
- Do not claim that the 12 review resumes were imported or are real applicant data.
- Do not show or repeat resume contact information.
- Label future scale, benchmarks, privacy controls, and production readiness as roadmap work.
- Use diagrams, simple metrics placeholders, and a confident but technically accurate tone.
```
