import { query } from "./_generated/server";
import { v } from "convex/values";
import { rankCandidatesForRecruiter } from "./lib/matching";

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
