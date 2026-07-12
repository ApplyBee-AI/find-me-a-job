import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const write = mutation({
  args: {
    runId: v.string(),
    role: v.union(v.literal("applicant"), v.literal("recruiter")),
    personaId: v.string(),
    sessionId: v.string(),
    agentType: v.string(),
    action: v.string(),
    message: v.string(),
    payloadJson: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("runLogs", {
      ...args,
      timestamp: Date.now(),
    });
    return { logged: true };
  },
});

export const listForPersona = query({
  args: {
    role: v.union(v.literal("applicant"), v.literal("recruiter")),
    personaId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("runLogs")
      .withIndex("by_role_and_persona_id", (q) =>
        q.eq("role", args.role).eq("personaId", args.personaId),
      )
      .order("desc")
      .take(args.limit ?? 20);
  },
});
