import * as assert from "node:assert/strict";
import test from "node:test";
import { rankJobsForApplicant } from "../convex/lib/matching.ts";

test("ranks a job stored in the shared externalId schema for an applicant", () => {
  const matches = rankJobsForApplicant(
    {
      publicId: "candidate_01",
      name: "Sample Applicant",
      targetRoles: ["Backend Engineer"],
      skills: ["TypeScript", "Node.js", "PostgreSQL"],
      resumeText: "Built backend services with TypeScript and PostgreSQL.",
      location: "Remote",
      remote: true,
      experienceYears: 4,
      education: "B.S. Computer Science",
      availability: "Immediate",
      projects: ["Built a job matching API."],
      evidenceLines: ["Shipped TypeScript APIs."],
      profileStory: "Backend engineer.",
    },
    [
      {
        externalId: "lever-123",
        company: "Acme",
        title: "Backend Engineer",
        location: "Remote",
        jobUrl: "https://jobs.lever.co/acme/lever-123",
        applicationLink: "https://jobs.lever.co/acme/lever-123/apply",
        description: "Build reliable backend APIs.",
        summary: "Own backend services.",
        requirements: "TypeScript and PostgreSQL.",
        skills: ["TypeScript", "Node.js", "PostgreSQL"],
        jobType: "FULL_TIME",
        employmentType: "Full-time",
        seniorityLevel: "Mid Level",
        experienceLevel: "Mid Level",
        isRemote: true,
        minYearsExperience: 3,
        sectorTags: ["Technology"],
        isExternal: true,
        postedDate: "2026-07-12",
        scrapedAt: "2026-07-12T00:00:00.000Z",
        isActive: true,
        extraData: { work_mode: "Remote" },
      },
    ],
  );

  assert.equal(matches[0].jobId, "lever-123");
  assert.equal(matches[0].missingSkills.length, 0);
  assert.equal(matches[0].reasons.experienceMatch, 100);
});
