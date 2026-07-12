import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { env } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { type Job, isCanonicalJob, rankJobsForApplicant } from "./lib/matching";
import { extractEvidence, extractSkills, inferTargetRoles, profileStory } from "./lib/applicantProfile";

const newPublicId = () => `applicant:${crypto.randomUUID()}`;

const createProfile = async (ctx: { db: any }, args: {
  name: string;
  resumeText: string;
  targetRoles?: string[];
  skills?: string[];
  location?: string;
  remote?: boolean;
  experienceYears?: number;
  education?: string;
  availability?: string;
  source: "resume" | "guided_intake" | "import";
}) => {
  const skills = extractSkills(args.resumeText, args.skills ?? []);
  const evidenceLines = extractEvidence(args.resumeText);
  const targetRoles = inferTargetRoles(args.resumeText, args.targetRoles ?? []);
  const publicId = newPublicId();
  await ctx.db.insert("applicants", {
    publicId,
    name: args.name.trim(),
    targetRoles,
    skills,
    resumeText: args.resumeText.trim(),
    location: args.location?.trim() || "Unspecified",
    remote: args.remote ?? true,
    experienceYears: args.experienceYears ?? 0,
    education: args.education?.trim() || "Not provided",
    availability: args.availability?.trim() || "Not provided",
    projects: evidenceLines,
    evidenceLines,
    profileStory: profileStory(targetRoles, skills, evidenceLines),
    source: args.source,
    intakeStatus: "ready",
    embedding: null,
    embeddingStatus: "pending",
    updatedAt: Date.now(),
  });
  return { publicId, skills, targetRoles };
};

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

export const createFromResume = mutation({
  args: {
    name: v.string(),
    resumeText: v.string(),
    targetRoles: v.optional(v.array(v.string())),
    skills: v.optional(v.array(v.string())),
    location: v.optional(v.string()),
    remote: v.optional(v.boolean()),
    experienceYears: v.optional(v.number()),
    education: v.optional(v.string()),
    availability: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.name.trim().length < 2) throw new Error("Please provide your name.");
    if (args.resumeText.trim().length < 80) throw new Error("Please provide at least a short resume or profile summary.");
    return createProfile(ctx, { ...args, source: "resume" });
  },
});

export const getForEmbedding = internalQuery({
  args: { publicId: v.string() },
  handler: (ctx, args) => ctx.db.query("applicants").withIndex("by_public_id", (q) => q.eq("publicId", args.publicId)).unique(),
});

export const storeEmbedding = internalMutation({
  args: {
    publicId: v.string(),
    embedding: v.union(v.array(v.number()), v.null()),
    status: v.union(v.literal("completed"), v.literal("unavailable"), v.literal("failed")),
    embeddingModel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const applicant = await ctx.db.query("applicants").withIndex("by_public_id", (q) => q.eq("publicId", args.publicId)).unique();
    if (!applicant) throw new Error(`Applicant ${args.publicId} not found`);
    await ctx.db.patch("applicants", applicant._id, {
      embedding: args.embedding,
      embeddingStatus: args.status,
      ...(args.embeddingModel ? { embeddingModel: args.embeddingModel } : {}),
      updatedAt: Date.now(),
    });
  },
});

export const embed = action({
  args: { publicId: v.string() },
  handler: async (ctx, args) => {
    const applicant = await ctx.runQuery(internal.applicants.getForEmbedding, args);
    if (!applicant) throw new Error(`Applicant ${args.publicId} not found`);
    if (!env.OPENAI_API_KEY) {
      await ctx.runMutation(internal.applicants.storeEmbedding, { publicId: args.publicId, embedding: null, status: "unavailable" });
      return { status: "unavailable" as const };
    }
    const model = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
    try {
      const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, input: applicant.resumeText }),
      });
      const payload = await response.json() as { data?: Array<{ embedding?: number[] }> };
      const embedding = payload.data?.[0]?.embedding;
      if (!response.ok || !embedding) throw new Error("Embedding request failed");
      await ctx.runMutation(internal.applicants.storeEmbedding, { publicId: args.publicId, embedding, status: "completed", embeddingModel: model });
      return { status: "completed" as const, dimensions: embedding.length };
    } catch {
      await ctx.runMutation(internal.applicants.storeEmbedding, { publicId: args.publicId, embedding: null, status: "failed" });
      return { status: "failed" as const };
    }
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

    const storedJobs = await ctx.db.query("jobs").take(100);
    const jobs = storedJobs.filter(isCanonicalJob) as Job[];
    const matches = rankJobsForApplicant(applicant, jobs).slice(0, args.limit ?? 5);

    return {
      applicant,
      matches,
    };
  },
});
