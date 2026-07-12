import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { normalizeImportedJob } from "./lib/jobNormalization";
import { isCanonicalJob } from "./lib/matching";

export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const jobs = await ctx.db.query("jobs").order("asc").take(100);
    return jobs.filter(isCanonicalJob).slice(0, args.limit ?? 20);
  },
});

export const getByPublicId = query({
  args: { publicId: v.string() },
  handler: async (ctx, args) => {
    const byPublicId = await ctx.db
      .query("jobs")
      .withIndex("by_public_id", (q) => q.eq("publicId", args.publicId))
      .unique();
    if (byPublicId) return isCanonicalJob(byPublicId) ? byPublicId : null;
    const byExternalId = await ctx.db
      .query("jobs")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.publicId))
      .unique();
    return byExternalId && isCanonicalJob(byExternalId) ? byExternalId : null;
  },
});

export const normalizeImported = mutation({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("jobs").take(args.limit ?? 250);
    let normalized = 0;
    let skipped = 0;
    for (const row of rows) {
      if (isCanonicalJob(row)) {
        skipped += 1;
        continue;
      }
      const patch = normalizeImportedJob(row, new Date().toISOString());
      if (!patch) {
        skipped += 1;
        continue;
      }
      await ctx.db.patch("jobs", row._id, patch);
      normalized += 1;
    }
    return { normalized, skipped };
  },
});

export const removeSeededDemoJobs = mutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("jobs").take(250);
    const demoRows = rows.filter((row) => typeof row.publicId === "string" && /^job_\d+$/.test(row.publicId));
    for (const row of demoRows) await ctx.db.delete("jobs", row._id);
    return { removed: demoRows.length };
  },
});
