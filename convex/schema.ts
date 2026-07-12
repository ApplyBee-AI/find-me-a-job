import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const actor = v.union(v.literal("applicant"), v.literal("recruiter"));
const runStatus = v.union(
  v.literal("queued"),
  v.literal("scoring"),
  v.literal("explaining"),
  v.literal("completed"),
  v.literal("needs_review"),
  v.literal("failed"),
);

export default defineSchema({
  waitlist: defineTable({
    email: v.string(),
    joinedAt: v.number(),
  }).index("by_email", ["email"]),

  // Deprecated legacy table. New matching reads only applicants.
  roles: defineTable({
    founderId: v.string(),
    title: v.string(),
    location: v.string(),
    originalJd: v.string(),
    rewrittenJd: v.optional(v.string()),
    screeningRubric: v.optional(v.any()),
    status: v.string(),
  }),

  candidates: defineTable({
    roleId: v.id("roles"),
    name: v.string(),
    linkedinUrl: v.optional(v.string()),
    githubUrl: v.optional(v.string()),
    evidenceLinks: v.array(v.string()),
    rubricScore: v.optional(v.number()),
    qaVerdict: v.string(),
    outreachDraft: v.optional(v.string()),
    status: v.string(),
  }).index("by_role", ["roleId"]),

  jobs: defineTable({
    // Canonical matching fields are optional at the storage boundary because the
    // deployment contains pre-normalization imports. Matching filters for all of them.
    publicId: v.optional(v.string()),
    company: v.string(),
    title: v.string(),
    location: v.string(),
    workMode: v.optional(v.string()),
    skills: v.array(v.string()),
    experienceLevel: v.string(),
    minYearsExperience: v.optional(v.number()),
    description: v.optional(v.string()),
    applyUrl: v.optional(v.string()),
    highlights: v.optional(v.array(v.string())),

    // Additive normalized importer contract.
    platform: v.optional(v.string()),
    externalJobId: v.optional(v.string()),
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
    isActive: v.optional(v.boolean()),
    scrapedAt: v.optional(v.string()),
    sourceMetadataJson: v.optional(v.string()),
    embedding: v.optional(v.union(v.array(v.number()), v.null())),
    embeddingModel: v.optional(v.string()),
    embeddingVersion: v.optional(v.string()),

    // Pre-normalization import fields retained for a non-destructive migration.
    externalId: v.optional(v.string()),
    jobUrl: v.optional(v.string()),
    applicationLink: v.optional(v.string()),
    jobType: v.optional(v.string()),
    isExternal: v.optional(v.boolean()),
    sectorTags: v.optional(v.array(v.string())),
    extraData: v.optional(v.any()),
  })
    .index("by_public_id", ["publicId"])
    .index("by_external_id", ["externalId"])
    .index("by_platform_and_external_id", ["platform", "externalJobId"]),

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
    source: v.optional(v.union(v.literal("resume"), v.literal("guided_intake"), v.literal("import"))),
    // Provenance retained for the existing consented/public-example imports.
    sourceKind: v.optional(v.string()),
    sourceId: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    sourcePage: v.optional(v.number()),
    sourceChecksum: v.optional(v.string()),
    intakeStatus: v.optional(v.union(v.literal("incomplete"), v.literal("ready"))),
    embedding: v.optional(v.union(v.array(v.number()), v.null())),
    embeddingModel: v.optional(v.string()),
    embeddingVersion: v.optional(v.string()),
    embeddingStatus: v.optional(v.union(v.literal("pending"), v.literal("completed"), v.literal("unavailable"), v.literal("failed"))),
    updatedAt: v.optional(v.number()),
  }).index("by_public_id", ["publicId"]),

  recruiters: defineTable({
    publicId: v.string(),
    name: v.optional(v.string()),
    company: v.string(),
    roleToHire: v.string(),
    prioritySkills: v.array(v.string()),
    niceToHave: v.array(v.string()),
    story: v.string(),
    location: v.string(),
    workMode: v.string(),
    interviewFocus: v.array(v.string()),
    jobPublicId: v.optional(v.string()),
    source: v.optional(v.union(v.literal("job"), v.literal("manual"))),
    // Legacy recruiter records remain readable during migration.
    isExample: v.optional(v.boolean()),
    sourceKind: v.optional(v.string()),
    updatedAt: v.optional(v.number()),
  }).index("by_public_id", ["publicId"]).index("by_job_public_id", ["jobPublicId"]),

  intakeSessions: defineTable({
    sessionId: v.string(),
    phase: v.union(v.literal("name"), v.literal("roles"), v.literal("location"), v.literal("experience"), v.literal("skills"), v.literal("resume"), v.literal("ready"), v.literal("completed")),
    fieldsJson: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    applicantPublicId: v.optional(v.string()),
  }).index("by_session_id", ["sessionId"]),

  intakeMessages: defineTable({
    sessionId: v.string(),
    role: v.union(v.literal("hermes"), v.literal("applicant")),
    content: v.string(),
    createdAt: v.number(),
  }).index("by_session_id", ["sessionId"]),

  sessions: defineTable({
    sessionId: v.string(),
    role: actor,
    personaId: v.string(),
    selectedMatchId: v.optional(v.string()),
    recentQuery: v.optional(v.string()),
    lastRunId: v.optional(v.string()),
    lastMatchIds: v.array(v.string()),
    updatedAt: v.number(),
  })
    .index("by_session_id", ["sessionId"])
    .index("by_role_and_persona_id", ["role", "personaId"]),

  runs: defineTable({
    runId: v.string(),
    actor: actor,
    personaId: v.string(),
    selectedMatchId: v.optional(v.string()),
    sessionId: v.string(),
    inputSnapshotJson: v.string(),
    status: runStatus,
    rankingJson: v.optional(v.string()),
    hermesOutputJson: v.optional(v.string()),
    errorDetails: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_run_id", ["runId"])
    .index("by_actor_and_persona_id", ["actor", "personaId"])
    .index("by_status", ["status"]),

  toolCalls: defineTable({
    runId: v.string(),
    agentType: v.string(),
    task: v.string(),
    status: v.union(v.literal("started"), v.literal("completed"), v.literal("failed")),
    inputJson: v.optional(v.string()),
    outputSummary: v.optional(v.string()),
    errorDetails: v.optional(v.string()),
    durationMs: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_run_id", ["runId"])
    .index("by_agent_and_task", ["agentType", "task"]),

  evaluations: defineTable({
    scenarioId: v.string(),
    name: v.string(),
    actor: actor,
    personaId: v.string(),
    expectedTopMatchId: v.string(),
    lastRunId: v.optional(v.string()),
    lastPassed: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_scenario_id", ["scenarioId"]),

  runLogs: defineTable({
    // roleId is from the legacy UI log contract; the remaining fields are the
    // observable run contract used by the unified backend.
    roleId: v.optional(v.id("roles")),
    runId: v.optional(v.string()),
    role: v.optional(actor),
    personaId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    agentType: v.string(),
    action: v.string(),
    message: v.optional(v.string()),
    payloadJson: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_run_id", ["runId"])
    .index("by_role_and_persona_id", ["role", "personaId"])
    .index("by_run_agent_and_task", ["runId", "agentType", "action"]),
});
