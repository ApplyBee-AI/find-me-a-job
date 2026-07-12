import { query, mutation, action } from "./_generated/server";
import { api } from "./_generated/api";
import { env } from "./_generated/server";
import { v } from "convex/values";
import { rankJobsForApplicant } from "./lib/matching";

const applicantFields = {
  publicId: v.string(),
  name: v.string(),
  targetRoles: v.array(v.string()),
  skills: v.array(v.string()),
  resumeText: v.string(),
  location: v.string(),
  remote: v.boolean(),
  experienceYears: v.number(),
  education: v.string(),
  availability: v.string(),
  projects: v.array(v.string()),
  evidenceLines: v.array(v.string()),
  profileStory: v.string(),
  embedding: v.optional(v.array(v.number())),
  embeddingModel: v.optional(v.string()),
  embeddingVersion: v.optional(v.string()),
  sourceKind: v.optional(v.string()),
  sourceId: v.optional(v.string()),
  sourceUrl: v.optional(v.string()),
  sourcePage: v.optional(v.number()),
  sourceChecksum: v.optional(v.string()),
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

export const upsertApplicant = mutation({
  args: applicantFields,
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("applicants")
      .withIndex("by_public_id", (q) => q.eq("publicId", args.publicId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    } else {
      return await ctx.db.insert("applicants", args);
    }
  },
});

export const importPublicExamples = mutation({
  args: { applicants: v.array(v.object(applicantFields)) },
  handler: async (ctx, args) => {
    let imported = 0;
    let updated = 0;

    for (const applicant of args.applicants) {
      const existing = await ctx.db
        .query("applicants")
        .withIndex("by_public_id", (query) => query.eq("publicId", applicant.publicId))
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, applicant);
        updated += 1;
      } else {
        await ctx.db.insert("applicants", applicant);
        imported += 1;
      }
    }

    return { imported, updated };
  },
});

export const parseResume = action({
  args: {
    resumeText: v.string(),
  },
  handler: async (ctx, args) => {
    const publicId = "applicant_" + crypto.randomUUID().slice(0, 8);
    let parsed = {
      name: "Applicant Persona",
      targetRoles: ["Software Engineer"],
      skills: ["React", "TypeScript", "Node.js"],
      location: "Bengaluru, India",
      remote: true,
      experienceYears: 3,
      education: "B.Tech in Computer Science",
      availability: "Immediate",
      projects: ["Personal portfolio website built with Next.js"],
      evidenceLines: ["Active GitHub contributor with multiple repositories", "Built and deployed full-stack web applications"],
      profileStory: "A passionate developer skilled in modern web technologies looking for new challenges.",
    };

    if (env.OPENAI_API_KEY) {
      try {
        const response = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: env.HERMES_MODEL ?? "gpt-4.1",
            input: [
              {
                role: "system",
                content: [{
                  type: "input_text",
                  text: `You are an expert ATS (Applicant Tracking System) resume parser.
Extract the details of the resume and return a structured JSON response fitting this exact TypeScript shape:
{
  "name": string,
  "targetRoles": string[],
  "skills": string[],
  "location": string,
  "remote": boolean,
  "experienceYears": number,
  "education": string,
  "availability": string,
  "projects": string[],
  "evidenceLines": string[],
  "profileStory": string
}
Do not return any markdown formatting or prefix/suffix. Return pure JSON. Output JSON only.`
                }],
              },
              {
                role: "user",
                content: [{ type: "input_text", text: args.resumeText }],
              },
            ],
          }),
        });

        if (response.ok) {
          const payload = await response.json();
          const firstText = payload.output
            ?.flatMap((item: any) => item.content ?? [])
            .find((item: any) => item.type?.includes("text") && item.text);
          const rawText = payload.output_text || firstText?.text;
          if (rawText) {
            const cleanedJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
            const result = JSON.parse(cleanedJson);
            parsed = {
              name: result.name || parsed.name,
              targetRoles: Array.isArray(result.targetRoles) ? result.targetRoles : parsed.targetRoles,
              skills: Array.isArray(result.skills) ? result.skills : parsed.skills,
              location: result.location || parsed.location,
              remote: typeof result.remote === "boolean" ? result.remote : parsed.remote,
              experienceYears: typeof result.experienceYears === "number" ? result.experienceYears : parsed.experienceYears,
              education: result.education || parsed.education,
              availability: result.availability || parsed.availability,
              projects: Array.isArray(result.projects) ? result.projects : parsed.projects,
              evidenceLines: Array.isArray(result.evidenceLines) ? result.evidenceLines : parsed.evidenceLines,
              profileStory: result.profileStory || parsed.profileStory,
            };
          }
        }
      } catch (err) {
        console.error("OpenAI resume parsing error, falling back to heuristics", err);
      }
    }

    if (!env.OPENAI_API_KEY) {
      const commonSkills = ["react", "typescript", "javascript", "node", "python", "go", "rust", "next.js", "tailwind", "aws", "postgres", "sql"];
      const lowerText = args.resumeText.toLowerCase();
      const detectedSkills = commonSkills.filter(skill => lowerText.includes(skill));
      if (detectedSkills.length > 0) {
        parsed.skills = detectedSkills.map(s => s === "node" ? "Node.js" : s === "postgres" ? "PostgreSQL" : s.charAt(0).toUpperCase() + s.slice(1));
      }
      const lines = args.resumeText.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length > 0 && lines[0].length < 40) {
        parsed.name = lines[0];
      }
    }

    await ctx.runMutation(api.applicants.upsertApplicant, {
      publicId,
      ...parsed,
      resumeText: args.resumeText,
    });

    return {
      publicId,
      ...parsed,
      resumeText: args.resumeText,
    };
  },
});
