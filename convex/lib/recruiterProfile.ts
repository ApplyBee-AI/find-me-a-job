export type ManualRecruiterInput = {
  company: string;
  roleToHire: string;
  prioritySkills: string[];
  niceToHave?: string[];
  story: string;
  location: string;
  workMode: string;
  interviewFocus?: string[];
};

const cleanList = (items: string[] = []) => {
  const seen = new Set<string>();
  return items.map((item) => item.trim()).filter((item) => {
    const key = item.toLowerCase();
    if (!item || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const buildManualRecruiter = (
  input: ManualRecruiterInput,
  publicId: string,
  updatedAt: number,
) => ({
  publicId,
  company: input.company.trim(),
  roleToHire: input.roleToHire.trim(),
  prioritySkills: cleanList(input.prioritySkills),
  niceToHave: cleanList(input.niceToHave),
  story: input.story.trim(),
  location: input.location.trim(),
  workMode: input.workMode.trim(),
  interviewFocus: cleanList(input.interviewFocus),
  source: "manual" as const,
  updatedAt,
});
