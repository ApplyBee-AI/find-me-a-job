import { query } from "./_generated/server";
import { v } from "convex/values";
import { type Job, isCanonicalJob, rankCandidatesForRecruiter, rankJobsForApplicant } from "./lib/matching";

export const applicantToJobs = query({
  args: {
    applicantId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const applicant = await ctx.db
      .query("applicants")
      .withIndex("by_public_id", (q) => q.eq("publicId", args.applicantId))
      .unique();

    if (!applicant) {
      throw new Error(`Applicant ${args.applicantId} not found`);
    }

    const storedJobs = await ctx.db.query("jobs").take(100);
    const jobs = storedJobs.filter(isCanonicalJob) as Job[];
    return rankJobsForApplicant(applicant, jobs).slice(0, args.limit ?? 5);
  },
});

export const recruiterToCandidates = query({
  args: {
    recruiterId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const recruiter = await ctx.db
      .query("recruiters")
      .withIndex("by_public_id", (q) => q.eq("publicId", args.recruiterId))
      .unique();

    if (!recruiter) {
      throw new Error(`Recruiter ${args.recruiterId} not found`);
    }

    const candidates = await ctx.db.query("applicants").take(20);
    return rankCandidatesForRecruiter(recruiter, candidates).slice(0, args.limit ?? 5);
  },
});
