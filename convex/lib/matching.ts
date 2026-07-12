type Job = {
  publicId?: string;
  externalId?: string;
  company: string;
  title: string;
  location: string;
  workMode?: string;
  isRemote?: boolean;
  skills: string[];
  experienceLevel: string;
  minYearsExperience?: number;
  description: string;
  applyUrl?: string;
  applicationLink?: string;
  jobUrl?: string;
  highlights?: string[];
  summary?: string;
  requirements?: string;
};

type Applicant = {
  publicId: string;
  name: string;
  targetRoles: string[];
  skills: string[];
  resumeText: string;
  location: string;
  remote: boolean;
  experienceYears: number;
  education: string;
  availability: string;
  projects: string[];
  evidenceLines: string[];
  profileStory: string;
};

type Recruiter = {
  publicId: string;
  company: string;
  roleToHire: string;
  prioritySkills: string[];
  niceToHave: string[];
  story: string;
  location: string;
  workMode: string;
  interviewFocus: string[];
};

type ReasonScores = {
  skillMatch: number;
  roleMatch: number;
  experienceMatch: number;
  locationMatch: number;
  semanticMatch: number;
};

export type ApplicantJobMatch = {
  applicantId: string;
  jobId: string;
  score: number;
  reasons: ReasonScores;
  summary: string;
  matchedSkills: string[];
  missingSkills: string[];
  evidenceLines: string[];
  nextStep: string;
};

export type RecruiterCandidateMatch = {
  recruiterId: string;
  candidateId: string;
  score: number;
  reasons: ReasonScores;
  summary: string;
  matchedSkills: string[];
  missingSkills: string[];
  evidenceLines: string[];
  nextStep: string;
};

const normalize = (value: string) => value.trim().toLowerCase();

const overlap = (left: string[], right: string[]) => {
  const rightSet = new Set(right.map(normalize));
  return left.filter((item) => rightSet.has(normalize(item)));
};

const percent = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const scoreRoleAlignment = (targetRoles: string[], roleTitle: string) => {
  const title = normalize(roleTitle);
  const exact = targetRoles.some((role) => normalize(role) === title);
  if (exact) {
    return 100;
  }

  const partial = targetRoles.some((role) => {
    const normalizedRole = normalize(role);
    return normalizedRole.includes(title) || title.includes(normalizedRole);
  });

  return partial ? 85 : 50;
};

const scoreExperience = (years: number, minYears: number) => {
  if (years >= minYears + 1) {
    return 100;
  }
  if (years >= minYears) {
    return 88;
  }
  if (years + 1 >= minYears) {
    return 72;
  }
  return 48;
};

const scoreLocationForJob = (applicant: Applicant, job: Job) => {
  const workMode = job.workMode ?? (job.isRemote ? "Remote" : "");
  if (normalize(job.location) === "remote" || normalize(workMode).includes("remote")) {
    return applicant.remote ? 100 : 85;
  }

  if (normalize(applicant.location) === normalize(job.location)) {
    return 100;
  }

  return applicant.remote ? 75 : 50;
};

const scoreLocationForRecruiter = (candidate: Applicant, recruiter: Recruiter) => {
  if (normalize(recruiter.location) === "remote" || normalize(recruiter.workMode).includes("remote")) {
    return candidate.remote ? 100 : 85;
  }

  if (normalize(candidate.location) === normalize(recruiter.location)) {
    return 100;
  }

  return candidate.remote ? 70 : 45;
};

const scoreSemanticRelevance = (resumeOrProjectText: string[], targetText: string) => {
  const sourceWords = new Set(
    resumeOrProjectText
      .join(" ")
      .toLowerCase()
      .split(/[^a-z0-9+.#-]+/)
      .filter((word) => word.length > 3),
  );

  const targetWords = new Set(
    targetText
      .toLowerCase()
      .split(/[^a-z0-9+.#-]+/)
      .filter((word) => word.length > 3),
  );

  const shared = Array.from(sourceWords).filter((word) => targetWords.has(word));
  const denom = Math.max(1, Math.min(targetWords.size, 20));
  return percent((shared.length / denom) * 100);
};

const buildApplicantSummary = (score: number, title: string) => {
  if (score >= 85) {
    return `Strong fit for ${title} roles.`;
  }
  if (score >= 70) {
    return `Promising fit for ${title}, with a few gaps to close.`;
  }
  return `Stretch fit for ${title}; targeted skill updates would improve alignment.`;
};

const buildRecruiterSummary = (score: number, name: string) => {
  if (score >= 85) {
    return `${name} is a high-confidence shortlist candidate.`;
  }
  if (score >= 70) {
    return `${name} is viable, but should be tested on role-specific gaps.`;
  }
  return `${name} is interesting, but has notable gaps for this role.`;
};

const buildNextStep = (missingSkills: string[], fallback: string) => {
  if (missingSkills.length === 0) {
    return fallback;
  }
  return `Highlight or build evidence for ${missingSkills.slice(0, 2).join(" and ")} next.`;
};

export const rankJobsForApplicant = (applicant: Applicant, jobs: Job[]): ApplicantJobMatch[] => {
  return jobs
    .map((job) => {
      const jobId = job.publicId ?? job.externalId;
      if (!jobId) {
        throw new Error(`Job ${job.title} has no publicId or externalId`);
      }
      const matchedSkills = overlap(applicant.skills, job.skills);
      const missingSkills = job.skills.filter(
        (skill) => !matchedSkills.some((matched) => normalize(matched) === normalize(skill)),
      );
      const skillMatch = percent((matchedSkills.length / Math.max(1, job.skills.length)) * 100);
      const roleMatch = scoreRoleAlignment(applicant.targetRoles, job.title);
      const experienceMatch = scoreExperience(applicant.experienceYears, job.minYearsExperience ?? 0);
      const locationMatch = scoreLocationForJob(applicant, job);
      const highlights = job.highlights ?? [job.summary, job.requirements].filter(
        (value): value is string => Boolean(value),
      );
      const semanticMatch = scoreSemanticRelevance(
        [applicant.resumeText, ...applicant.projects],
        `${job.title} ${job.description} ${highlights.join(" ")}`,
      );
      const score = percent(
        skillMatch * 0.4 +
          roleMatch * 0.25 +
          experienceMatch * 0.2 +
          locationMatch * 0.1 +
          semanticMatch * 0.05,
      );

      return {
        applicantId: applicant.publicId,
        jobId,
        score,
        reasons: {
          skillMatch,
          roleMatch,
          experienceMatch,
          locationMatch,
          semanticMatch,
        },
        summary: buildApplicantSummary(score, job.title),
        matchedSkills,
        missingSkills,
        evidenceLines: applicant.evidenceLines.slice(0, 2),
        nextStep: buildNextStep(
          missingSkills,
          "Emphasize your strongest backend and AI projects when you apply.",
        ),
      };
    })
    .sort((left, right) => right.score - left.score);
};

export const rankCandidatesForRecruiter = (
  recruiter: Recruiter,
  candidates: Applicant[],
): RecruiterCandidateMatch[] => {
  return candidates
    .map((candidate) => {
      const matchedSkills = overlap(candidate.skills, recruiter.prioritySkills);
      const missingSkills = recruiter.prioritySkills.filter(
        (skill) => !matchedSkills.some((matched) => normalize(matched) === normalize(skill)),
      );
      const skillMatch = percent(
        (matchedSkills.length / Math.max(1, recruiter.prioritySkills.length)) * 100,
      );
      const roleMatch = scoreRoleAlignment(candidate.targetRoles, recruiter.roleToHire);
      const experienceMatch = scoreExperience(candidate.experienceYears, 2);
      const locationMatch = scoreLocationForRecruiter(candidate, recruiter);
      const semanticMatch = scoreSemanticRelevance(
        [candidate.resumeText, ...candidate.projects],
        `${recruiter.roleToHire} ${recruiter.story} ${recruiter.prioritySkills.join(" ")}`,
      );
      const score = percent(
        skillMatch * 0.4 +
          roleMatch * 0.25 +
          experienceMatch * 0.2 +
          locationMatch * 0.1 +
          semanticMatch * 0.05,
      );

      return {
        recruiterId: recruiter.publicId,
        candidateId: candidate.publicId,
        score,
        reasons: {
          skillMatch,
          roleMatch,
          experienceMatch,
          locationMatch,
          semanticMatch,
        },
        summary: buildRecruiterSummary(score, candidate.name),
        matchedSkills,
        missingSkills,
        evidenceLines: candidate.evidenceLines.slice(0, 2),
        nextStep: buildNextStep(
          missingSkills,
          "Move this candidate into an interview focused on execution depth.",
        ),
      };
    })
    .sort((left, right) => right.score - left.score);
};

export const buildApplicantFallbackAnswer = (
  applicant: Applicant,
  job: Job,
  match: ApplicantJobMatch,
  query: string,
) => {
  const lowerQuery = query.toLowerCase();
  if (lowerQuery.includes("why")) {
    return `${job.title} scores ${match.score}% because ${applicant.name} already matches ${match.matchedSkills.join(", ")}. The main gap is ${match.missingSkills.join(", ") || "minor polish"}. ${match.nextStep}`;
  }
  if (lowerQuery.includes("improve") || lowerQuery.includes("skill")) {
    return `For ${job.title}, strengthen ${match.missingSkills.join(", ") || "your deployment evidence"}. ${match.nextStep}`;
  }
  return `${match.summary} You match ${match.matchedSkills.join(", ")}. Missing: ${match.missingSkills.join(", ") || "no major gaps"}. ${match.nextStep}`;
};

export const buildRecruiterFallbackAnswer = (
  recruiter: Recruiter,
  candidate: Applicant,
  match: RecruiterCandidateMatch,
  query: string,
) => {
  const lowerQuery = query.toLowerCase();
  if (lowerQuery.includes("interview")) {
    return `Ask ${candidate.name} how they would ship ${recruiter.roleToHire} work at ${recruiter.company}, how they validated project outcomes, and how they handled ${match.missingSkills.join(" and ") || "production tradeoffs"}.`;
  }
  if (lowerQuery.includes("why")) {
    return `${candidate.name} ranks at ${match.score}% because they match ${match.matchedSkills.join(", ")} and have evidence like: ${match.evidenceLines[0]}. Probe ${match.missingSkills.join(", ") || "depth of ownership"} in the interview.`;
  }
  return `${match.summary} Strengths: ${match.matchedSkills.join(", ")}. Gaps: ${match.missingSkills.join(", ") || "no major gaps"}. ${match.nextStep}`;
};
