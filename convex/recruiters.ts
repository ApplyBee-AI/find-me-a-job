import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { isCanonicalJob, rankCandidatesForRecruiter } from "./lib/matching";

export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db.query("recruiters").order("asc").take(args.limit ?? 20);
  },
});

export const syncFromJobs = mutation({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const jobs = (await ctx.db.query("jobs").take(250)).filter(isCanonicalJob).filter((job) => job.isActive !== false).slice(0, args.limit ?? 15);
    let inserted = 0;
    let updated = 0;
    for (const job of jobs) {
      const publicId = `recruiter:${job.publicId}`;
      const record = {
        publicId,
        company: job.company,
        roleToHire: job.title,
        prioritySkills: job.skills,
        niceToHave: [],
        story: job.summary ?? job.description ?? "Stored job requirements.",
        location: job.location,
        workMode: job.workMode ?? "Unspecified",
        interviewFocus: job.skills.slice(0, 4),
        jobPublicId: job.publicId ?? publicId,
        source: "job" as const,
        updatedAt: Date.now(),
      };
      const existing = await ctx.db.query("recruiters").withIndex("by_public_id", (q) => q.eq("publicId", publicId)).unique();
      if (existing) {
        await ctx.db.patch("recruiters", existing._id, record);
        updated += 1;
      } else {
        await ctx.db.insert("recruiters", record);
        inserted += 1;
      }
    }
    return { inserted, updated, total: jobs.length };
  },
});

export const getByPublicId = query({
  args: { publicId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("recruiters")
      .withIndex("by_public_id", (q) => q.eq("publicId", args.publicId))
      .unique();
  },
});

export const getCandidateMatches = query({
  args: {
    publicId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const recruiter = await ctx.db
      .query("recruiters")
      .withIndex("by_public_id", (q) => q.eq("publicId", args.publicId))
      .unique();

    if (!recruiter) {
      throw new Error(`Recruiter ${args.publicId} not found`);
    }

    const candidates = await ctx.db.query("applicants").take(20);
    const matches = rankCandidatesForRecruiter(recruiter, candidates).slice(0, args.limit ?? 5);

    return {
      recruiter,
      matches,
    };
  },
});
