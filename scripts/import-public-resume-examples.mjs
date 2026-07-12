import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ConvexHttpClient } from "convex/browser";

const embeddingEndpoint = "https://api.openai.com/v1/embeddings";

export const buildEmbeddingInputs = (applicants) => applicants.map((applicant) => [
  `Target roles: ${applicant.targetRoles.join(", ")}`,
  `Skills: ${applicant.skills.join(", ")}`,
  `Resume:\n${applicant.resumeText}`,
].join("\n"));

export const createEmbeddingClient = (fetchImpl, apiKey, model) => async (inputs) => {
  const response = await fetchImpl(embeddingEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: inputs,
      encoding_format: "float",
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`OpenAI embeddings request failed (${response.status}).`);
  }

  const vectors = payload.data?.map((item) => item.embedding);
  if (!Array.isArray(vectors) || vectors.length !== inputs.length || vectors.some((vector) => !Array.isArray(vector))) {
    throw new Error("OpenAI embeddings response did not contain one vector per applicant.");
  }
  return vectors;
};

const readEnvironment = () => {
  const envPath = new URL("../.env.local", import.meta.url);
  const values = {};
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const [key, value] = line.split(/=(.*)/s);
    values[key] = value.replace(/^['"]|['"]$/g, "");
  }
  return values;
};

const chunk = (values, size) => {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
};

const run = async () => {
  const inputPath = process.argv[2] ?? ".tmp/public-resume-applicants.json";
  const applicants = JSON.parse(readFileSync(inputPath, "utf8"));
  if (!Array.isArray(applicants) || applicants.length === 0) {
    throw new Error("Input must be a non-empty JSON array of applicant records.");
  }

  const environment = readEnvironment();
  const apiKey = process.env.OPENAI_API_KEY;
  const convexUrl = process.env.CONVEX_URL ?? environment.CONVEX_URL;
  const model = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
  if (!apiKey) throw new Error("OPENAI_API_KEY is required in the process environment.");
  if (!convexUrl) throw new Error("CONVEX_URL is required in .env.local or the process environment.");

  const embed = createEmbeddingClient(fetch, apiKey, model);
  const records = [];
  for (const batch of chunk(applicants, 4)) {
    const vectors = await embed(buildEmbeddingInputs(batch));
    records.push(...batch.map((applicant, index) => ({
      ...applicant,
      embedding: vectors[index],
      embeddingModel: model,
      embeddingVersion: "public-resume-v1",
    })));
  }

  const client = new ConvexHttpClient(convexUrl);
  const result = await client.mutation("applicants:importPublicExamples", { applicants: records });
  console.log(JSON.stringify({
    imported: result.imported,
    updated: result.updated,
    model,
    embeddingDimensions: records[0].embedding.length,
  }, null, 2));
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
