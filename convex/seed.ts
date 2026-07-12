import { mutation } from "./_generated/server";
import { v } from "convex/values";

const legacyApplicantIds = new Set(["candidate_07", "candidate_03", "candidate_11"]);
const legacyRecruiterIds = new Set(["recruiter_03", "recruiter_04", "recruiter_05"]);

// Kept for the legacy /seed endpoint. Production data is never fabricated here.
export const seedDemo = mutation({
  args: { force: v.optional(v.boolean()) },
  handler: async (_ctx) => ({
    seeded: false,
    message: "No demo profiles are seeded. Submit a resume or import consented applicant data.",
  }),
});

export const removeLegacyDemoData = mutation({
  args: {},
  handler: async (ctx) => {
    const applicants = await ctx.db.query("applicants").take(250);
    const recruiters = await ctx.db.query("recruiters").take(250);
    const jobs = await ctx.db.query("jobs").take(250);
    const runs = await ctx.db.query("runs").take(250);

    for (const applicant of applicants) {
      if (legacyApplicantIds.has(applicant.publicId)) await ctx.db.delete("applicants", applicant._id);
    }
    for (const recruiter of recruiters) {
      if (legacyRecruiterIds.has(recruiter.publicId)) await ctx.db.delete("recruiters", recruiter._id);
    }
    for (const job of jobs) {
      if (typeof job.publicId === "string" && /^job_\d+$/.test(job.publicId)) await ctx.db.delete("jobs", job._id);
    }
    for (const run of runs) {
      if (legacyApplicantIds.has(run.personaId) || legacyRecruiterIds.has(run.personaId)) await ctx.db.delete("runs", run._id);
    }

    return {
      applicantsRemoved: applicants.filter((row) => legacyApplicantIds.has(row.publicId)).length,
      recruitersRemoved: recruiters.filter((row) => legacyRecruiterIds.has(row.publicId)).length,
      jobsRemoved: jobs.filter((row) => typeof row.publicId === "string" && /^job_\d+$/.test(row.publicId)).length,
    };
  },
});
