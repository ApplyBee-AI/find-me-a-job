import { mutation } from "./_generated/server";
import { v } from "convex/values";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const joinWaitlist = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(email)) {
      return { success: false, message: "Please enter a valid email address." };
    }

    const existing = await ctx.db
      .query("waitlist")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (existing) {
      return { success: true, message: "Already on the waitlist" };
    }

    await ctx.db.insert("waitlist", { email, joinedAt: Date.now() });
    return { success: true, message: "Joined the waitlist" };
  },
});
