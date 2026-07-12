import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const isCanonicalJob = (job: Record<string, unknown>) =>
  typeof job.publicId === "string" && typeof job.workMode === "string" &&
  typeof job.minYearsExperience === "number" && typeof job.description === "string" &&
  typeof job.applyUrl === "string" && Array.isArray(job.highlights);

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
    if (byPublicId) return byPublicId;
    return await ctx.db
      .query("jobs")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.publicId))
      .unique();
  },
});

const workMode = (job: Record<string, unknown>) => {
  if (typeof job.workMode === "string" && job.workMode) return job.workMode;
  if (job.extraData && typeof job.extraData === "object") {
    const value = (job.extraData as Record<string, unknown>).work_mode;
    if (typeof value === "string" && value) return value;
  }
  return job.isRemote === true ? "Remote" : "Unspecified";
};

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
      const externalId = typeof row.externalJobId === "string" ? row.externalJobId : typeof row.externalId === "string" ? row.externalId : undefined;
      const applyUrl = typeof row.applyUrl === "string" ? row.applyUrl : typeof row.applicationLink === "string" ? row.applicationLink : typeof row.jobUrl === "string" ? row.jobUrl : undefined;
      const description = typeof row.description === "string" ? row.description : [row.summary, row.requirements].filter((item): item is string => typeof item === "string" && item.length > 0).join("\n\n");
      if (!externalId || !applyUrl || !description) {
        skipped += 1;
        continue;
      }
      const summary = typeof row.summary === "string" ? row.summary : "";
      const requirements = typeof row.requirements === "string" ? row.requirements : "";
      await ctx.db.patch("jobs", row._id, {
        publicId: typeof row.publicId === "string" ? row.publicId : `${typeof row.platform === "string" ? row.platform : "import"}:${externalId}`,
        platform: typeof row.platform === "string" ? row.platform : "import",
        externalJobId: externalId,
        workMode: workMode(row),
        minYearsExperience: typeof row.minYearsExperience === "number" ? row.minYearsExperience : 0,
        description,
        applyUrl,
        highlights: [summary, requirements].filter(Boolean),
        isActive: typeof row.isActive === "boolean" ? row.isActive : true,
        scrapedAt: typeof row.scrapedAt === "string" ? row.scrapedAt : new Date().toISOString(),
        sourceMetadataJson: typeof row.sourceMetadataJson === "string" ? row.sourceMetadataJson : JSON.stringify(row.extraData ?? {}),
        embedding: Array.isArray(row.embedding) ? row.embedding as number[] : null,
      });
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
