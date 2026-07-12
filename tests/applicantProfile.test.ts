import * as assert from "node:assert/strict";
import { test } from "node:test";
import { extractEvidence, extractSkills, inferTargetRoles } from "../convex/lib/applicantProfile";

const resume = `Built and deployed a retrieval-augmented support copilot using Python, FastAPI, Docker, LangChain, and PostgreSQL.
Designed evaluation workflows for LLM responses and owned the production API rollout.`;

test("resume intake extracts skills, evidence, and likely target roles deterministically", () => {
  assert.deepEqual(extractSkills(resume), ["Python", "FastAPI", "SQL", "Docker", "RAG", "LLMs", "LangChain", "Evaluation"]);
  assert.deepEqual(inferTargetRoles(resume), ["AI Engineer", "Backend Engineer"]);
  assert.equal(extractEvidence(resume).length, 2);
});
