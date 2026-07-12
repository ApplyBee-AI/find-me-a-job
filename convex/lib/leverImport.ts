export type LeverJobInput = {
  id: string;
  job_id_external: string;
  platform: "lever";
  company: string;
  job_title: string;
  location: string;
  salary_range: string | null;
  job_url: string;
  application_link: string;
  description: string;
  summary: string;
  requirements: string;
  skills: string[];
  job_type: string;
  employment_type: string;
  seniority_level: string;
  experience_level: string;
  is_remote: boolean;
  min_years_experience: number | null;
  max_years_experience: number | null;
  min_salary: number | null;
  max_salary: number | null;
  latitude: number | null;
  longitude: number | null;
  sector_tags: string[];
  is_external: boolean;
  posted_date: string | null;
  scraped_at: string;
  is_active: boolean;
  extra_data: {
    work_mode: string;
    company_logo: string | null;
    perks: string[];
  };
  embedding: number[] | null;
};

export type ImportedLeverJob = {
  publicId: string;
  platform: "lever";
  externalJobId: string;
  company: string;
  title: string;
  location: string;
  workMode: string;
  skills: string[];
  experienceLevel: string;
  minYearsExperience: number;
  description: string;
  applyUrl: string;
  highlights: string[];
  salaryRange?: string;
  minSalary?: number;
  maxSalary?: number;
  employmentType?: string;
  seniorityLevel?: string;
  postedDate?: string;
  isRemote?: boolean;
  latitude?: number;
  longitude?: number;
  requirements?: string;
  summary?: string;
  maxYearsExperience?: number;
  isActive: boolean;
  scrapedAt: string;
  sourceMetadataJson: string;
  embedding: number[] | null;
  embeddingModel?: string;
  embeddingVersion?: string;
};

const present = <T>(value: T | null | undefined): value is T => value !== null && value !== undefined;

export const mapLeverJob = (
  job: LeverJobInput,
  metadata: { embeddingModel?: string; embeddingVersion?: string } = {},
): ImportedLeverJob => ({
  publicId: `lever:${job.job_id_external}`,
  platform: "lever",
  externalJobId: job.job_id_external,
  company: job.company,
  title: job.job_title,
  location: job.location,
  workMode: job.extra_data.work_mode,
  skills: Array.from(new Set(job.skills)),
  experienceLevel: job.experience_level,
  minYearsExperience: job.min_years_experience ?? 0,
  description: job.description,
  applyUrl: job.application_link || job.job_url,
  highlights: [job.summary, job.requirements].filter(Boolean),
  ...(job.salary_range ? { salaryRange: job.salary_range } : {}),
  ...(present(job.min_salary) ? { minSalary: job.min_salary } : {}),
  ...(present(job.max_salary) ? { maxSalary: job.max_salary } : {}),
  ...(job.employment_type ? { employmentType: job.employment_type } : {}),
  ...(job.seniority_level ? { seniorityLevel: job.seniority_level } : {}),
  ...(job.posted_date ? { postedDate: job.posted_date } : {}),
  isRemote: job.is_remote,
  ...(present(job.latitude) ? { latitude: job.latitude } : {}),
  ...(present(job.longitude) ? { longitude: job.longitude } : {}),
  ...(job.requirements ? { requirements: job.requirements } : {}),
  ...(job.summary ? { summary: job.summary } : {}),
  ...(present(job.max_years_experience) ? { maxYearsExperience: job.max_years_experience } : {}),
  isActive: job.is_active,
  scrapedAt: job.scraped_at,
  sourceMetadataJson: JSON.stringify(job.extra_data),
  embedding: job.embedding,
  ...(metadata.embeddingModel ? { embeddingModel: metadata.embeddingModel } : {}),
  ...(metadata.embeddingVersion ? { embeddingVersion: metadata.embeddingVersion } : {}),
});

const comparable = (job: ImportedLeverJob) => JSON.stringify(job);

export const classifyUpsert = (
  existing: ImportedLeverJob | undefined,
  incoming: ImportedLeverJob,
): "inserted" | "updated" | "skipped" => {
  if (!existing) return "inserted";
  return comparable(existing) === comparable(incoming) ? "skipped" : "updated";
};
