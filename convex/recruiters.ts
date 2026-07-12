import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { rankCandidatesForRecruiter } from "./lib/matching";

const recruiterFields = {
  publicId: v.string(),
  name: v.optional(v.string()),
  company: v.string(),
  roleToHire: v.string(),
  prioritySkills: v.array(v.string()),
  niceToHave: v.array(v.string()),
  story: v.string(),
  location: v.string(),
  workMode: v.string(),
  interviewFocus: v.array(v.string()),
  isExample: v.optional(v.boolean()),
  sourceKind: v.optional(v.string()),
};

export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db.query("recruiters").order("asc").take(args.limit ?? 20);
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

export const importDemoRecruiters = mutation({
  args: { recruiters: v.array(v.object(recruiterFields)) },
  handler: async (ctx, args) => {
    let imported = 0;
    let updated = 0;

    for (const recruiter of args.recruiters) {
      const existing = await ctx.db
        .query("recruiters")
        .withIndex("by_public_id", (query) => query.eq("publicId", recruiter.publicId))
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, recruiter);
        updated += 1;
      } else {
        await ctx.db.insert("recruiters", recruiter);
        imported += 1;
      }
    }

    return { imported, updated };
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
