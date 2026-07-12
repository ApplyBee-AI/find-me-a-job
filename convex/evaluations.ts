import { action, internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

export const get = query({
  args: { scenarioId: v.string() },
  handler: (ctx, args) => ctx.db.query("evaluations").withIndex("by_scenario_id", (q) => q.eq("scenarioId", args.scenarioId)).unique(),
});

export const getInternal = internalQuery({
  args: { scenarioId: v.string() },
  handler: (ctx, args) => ctx.db.query("evaluations").withIndex("by_scenario_id", (q) => q.eq("scenarioId", args.scenarioId)).unique(),
});

export const record = internalMutation({
  args: { scenarioId: v.string(), runId: v.string(), passed: v.boolean() },
  handler: async (ctx, args) => {
    const scenario = await ctx.db.query("evaluations").withIndex("by_scenario_id", (q) => q.eq("scenarioId", args.scenarioId)).unique();
    if (!scenario) throw new Error(`Scenario ${args.scenarioId} not found`);
    await ctx.db.patch("evaluations", scenario._id, { lastRunId: args.runId, lastPassed: args.passed, updatedAt: Date.now() });
  },
});

type EvaluationResult = { runId: string; passed: boolean; expectedTopMatchId: string; actualTopMatchId?: string };

export const run = action({
  args: { scenarioId: v.string() },
  handler: async (ctx, args): Promise<EvaluationResult> => {
    const scenario = await ctx.runQuery(internal.evaluations.getInternal, args);
    if (!scenario) throw new Error(`Scenario ${args.scenarioId} not found`);
    const started = await ctx.runMutation(api.runs.start, { actor: scenario.actor, personaId: scenario.personaId, scenarioId: scenario.scenarioId });
    await ctx.runAction(api.runs.execute, { runId: started.runId });
    const result = await ctx.runQuery(api.runs.get, { runId: started.runId });
    const actualTopMatchId = result?.ranking?.matches?.[0]?.jobId ?? result?.ranking?.matches?.[0]?.candidateId;
    const passed = actualTopMatchId === scenario.expectedTopMatchId;
    await ctx.runMutation(internal.evaluations.record, { scenarioId: scenario.scenarioId, runId: started.runId, passed });
    return { runId: started.runId, passed, expectedTopMatchId: scenario.expectedTopMatchId, actualTopMatchId };
  },
});
