import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  jobs: defineTable({
    publicId: v.string(),
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
  }).index("by_public_id", ["publicId"]),

  applicants: defineTable({
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
  }).index("by_public_id", ["publicId"]),

  recruiters: defineTable({
    publicId: v.string(),
    company: v.string(),
    roleToHire: v.string(),
    prioritySkills: v.array(v.string()),
    niceToHave: v.array(v.string()),
    story: v.string(),
    location: v.string(),
    workMode: v.string(),
    interviewFocus: v.array(v.string()),
  }).index("by_public_id", ["publicId"]),

  sessions: defineTable({
    sessionId: v.string(),
    role: v.union(v.literal("applicant"), v.literal("recruiter")),
    personaId: v.string(),
    selectedMatchId: v.optional(v.string()),
    recentQuery: v.optional(v.string()),
    lastRunId: v.optional(v.string()),
    lastMatchIds: v.array(v.string()),
    updatedAt: v.number(),
  })
    .index("by_session_id", ["sessionId"])
    .index("by_role_and_persona_id", ["role", "personaId"]),

  runLogs: defineTable({
    runId: v.string(),
    role: v.union(v.literal("applicant"), v.literal("recruiter")),
    personaId: v.string(),
    sessionId: v.string(),
    agentType: v.string(),
    action: v.string(),
    message: v.string(),
    payloadJson: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_run_id", ["runId"])
    .index("by_role_and_persona_id", ["role", "personaId"]),
});
