import { action, internalMutation, internalQuery, mutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";

const phase = v.union(
  v.literal("name"),
  v.literal("roles"),
  v.literal("location"),
  v.literal("experience"),
  v.literal("skills"),
  v.literal("resume"),
  v.literal("ready"),
  v.literal("completed"),
);

type IntakePhase = "name" | "roles" | "location" | "experience" | "skills" | "resume" | "ready" | "completed";

type IntakeFields = {
  name?: string;
  targetRoles?: string[];
  location?: string;
  experienceYears?: number;
  skills?: string[];
  resumeText?: string;
};

const questions: Record<string, string> = {
  name: "I will build your profile from your own information. What name should I use?",
  roles: "Which roles are you targeting? List one or more, separated by commas.",
  location: "What location should I consider, and are you open to remote work?",
  experience: "How many years of relevant experience do you have?",
  skills: "Which skills should I make sure to include? A comma-separated list is fine.",
  resume: "Paste your resume or a detailed professional summary. I will extract evidence and match it only against stored jobs.",
  ready: "I have the profile details needed to find matching jobs. Create your profile and run matching?",
};

const nextPhase = (current: IntakePhase): IntakePhase => {
  switch (current) {
    case "name": return "roles";
    case "roles": return "location";
    case "location": return "experience";
    case "experience": return "skills";
    case "skills": return "resume";
    default: return "ready";
  }
};
const list = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);

const writeMessage = (ctx: { db: any }, sessionId: string, role: "hermes" | "applicant", content: string) =>
  ctx.db.insert("intakeMessages", { sessionId, role, content, createdAt: Date.now() });

export const start = mutation({
  args: {},
  handler: async (ctx) => {
    const sessionId = crypto.randomUUID();
    const message = questions.name;
    await ctx.db.insert("intakeSessions", { sessionId, phase: "name", fieldsJson: "{}", createdAt: Date.now(), updatedAt: Date.now() });
    await writeMessage(ctx, sessionId, "hermes", message);
    return { sessionId, phase: "name" as const, message };
  },
});

export const reply = mutation({
  args: { sessionId: v.string(), message: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db.query("intakeSessions").withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId)).unique();
    if (!session) throw new Error("Intake session not found");
    if (session.phase === "completed") throw new Error("This intake session is already complete");
    const fields = JSON.parse(session.fieldsJson) as IntakeFields;
    const answer = args.message.trim();
    if (!answer) throw new Error("Please provide a response before continuing.");
    await writeMessage(ctx, args.sessionId, "applicant", answer);

    switch (session.phase) {
      case "name": fields.name = answer; break;
      case "roles": fields.targetRoles = list(answer); break;
      case "location": fields.location = answer; break;
      case "experience": fields.experienceYears = Number.parseInt(answer.match(/\d+/)?.[0] ?? "0", 10); break;
      case "skills": fields.skills = list(answer); break;
      case "resume": fields.resumeText = answer; break;
    }

    const phase = nextPhase(session.phase);
    const message = questions[phase];
    await ctx.db.patch("intakeSessions", session._id, { phase, fieldsJson: JSON.stringify(fields), updatedAt: Date.now() });
    await writeMessage(ctx, args.sessionId, "hermes", message);
    return { phase, message, ready: phase === "ready" };
  },
});

export const getForCompletion = internalQuery({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => ctx.db.query("intakeSessions").withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId)).unique(),
});

export const markCompleted = internalMutation({
  args: { sessionId: v.string(), applicantPublicId: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db.query("intakeSessions").withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId)).unique();
    if (!session) throw new Error("Intake session not found");
    await ctx.db.patch("intakeSessions", session._id, { phase: "completed", applicantPublicId: args.applicantPublicId, updatedAt: Date.now() });
    await writeMessage(ctx, args.sessionId, "hermes", "Your profile is ready. I will now find matches from the stored job database.");
  },
});

export const complete = action({
  args: { sessionId: v.string() },
  handler: async (ctx, args): Promise<{ publicId: string; skills?: string[]; targetRoles?: string[] }> => {
    const session = await ctx.runQuery(internal.intake.getForCompletion, args);
    if (!session) throw new Error("Intake session not found");
    if (session.applicantPublicId) return { publicId: session.applicantPublicId };
    const fields = JSON.parse(session.fieldsJson) as IntakeFields;
    if (!fields.name || !fields.resumeText || fields.resumeText.length < 80) throw new Error("Please provide your name and a detailed resume or summary before completing intake.");
    const created = await ctx.runMutation(api.applicants.createFromResume, {
      name: fields.name,
      resumeText: fields.resumeText,
      targetRoles: fields.targetRoles,
      skills: fields.skills,
      location: fields.location,
      experienceYears: fields.experienceYears,
    });
    await ctx.runMutation(internal.intake.markCompleted, { sessionId: args.sessionId, applicantPublicId: created.publicId });
    return created;
  },
});
