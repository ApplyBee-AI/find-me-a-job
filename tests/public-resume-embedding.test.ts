import * as assert from "node:assert/strict";
import test from "node:test";
import {
  assertSanitizedImportProfiles,
  buildEmbeddingInputs,
  createEmbeddingClient,
} from "../scripts/import-public-resume-examples.mjs";

test("builds safe applicant embedding inputs from profile fields", () => {
  const inputs = buildEmbeddingInputs([
    {
      publicId: "public_resume_example_01",
      targetRoles: ["Software Engineer"],
      skills: ["Python", "SQL"],
      resumeText: "EDUCATION\nProjects: API development",
    },
  ]);

  assert.deepEqual(inputs, [
    "Target roles: Software Engineer\nSkills: Python, SQL\nResume:\nEDUCATION\nProjects: API development",
  ]);
});

test("rejects unsanitized or unprovenanced applicant payloads before embedding", () => {
  assert.throws(
    () => assertSanitizedImportProfiles([{
      sourceKind: "public-educational-example",
      sourceId: "example_01",
      sourceUrl: "https://example.edu/resume.pdf",
      sourcePage: 1,
      sourceChecksum: "checksum",
      resumeText: "EDUCATION\nReach me at person@example.com",
    }]),
    /contact detail/i,
  );
  assert.throws(
    () => assertSanitizedImportProfiles([{
      sourceKind: "untrusted",
      sourceId: "example_01",
      sourceUrl: "https://example.edu/resume.pdf",
      sourcePage: 1,
      sourceChecksum: "checksum",
      resumeText: "EDUCATION\nComputer Science",
    }]),
    /provenance/i,
  );
});

test("sends the configured embedding model and returns vectors", async () => {
  let request;
  const client = createEmbeddingClient(async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({ data: [{ embedding: [0.25, -0.5] }] }), { status: 200 });
  }, "test-key", "text-embedding-3-small");

  const vectors = await client(["safe resume text"]);

  assert.equal(request.url, "https://api.openai.com/v1/embeddings");
  assert.equal(request.options.headers.Authorization, "Bearer test-key");
  assert.deepEqual(JSON.parse(request.options.body), {
    model: "text-embedding-3-small",
    input: ["safe resume text"],
    encoding_format: "float",
  });
  assert.deepEqual(vectors, [[0.25, -0.5]]);
});
