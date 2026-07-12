import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config } from "dotenv";
import { ConvexHttpClient } from "convex/browser";
import { mapLeverJob, type LeverJobInput } from "../convex/lib/leverImport";

config({ path: resolve(process.cwd(), ".env") });

type Manifest = { jobs?: LeverJobInput[]; embedding_model?: string; embedding_version?: string };
type Result = { status: "inserted" | "updated" | "skipped"; publicId: string };

const argument = (name: string): string | undefined => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

const loadJobs = async (inputPath: string): Promise<{ jobs: LeverJobInput[]; metadata: Manifest }> => {
  const source = JSON.parse(await readFile(resolve(inputPath), "utf8")) as LeverJobInput | Manifest;
  if ("jobs" in source && Array.isArray(source.jobs)) return { jobs: source.jobs, metadata: source };
  if ("job_id_external" in source) return { jobs: [source], metadata: {} };
  throw new Error("Input must be a Lever job JSON document or a manifest containing a jobs array.");
};

const main = async () => {
  const input = argument("--input");
  if (!input) throw new Error("Usage: npm run import:lever -- --input <manifest-or-job.json>");
  if (!process.env.CONVEX_URL) throw new Error("CONVEX_URL is required in the parent backend .env.");

  const { jobs, metadata } = await loadJobs(input);
  const client = new ConvexHttpClient(process.env.CONVEX_URL) as unknown as {
    mutation: (name: string, args: { job: ReturnType<typeof mapLeverJob> }) => Promise<Result>;
  };
  const counts = { inserted: 0, updated: 0, skipped: 0, invalid: 0 };

  for (const source of jobs) {
    try {
      const job = mapLeverJob(source, {
        embeddingModel: metadata.embedding_model ?? process.env.OPENAI_EMBEDDING_MODEL,
        embeddingVersion: metadata.embedding_version,
      });
      const result = (await client.mutation("importer:upsertLeverJob" as never, { job })) as Result;
      counts[result.status] += 1;
    } catch {
      counts.invalid += 1;
    }
  }

  console.log(JSON.stringify({ input: resolve(input), total: jobs.length, ...counts }, null, 2));
  if (counts.invalid > 0) process.exitCode = 1;
};

void main();
