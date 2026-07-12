import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const upsert = mutation({
  args: {
    sessionId: v.string(),
    role: v.union(v.literal("applicant"), v.literal("recruiter")),
    personaId: v.string(),
    selectedMatchId: v.optional(v.string()),
    recentQuery: v.optional(v.string()),
    lastRunId: v.optional(v.string()),
    lastMatchIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    const nextValue = {
      ...args,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch("sessions", existing._id, nextValue);
      return { sessionId: existing.sessionId, updated: true };
    }

    await ctx.db.insert("sessions", nextValue);
    return { sessionId: args.sessionId, created: true };
  },
});

export const getBySessionId = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .unique();
  },
});
