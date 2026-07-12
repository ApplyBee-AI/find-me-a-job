import * as assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeImportedJob, recruiterFromJob } from "../convex/lib/jobNormalization";

test("normalizes a legacy imported job without changing its embedding", () => {
  const normalized = normalizeImportedJob({
    externalId: "lever-42", platform: "lever", company: "Acme", title: "Platform Engineer",
    location: "Bengaluru", skills: ["TypeScript"], experienceLevel: "Senior",
    summary: "Build platform tooling.", requirements: "TypeScript experience.",
    applicationLink: "https://jobs.example.test/apply", extraData: { work_mode: "Hybrid" },
    embedding: [0.1, -0.2],
  }, "2026-07-12T00:00:00.000Z");
  assert.ok(normalized);
  assert.equal(normalized.publicId, "lever:lever-42");
  assert.equal(normalized.workMode, "Hybrid");
  assert.equal(normalized.description, "Build platform tooling.\n\nTypeScript experience.");
  assert.deepEqual(normalized.embedding, [0.1, -0.2]);
});

test("rejects an imported job without application or description evidence", () => {
  assert.equal(normalizeImportedJob({ externalId: "missing" }, "2026-07-12T00:00:00.000Z"), null);
});

test("derives a recruiter record from a canonical stored job", () => {
  const recruiter = recruiterFromJob({
    publicId: "lever:42", company: "Acme", title: "Platform Engineer", location: "Remote",
    workMode: "Remote", skills: ["TypeScript", "PostgreSQL"], experienceLevel: "Senior",
    minYearsExperience: 4, description: "Build platform tooling.",
    applyUrl: "https://jobs.example.test/apply", highlights: [],
  }, 123);
  assert.equal(recruiter.publicId, "recruiter:lever:42");
  assert.equal(recruiter.jobPublicId, "lever:42");
  assert.deepEqual(recruiter.interviewFocus, ["TypeScript", "PostgreSQL"]);
});
