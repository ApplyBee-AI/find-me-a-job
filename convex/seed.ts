import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { applicants, recruiters } from "./lib/seedData";

export const seedDemo = mutation({
  args: { force: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    if (args.force) {
      const runLogs = await ctx.db.query("runLogs").take(256);
      for (const row of runLogs) {
        await ctx.db.delete("runLogs", row._id);
      }

      const sessions = await ctx.db.query("sessions").take(256);
      for (const row of sessions) {
        await ctx.db.delete("sessions", row._id);
      }


      const applicantRows = await ctx.db.query("applicants").take(256);
      for (const row of applicantRows) {
        await ctx.db.delete("applicants", row._id);
      }

      const recruiterRows = await ctx.db.query("recruiters").take(256);
      for (const row of recruiterRows) {
        await ctx.db.delete("recruiters", row._id);
      }
    }


    for (const applicant of applicants) {
      const existing = await ctx.db
        .query("applicants")
        .withIndex("by_public_id", (q) => q.eq("publicId", applicant.publicId))
        .unique();

      if (!existing) {
        await ctx.db.insert("applicants", applicant);
      }
    }

    for (const recruiter of recruiters) {
      const existing = await ctx.db
        .query("recruiters")
        .withIndex("by_public_id", (q) => q.eq("publicId", recruiter.publicId))
        .unique();

      if (!existing) {
        await ctx.db.insert("recruiters", recruiter);
      }
    }

    return {
      seeded: true,
      jobs: "existing shared jobs table preserved",
      applicants: applicants.length,
      recruiters: recruiters.length,
    };
  },
});
