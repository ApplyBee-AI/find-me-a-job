import { query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db.query("jobs").order("asc").take(args.limit ?? 20);
  },
});

export const getByPublicId = query({
  args: { publicId: v.string() },
  handler: async (ctx, args) => {
    const legacyJob = await ctx.db
      .query("jobs")
      .withIndex("by_public_id", (q) => q.eq("publicId", args.publicId))
      .unique();

    if (legacyJob) {
      return legacyJob;
    }

    return await ctx.db
      .query("jobs")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.publicId))
      .unique();
  },
});
