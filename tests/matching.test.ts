import * as assert from "node:assert/strict";
import { test } from "node:test";
import { applicants, jobs, recruiters } from "../convex/lib/seedData";
import { rankCandidatesForRecruiter, rankJobsForApplicant } from "../convex/lib/matching";

test("seeded applicant ranking is deterministic and keeps the expected top job", () => {
  const applicant = applicants.find((item) => item.publicId === "candidate_07");
  assert.ok(applicant);

  const first = rankJobsForApplicant(applicant, jobs);
  const second = rankJobsForApplicant(applicant, jobs);

  assert.deepEqual(first, second);
  assert.equal(first[0]?.jobId, "job_102");
  assert.ok(first[0]?.evidenceLines.length);
});

test("seeded recruiter ranking is deterministic and keeps the expected top candidate", () => {
  const recruiter = recruiters.find((item) => item.publicId === "recruiter_03");
  assert.ok(recruiter);

  const first = rankCandidatesForRecruiter(recruiter, applicants);
  const second = rankCandidatesForRecruiter(recruiter, applicants);

  assert.deepEqual(first, second);
  assert.equal(first[0]?.candidateId, "candidate_07");
  assert.ok(first[0]?.matchedSkills.includes("RAG"));
});
