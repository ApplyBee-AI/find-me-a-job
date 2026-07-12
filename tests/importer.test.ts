import * as assert from "node:assert/strict";
import * as test from "node:test";
import {
  classifyUpsert,
  mapLeverJob,
  type LeverJobInput,
} from "../convex/lib/leverImport.ts";

const leverJob: LeverJobInput = {
  id: "source-uuid",
  job_id_external: "lever-123",
  platform: "lever",
  company: "Acme",
  job_title: "Senior Backend Engineer",
  location: "Bengaluru, India",
  salary_range: "$120,000 - $150,000 annually",
  job_url: "https://jobs.lever.co/acme/lever-123",
  application_link: "https://jobs.lever.co/acme/lever-123/apply",
  description: "Build reliable APIs.",
  summary: "Own backend services.",
  requirements: "TypeScript and PostgreSQL.",
  skills: ["TypeScript", "Node.js", "PostgreSQL"],
  job_type: "FULL_TIME",
  employment_type: "Full-time",
  seniority_level: "Senior Level",
  experience_level: "Senior Level",
  is_remote: false,
  min_years_experience: 3,
  max_years_experience: 5,
  min_salary: 120000,
  max_salary: 150000,
  latitude: 12.9716,
  longitude: 77.5946,
  sector_tags: ["Technology"],
  is_external: true,
  posted_date: "2026-07-10",
  scraped_at: "2026-07-12T05:39:00.000Z",
  is_active: true,
  extra_data: { work_mode: "Hybrid", company_logo: null, perks: ["Health"] },
  embedding: [0.12, -0.34],
};

test("maps canonical Lever output without dropping null-capable embedding data", () => {
  const mapped = mapLeverJob(leverJob, { embeddingModel: "text-embedding-3-small" });

  assert.equal(mapped.publicId, "lever:lever-123");
  assert.equal(mapped.platform, "lever");
  assert.equal(mapped.externalJobId, "lever-123");
  assert.equal(mapped.workMode, "Hybrid");
  assert.equal(mapped.minYearsExperience, 3);
  assert.deepEqual(mapped.embedding, [0.12, -0.34]);
  assert.equal(mapped.embeddingModel, "text-embedding-3-small");
  assert.equal(mapped.sourceMetadataJson, JSON.stringify(leverJob.extra_data));
});

test("classifies an import as inserted, updated, or skipped deterministically", () => {
  const mapped = mapLeverJob(leverJob);

  assert.equal(classifyUpsert(undefined, mapped), "inserted");
  assert.equal(classifyUpsert({ ...mapped }, mapped), "skipped");
  assert.equal(
    classifyUpsert({ ...mapped, description: "Older description" }, mapped),
    "updated",
  );
});
