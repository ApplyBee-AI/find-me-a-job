import { mutation } from "./_generated/server";
import { v } from "convex/values";

const importedLeverJob = v.object({
  publicId: v.string(),
  platform: v.literal("lever"),
  externalJobId: v.string(),
  company: v.string(),
  title: v.string(),
  location: v.string(),
  workMode: v.string(),
  skills: v.array(v.string()),
  experienceLevel: v.string(),
  minYearsExperience: v.number(),
  description: v.string(),
  applyUrl: v.string(),
  highlights: v.array(v.string()),
  salaryRange: v.optional(v.string()),
  minSalary: v.optional(v.number()),
  maxSalary: v.optional(v.number()),
  employmentType: v.optional(v.string()),
  seniorityLevel: v.optional(v.string()),
  postedDate: v.optional(v.string()),
  isRemote: v.optional(v.boolean()),
  latitude: v.optional(v.number()),
  longitude: v.optional(v.number()),
  requirements: v.optional(v.string()),
  summary: v.optional(v.string()),
  maxYearsExperience: v.optional(v.number()),
  isActive: v.boolean(),
  scrapedAt: v.string(),
  sourceMetadataJson: v.string(),
  embedding: v.union(v.array(v.number()), v.null()),
  embeddingModel: v.optional(v.string()),
  embeddingVersion: v.optional(v.string()),
});

const equalJob = (existing: Record<string, unknown>, incoming: Record<string, unknown>) =>
  Object.keys(incoming).every(
    (field) => JSON.stringify(existing[field]) === JSON.stringify(incoming[field]),
  );

export const upsertLeverJob = mutation({
  args: { job: importedLeverJob },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("jobs")
      .withIndex("by_platform_and_external_id", (q) =>
        q.eq("platform", args.job.platform).eq("externalJobId", args.job.externalJobId),
      )
      .unique();

    if (!existing) {
      await ctx.db.insert("jobs", args.job);
      return { status: "inserted" as const, publicId: args.job.publicId };
    }

    if (equalJob(existing as Record<string, unknown>, args.job as Record<string, unknown>)) {
      return { status: "skipped" as const, publicId: args.job.publicId };
    }

    await ctx.db.patch("jobs", existing._id, args.job);
    return { status: "updated" as const, publicId: args.job.publicId };
  },
});
