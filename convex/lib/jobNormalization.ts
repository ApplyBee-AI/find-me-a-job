import type { Job } from "./matching";

type ImportedJob = Record<string, unknown>;

export type CanonicalJobPatch = {
  publicId: string;
  platform: string;
  externalJobId: string;
  workMode: string;
  minYearsExperience: number;
  description: string;
  applyUrl: string;
  highlights: string[];
  isActive: boolean;
  scrapedAt: string;
  sourceMetadataJson: string;
  embedding: number[] | null;
};

const stringValue = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;

const inferWorkMode = (job: ImportedJob) => {
  const explicit = stringValue(job.workMode);
  if (explicit) return explicit;
  const extra = job.extraData;
  if (extra && typeof extra === "object") {
    const value = stringValue((extra as Record<string, unknown>).work_mode);
    if (value) return value;
  }
  return job.isRemote === true ? "Remote" : "Unspecified";
};

export const normalizeImportedJob = (job: ImportedJob, scrapedAt: string): CanonicalJobPatch | null => {
  const externalJobId = stringValue(job.externalJobId) ?? stringValue(job.externalId);
  const applyUrl = stringValue(job.applyUrl) ?? stringValue(job.applicationLink) ?? stringValue(job.jobUrl);
  const description = stringValue(job.description) ?? [stringValue(job.summary), stringValue(job.requirements)]
    .filter((value): value is string => Boolean(value))
    .join("\n\n");
  if (!externalJobId || !applyUrl || !description) return null;

  const platform = stringValue(job.platform) ?? "import";
  return {
    publicId: stringValue(job.publicId) ?? `${platform}:${externalJobId}`,
    platform,
    externalJobId,
    workMode: inferWorkMode(job),
    minYearsExperience: typeof job.minYearsExperience === "number" ? job.minYearsExperience : 0,
    description,
    applyUrl,
    highlights: [stringValue(job.summary), stringValue(job.requirements)].filter((value): value is string => Boolean(value)),
    isActive: typeof job.isActive === "boolean" ? job.isActive : true,
    scrapedAt: stringValue(job.scrapedAt) ?? scrapedAt,
    sourceMetadataJson: stringValue(job.sourceMetadataJson) ?? JSON.stringify(job.extraData ?? {}),
    embedding: Array.isArray(job.embedding) && job.embedding.every((value) => typeof value === "number") ? job.embedding as number[] : null,
  };
};

export const recruiterFromJob = (job: Job, updatedAt: number) => ({
  publicId: `recruiter:${job.publicId}`,
  company: job.company,
  roleToHire: job.title,
  prioritySkills: job.skills,
  niceToHave: [],
  story: job.summary ?? job.description,
  location: job.location,
  workMode: job.workMode ?? "Unspecified",
  interviewFocus: job.skills.slice(0, 4),
  jobPublicId: job.publicId,
  source: "job" as const,
  updatedAt,
});
