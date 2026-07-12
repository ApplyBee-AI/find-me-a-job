import * as assert from "node:assert/strict";
import test from "node:test";
import { buildManualRecruiter } from "../convex/lib/recruiterProfile";

test("builds a normalized recruiter role profile from manual form input", () => {
  const recruiter = buildManualRecruiter({
    company: " Acme AI ",
    roleToHire: " Backend Engineer ",
    prioritySkills: ["TypeScript", "typescript", "PostgreSQL"],
    niceToHave: ["AWS"],
    story: "Build reliable matching services.",
    location: "Remote",
    workMode: "Remote",
    interviewFocus: ["System design"],
  }, "recruiter:test-id", 123);

  assert.equal(recruiter.publicId, "recruiter:test-id");
  assert.deepEqual(recruiter.prioritySkills, ["TypeScript", "PostgreSQL"]);
  assert.equal(recruiter.company, "Acme AI");
  assert.equal(recruiter.updatedAt, 123);
});
