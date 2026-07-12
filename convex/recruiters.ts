import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { recruiterFromJob } from "./lib/jobNormalization";
import { buildManualRecruiter } from "./lib/recruiterProfile";
import { isCanonicalJob, rankCandidatesForRecruiter } from "./lib/matching";

export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db.query("recruiters").order("asc").take(args.limit ?? 20);
  },
});

export const createManual = mutation({
  args: {
    company: v.string(),
    roleToHire: v.string(),
    prioritySkills: v.array(v.string()),
    niceToHave: v.optional(v.array(v.string())),
    story: v.string(),
    location: v.string(),
    workMode: v.string(),
    interviewFocus: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    if (args.company.trim().length < 2) throw new Error("Please provide a company name.");
    if (args.roleToHire.trim().length < 2) throw new Error("Please provide the role to hire.");
    if (args.prioritySkills.length === 0) throw new Error("Add at least one priority skill.");
    const publicId = `recruiter:${crypto.randomUUID()}`;
    const recruiter = buildManualRecruiter(args, publicId, Date.now());
    await ctx.db.insert("recruiters", recruiter);
    return { publicId };
  },
});

export const syncFromJobs = mutation({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const jobs = (await ctx.db.query("jobs").take(250)).filter(isCanonicalJob).filter((job) => job.isActive !== false).slice(0, args.limit ?? 15);
    let inserted = 0;
    let updated = 0;
    for (const job of jobs) {
      const record = recruiterFromJob({
        ...job,
        publicId: job.publicId!,
        description: job.description!,
      }, Date.now());
      const existing = await ctx.db.query("recruiters").withIndex("by_public_id", (q) => q.eq("publicId", record.publicId)).unique();
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
