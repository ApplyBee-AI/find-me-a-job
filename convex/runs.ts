import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

const actor = v.union(v.literal("applicant"), v.literal("recruiter"));
const runStatus = v.union(
  v.literal("queued"),
  v.literal("scoring"),
  v.literal("explaining"),
  v.literal("completed"),
  v.literal("needs_review"),
  v.literal("failed"),
);

const now = () => Date.now();
const runSessionId = (runId: string) => `run:${runId}`;

const log = async (
  ctx: { db: any },
  input: {
    runId: string;
    role: "applicant" | "recruiter";
    personaId: string;
    sessionId: string;
    agentType: string;
    action: string;
    message: string;
    payloadJson?: string;
  },
) => ctx.db.insert("runLogs", { ...input, timestamp: now() });

const createRun = async (
  ctx: { db: any },
  args: {
    actor: "applicant" | "recruiter";
    personaId: string;
    selectedMatchId?: string;
    scenarioId?: string;
  },
) => {
  const persona =
    args.actor === "applicant"
      ? await ctx.db.query("applicants").withIndex("by_public_id", (q: any) => q.eq("publicId", args.personaId)).unique()
      : await ctx.db.query("recruiters").withIndex("by_public_id", (q: any) => q.eq("publicId", args.personaId)).unique();

  if (!persona) throw new Error(`${args.actor} ${args.personaId} not found`);

  const runId = crypto.randomUUID();
  const sessionId = runSessionId(runId);
  const timestamp = now();
  const inputSnapshotJson = JSON.stringify({
    actor: args.actor,
    personaId: args.personaId,
    selectedMatchId: args.selectedMatchId,
    scenarioId: args.scenarioId,
    persona,
  });

  await ctx.db.insert("runs", {
    runId,
    actor: args.actor,
    personaId: args.personaId,
    selectedMatchId: args.selectedMatchId,
    sessionId,
    inputSnapshotJson,
    status: "queued",
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  await log(ctx, {
    runId,
    role: args.actor,
    personaId: args.personaId,
    sessionId,
    agentType: "run-manager",
    action: "start_run",
    message: "Run manager stored an immutable input snapshot and queued deterministic scoring.",
    payloadJson: JSON.stringify({ scenarioId: args.scenarioId }),
  });
  return { runId, status: "queued" as const };
};

export const start = mutation({
  args: { actor, personaId: v.string(), selectedMatchId: v.optional(v.string()), scenarioId: v.optional(v.string()) },
  handler: (ctx, args) => createRun(ctx, args),
});

export const get = query({
  args: { runId: v.string() },
  handler: async (ctx, args) => {
    const run = await ctx.db.query("runs").withIndex("by_run_id", (q) => q.eq("runId", args.runId)).unique();
    if (!run) return null;
    return {
      ...run,
      inputSnapshot: JSON.parse(run.inputSnapshotJson),
      ranking: run.rankingJson ? JSON.parse(run.rankingJson) : null,
      hermesOutput: run.hermesOutputJson ? JSON.parse(run.hermesOutputJson) : null,
    };
  },
});

export const listByPersona = query({
  args: { actor, personaId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) =>
    ctx.db
      .query("runs")
      .withIndex("by_actor_and_persona_id", (q) => q.eq("actor", args.actor).eq("personaId", args.personaId))
      .order("desc")
      .take(args.limit ?? 20),
});

export const getLogs = query({
  args: { runId: v.string() },
  handler: (ctx, args) =>
    ctx.db.query("runLogs").withIndex("by_run_id", (q) => q.eq("runId", args.runId)).order("asc").collect(),
});

export const getToolCalls = query({
  args: { runId: v.string() },
  handler: (ctx, args) =>
    ctx.db.query("toolCalls").withIndex("by_run_id", (q) => q.eq("runId", args.runId)).order("asc").collect(),
});

export const getForExecution = internalQuery({
  args: { runId: v.string() },
  handler: (ctx, args) =>
    ctx.db.query("runs").withIndex("by_run_id", (q) => q.eq("runId", args.runId)).unique(),
});

export const createFromStored = internalMutation({
  args: { priorRunId: v.string() },
  handler: async (ctx, args): Promise<ExecuteResult> => {
    const prior = await ctx.db.query("runs").withIndex("by_run_id", (q) => q.eq("runId", args.priorRunId)).unique();
    if (!prior) throw new Error(`Run ${args.priorRunId} not found`);
    return createRun(ctx, {
      actor: prior.actor,
      personaId: prior.personaId,
      selectedMatchId: prior.selectedMatchId,
    });
  },
});

export const transition = internalMutation({
  args: { runId: v.string(), status: runStatus, message: v.string(), errorDetails: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const run = await ctx.db.query("runs").withIndex("by_run_id", (q) => q.eq("runId", args.runId)).unique();
    if (!run) throw new Error(`Run ${args.runId} not found`);
    const completedAt = args.status === "completed" || args.status === "needs_review" || args.status === "failed" ? now() : undefined;
    await ctx.db.patch("runs", run._id, {
      status: args.status,
      ...(args.errorDetails ? { errorDetails: args.errorDetails } : {}),
      ...(completedAt ? { completedAt } : {}),
      updatedAt: now(),
    });
    await log(ctx, {
      runId: run.runId,
      role: run.actor,
      personaId: run.personaId,
      sessionId: run.sessionId,
      agentType: "run-manager",
      action: "transition",
      message: args.message,
      payloadJson: JSON.stringify({ status: args.status, errorDetails: args.errorDetails }),
    });
  },
});

export const storeRanking = internalMutation({
  args: { runId: v.string(), rankingJson: v.string() },
  handler: async (ctx, args) => {
    const run = await ctx.db.query("runs").withIndex("by_run_id", (q) => q.eq("runId", args.runId)).unique();
    if (!run) throw new Error(`Run ${args.runId} not found`);
    await ctx.db.patch("runs", run._id, { rankingJson: args.rankingJson, updatedAt: now() });
    await log(ctx, {
      runId: run.runId,
      role: run.actor,
      personaId: run.personaId,
      sessionId: run.sessionId,
      agentType: "matching-specialist",
      action: "persist_ranking",
      message: "Matching specialist persisted sorted deterministic matches and evidence.",
    });
  },
});

export const storeExplanation = internalMutation({
  args: { runId: v.string(), outputJson: v.string(), needsReview: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const run = await ctx.db.query("runs").withIndex("by_run_id", (q) => q.eq("runId", args.runId)).unique();
    if (!run) throw new Error(`Run ${args.runId} not found`);
    await ctx.db.patch("runs", run._id, {
      hermesOutputJson: args.outputJson,
      status: args.needsReview ? "needs_review" : "completed",
      completedAt: now(),
      updatedAt: now(),
    });
    await log(ctx, {
      runId: run.runId,
      role: run.actor,
      personaId: run.personaId,
      sessionId: run.sessionId,
      agentType: "hermes-explainer",
      action: "persist_explanation",
      message: args.needsReview
        ? "Hermes explainer had insufficient stored evidence; run needs human review."
        : "Hermes explainer stored a grounded explanation without changing ranking data.",
    });
  },
});

export const recordToolCall = internalMutation({
  args: {
    runId: v.string(), agentType: v.string(), task: v.string(),
    status: v.union(v.literal("started"), v.literal("completed"), v.literal("failed")),
    inputJson: v.optional(v.string()), outputSummary: v.optional(v.string()),
    errorDetails: v.optional(v.string()), durationMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const timestamp = now();
    await ctx.db.insert("toolCalls", { ...args, createdAt: timestamp, updatedAt: timestamp });
  },
});

type ExecuteResult = {
  runId: string;
  status: "queued" | "scoring" | "explaining" | "completed" | "needs_review" | "failed";
  error?: string;
};

export const rerun = action({
  args: { priorRunId: v.string() },
  handler: async (ctx, args): Promise<ExecuteResult> => {
    const created = await ctx.runMutation(internal.runs.createFromStored, { priorRunId: args.priorRunId });
    return ctx.runAction(internal.runs.executeInternal, { runId: created.runId });
  },
});

export const executeInternal = internalAction({
  args: { runId: v.string() },
  handler: async (ctx, args): Promise<ExecuteResult> => {
    const run = await ctx.runQuery(internal.runs.getForExecution, { runId: args.runId });
    if (!run) throw new Error(`Run ${args.runId} not found`);
    if (run.status === "completed" || run.status === "needs_review") return { runId: run.runId, status: run.status };

    const startedAt = now();
    try {
      await ctx.runMutation(internal.runs.transition, {
        runId: run.runId,
        status: "scoring",
        message: "Run manager handed persisted inputs to matching-specialist.",
      });
      await ctx.runMutation(internal.runs.recordToolCall, {
        runId: run.runId,
        agentType: "matching-specialist",
        task: run.actor === "applicant" ? "rank_jobs" : "rank_candidates",
        status: "started",
      });

      const matches = run.actor === "applicant"
        ? await ctx.runQuery(api.matching.applicantToJobs, { applicantId: run.personaId, limit: 10 })
        : await ctx.runQuery(api.matching.recruiterToCandidates, { recruiterId: run.personaId, limit: 10 });
      const rankingJson = JSON.stringify({ actor: run.actor, matches });
      await ctx.runMutation(internal.runs.storeRanking, { runId: run.runId, rankingJson });
      await ctx.runMutation(internal.runs.recordToolCall, {
        runId: run.runId,
        agentType: "matching-specialist",
        task: run.actor === "applicant" ? "rank_jobs" : "rank_candidates",
        status: "completed",
        outputSummary: `Persisted ${matches.length} deterministic matches.`,
        durationMs: now() - startedAt,
      });

      if (matches.length === 0) {
        await ctx.runMutation(internal.runs.storeExplanation, {
          runId: run.runId,
          outputJson: JSON.stringify({ summary: "No stored matches were available.", nextAction: "Review seed or imported data.", confidence: "low", mode: "fallback" }),
          needsReview: true,
        });
        return { runId: run.runId, status: "needs_review" as const };
      }

      await ctx.runMutation(internal.runs.transition, {
        runId: run.runId,
        status: "explaining",
        message: "Run manager handed persisted deterministic evidence to hermes-explainer.",
      });
      const explanationStartedAt = now();
      await ctx.runMutation(internal.runs.recordToolCall, {
        runId: run.runId, agentType: "hermes-explainer", task: "explain_ranking", status: "started",
      });
      const explanation = await ctx.runAction(internal.hermes.explainRun, { runId: run.runId });
      await ctx.runMutation(internal.runs.recordToolCall, {
        runId: run.runId,
        agentType: "hermes-explainer",
        task: "explain_ranking",
        status: "completed",
        outputSummary: explanation.summary,
        durationMs: now() - explanationStartedAt,
      });
      return { runId: run.runId, status: explanation.needsReview ? "needs_review" as const : "completed" as const };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await ctx.runMutation(internal.runs.recordToolCall, {
        runId: run.runId, agentType: "run-manager", task: "execute_run", status: "failed", errorDetails: message,
      });
      await ctx.runMutation(internal.runs.transition, {
        runId: run.runId, status: "failed", message: "Run manager recorded a workflow failure.", errorDetails: message,
      });
      return { runId: run.runId, status: "failed" as const, error: message };
    }
  },
});

export const execute = action({
  args: { runId: v.string() },
  handler: async (ctx, args): Promise<ExecuteResult> => await ctx.runAction(internal.runs.executeInternal, args),
});
