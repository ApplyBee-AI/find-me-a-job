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
  externalId: string;
  platform: "lever";
  company: string;
  title: string;
  location: string;
  jobUrl: string;
  applicationLink: string;
  description: string;
  summary: string;
  requirements: string;
  skills: string[];
  jobType: string;
  employmentType: string;
  seniorityLevel: string;
  experienceLevel: string;
  isRemote: boolean;
  sectorTags: string[];
  isExternal: boolean;
  postedDate: string;
  scrapedAt: string;
  isActive: boolean;
  extraData: LeverJobInput["extra_data"];
  embedding: number[] | null;
  minYearsExperience?: number;
  maxYearsExperience?: number;
  salaryRange?: string;
  minSalary?: number;
  maxSalary?: number;
  latitude?: number;
  longitude?: number;
};

const present = <T>(value: T | null | undefined): value is T => value !== null && value !== undefined;

export const mapLeverJob = (
  job: LeverJobInput,
): ImportedLeverJob => ({
  externalId: job.job_id_external,
  platform: "lever",
  company: job.company,
  title: job.job_title,
  location: job.location,
  jobUrl: job.job_url,
  applicationLink: job.application_link || job.job_url,
  description: job.description,
  summary: job.summary,
  requirements: job.requirements,
  skills: Array.from(new Set(job.skills)),
  jobType: job.job_type,
  employmentType: job.employment_type,
  seniorityLevel: job.seniority_level,
  experienceLevel: job.experience_level,
  isRemote: job.is_remote,
  sectorTags: job.sector_tags,
  isExternal: job.is_external,
  postedDate: job.posted_date ?? "",
  scrapedAt: job.scraped_at,
  isActive: job.is_active,
  extraData: job.extra_data,
  embedding: job.embedding,
  ...(present(job.min_years_experience) ? { minYearsExperience: job.min_years_experience } : {}),
  ...(present(job.max_years_experience) ? { maxYearsExperience: job.max_years_experience } : {}),
  ...(job.salary_range ? { salaryRange: job.salary_range } : {}),
  ...(present(job.min_salary) ? { minSalary: job.min_salary } : {}),
  ...(present(job.max_salary) ? { maxSalary: job.max_salary } : {}),
  ...(present(job.latitude) ? { latitude: job.latitude } : {}),
  ...(present(job.longitude) ? { longitude: job.longitude } : {}),
});

const comparable = (job: ImportedLeverJob) => JSON.stringify(job);

export const classifyUpsert = (
  existing: ImportedLeverJob | undefined,
  incoming: ImportedLeverJob,
): "inserted" | "updated" | "skipped" => {
  if (!existing) return "inserted";
  return comparable(existing) === comparable(incoming) ? "skipped" : "updated";
};
