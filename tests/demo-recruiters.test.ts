import * as assert from "node:assert/strict";
import test from "node:test";
import { demoRecruiters } from "../scripts/import-demo-recruiters.mjs";

test("defines named synthetic recruiters with unique companies and matching fields", () => {
  assert.equal(demoRecruiters.length, 6);
  assert.equal(new Set(demoRecruiters.map((recruiter) => recruiter.publicId)).size, demoRecruiters.length);
  assert.equal(new Set(demoRecruiters.map((recruiter) => recruiter.company)).size, demoRecruiters.length);

  for (const recruiter of demoRecruiters) {
    assert.equal(recruiter.isExample, true);
    assert.equal(recruiter.sourceKind, "synthetic-demo-recruiter");
    assert.ok(recruiter.name.includes(" "));
    assert.ok(recruiter.company.length > 3);
    assert.ok(recruiter.roleToHire.length > 3);
    assert.ok(recruiter.prioritySkills.length > 0);
  }
});
