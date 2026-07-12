import { query } from "./_generated/server";
import { v } from "convex/values";
import { rankJobsForApplicant } from "./lib/matching";

export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db.query("applicants").order("asc").take(args.limit ?? 20);
  },
});

export const getByPublicId = query({
  args: { publicId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("applicants")
      .withIndex("by_public_id", (q) => q.eq("publicId", args.publicId))
      .unique();
  },
});

export const getJobMatches = query({
  args: {
    publicId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const applicant = await ctx.db
      .query("applicants")
      .withIndex("by_public_id", (q) => q.eq("publicId", args.publicId))
      .unique();

    if (!applicant) {
      throw new Error(`Applicant ${args.publicId} not found`);
    }

    const jobs = await ctx.db.query("jobs").take(20);
    const matches = rankJobsForApplicant(applicant, jobs).slice(0, args.limit ?? 5);

    return {
      applicant,
      matches,
    };
  },
});
