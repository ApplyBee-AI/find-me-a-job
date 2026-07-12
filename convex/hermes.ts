import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { env } from "./_generated/server";
import { v } from "convex/values";
import {
  type ApplicantJobMatch,
  type RecruiterCandidateMatch,
  buildApplicantFallbackAnswer,
  buildRecruiterFallbackAnswer,
} from "./lib/matching";

const APPLICANT_PROMPT = `You are TalentTwin AI's applicant career agent.
Use the provided applicant profile and job-match results.
Explain scores clearly, identify missing skills, and suggest practical next steps.
Never invent job details outside the supplied data.`;

const RECRUITER_PROMPT = `You are TalentTwin AI's recruiter copilot.
Use the supplied hiring requirements and candidate match scores.
Explain strengths, identify gaps, and recommend interview questions when useful.
Never invent candidate facts outside the supplied data.`;

type ResponseApiResult = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

type AskAgentResponse = {
  sessionId: string;
  runId: string;
  mode: "live" | "fallback";
  answer: string;
  selectedMatch: ApplicantJobMatch | RecruiterCandidateMatch;
  topMatches: ApplicantJobMatch[] | RecruiterCandidateMatch[];
};

const extractOutputText = (payload: ResponseApiResult) => {
  if (payload.output_text) {
    return payload.output_text;
  }

  const firstText = payload.output
    ?.flatMap((item) => item.content ?? [])
    .find((item) => item.type?.includes("text") && item.text);

  return firstText?.text ?? null;
};

export const askApplicant = action({
  args: {
    applicantId: v.string(),
    query: v.string(),
    sessionId: v.optional(v.string()),
    selectedJobId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<AskAgentResponse> => {
    const applicantResult = await ctx.runQuery(api.applicants.getByPublicId, {
      publicId: args.applicantId,
    });
    const matchResult: {
      applicant: NonNullable<typeof applicantResult>;
      matches: ApplicantJobMatch[];
    } = await ctx.runQuery(api.applicants.getJobMatches, {
      publicId: args.applicantId,
      limit: 5,
    });

    if (!applicantResult) {
      throw new Error(`Applicant ${args.applicantId} not found`);
    }

    const sessionId = args.sessionId ?? crypto.randomUUID();
    const runId = crypto.randomUUID();
    const selectedMatch: ApplicantJobMatch | undefined =
      matchResult.matches.find((match) => match.jobId === args.selectedJobId) ?? matchResult.matches[0];

    if (!selectedMatch) {
      throw new Error(`No job matches found for applicant ${args.applicantId}`);
    }
    const job = await ctx.runQuery(api.jobs.getByPublicId, {
      publicId: selectedMatch.jobId,
    });

    if (!job) {
      throw new Error(`Job ${selectedMatch.jobId} not found`);
    }

    const fallbackAnswer = buildApplicantFallbackAnswer(
      applicantResult,
      job,
      selectedMatch,
      args.query,
    );

    let answer = fallbackAnswer;
    let mode: "live" | "fallback" = "fallback";

    if (env.OPENAI_API_KEY) {
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
              content: [{ type: "input_text", text: APPLICANT_PROMPT }],
            },
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: JSON.stringify(
                    {
                      applicant: applicantResult,
                      selectedJob: job,
                      selectedMatch,
                      topMatches: matchResult.matches.slice(0, 3),
                      query: args.query,
                    },
                    null,
                    2,
                  ),
                },
              ],
            },
          ],
        }),
      });

      if (response.ok) {
        const payload = (await response.json()) as ResponseApiResult;
        const liveAnswer = extractOutputText(payload);
        if (liveAnswer) {
          answer = liveAnswer;
          mode = "live";
        }
      }
    }

    await ctx.runMutation(api.sessions.upsert, {
      sessionId,
      role: "applicant",
      personaId: args.applicantId,
      selectedMatchId: selectedMatch.jobId,
      recentQuery: args.query,
      lastRunId: runId,
      lastMatchIds: matchResult.matches.map((match) => match.jobId),
    });

    await ctx.runMutation(api.logs.write, {
      runId,
      role: "applicant",
      personaId: args.applicantId,
      sessionId,
      agentType: "hermes",
      action: "ask_agent",
      message: mode === "live" ? "Hermes responded using OpenAI." : "Hermes responded using fallback logic.",
      payloadJson: JSON.stringify({
        query: args.query,
        selectedJobId: selectedMatch.jobId,
        mode,
      }),
    });

    return {
      sessionId,
      runId,
      mode,
      answer,
      selectedMatch,
      topMatches: matchResult.matches.slice(0, 3),
    };
  },
});

export const askRecruiter = action({
  args: {
    recruiterId: v.string(),
    query: v.string(),
    sessionId: v.optional(v.string()),
    selectedCandidateId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<AskAgentResponse> => {
    const recruiterResult = await ctx.runQuery(api.recruiters.getByPublicId, {
      publicId: args.recruiterId,
    });
    const matchResult: {
      recruiter: NonNullable<typeof recruiterResult>;
      matches: RecruiterCandidateMatch[];
    } = await ctx.runQuery(api.recruiters.getCandidateMatches, {
      publicId: args.recruiterId,
      limit: 5,
    });

    if (!recruiterResult) {
      throw new Error(`Recruiter ${args.recruiterId} not found`);
    }

    const sessionId = args.sessionId ?? crypto.randomUUID();
    const runId = crypto.randomUUID();
    const selectedMatch: RecruiterCandidateMatch | undefined =
      matchResult.matches.find((match) => match.candidateId === args.selectedCandidateId) ??
      matchResult.matches[0];

    if (!selectedMatch) {
      throw new Error(`No candidate matches found for recruiter ${args.recruiterId}`);
    }
    const candidate = await ctx.runQuery(api.applicants.getByPublicId, {
      publicId: selectedMatch.candidateId,
    });

    if (!candidate) {
      throw new Error(`Candidate ${selectedMatch.candidateId} not found`);
    }

    const fallbackAnswer = buildRecruiterFallbackAnswer(
      recruiterResult,
      candidate,
      selectedMatch,
      args.query,
    );

    let answer = fallbackAnswer;
    let mode: "live" | "fallback" = "fallback";

    if (env.OPENAI_API_KEY) {
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
              content: [{ type: "input_text", text: RECRUITER_PROMPT }],
            },
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: JSON.stringify(
                    {
                      recruiter: recruiterResult,
                      selectedCandidate: candidate,
                      selectedMatch,
                      topMatches: matchResult.matches.slice(0, 3),
                      query: args.query,
                    },
                    null,
                    2,
                  ),
                },
              ],
            },
          ],
        }),
      });

      if (response.ok) {
        const payload = (await response.json()) as ResponseApiResult;
        const liveAnswer = extractOutputText(payload);
        if (liveAnswer) {
          answer = liveAnswer;
          mode = "live";
        }
      }
    }

    await ctx.runMutation(api.sessions.upsert, {
      sessionId,
      role: "recruiter",
      personaId: args.recruiterId,
      selectedMatchId: selectedMatch.candidateId,
      recentQuery: args.query,
      lastRunId: runId,
      lastMatchIds: matchResult.matches.map((match) => match.candidateId),
    });

    await ctx.runMutation(api.logs.write, {
      runId,
      role: "recruiter",
      personaId: args.recruiterId,
      sessionId,
      agentType: "hermes",
      action: "ask_agent",
      message: mode === "live" ? "Hermes responded using OpenAI." : "Hermes responded using fallback logic.",
      payloadJson: JSON.stringify({
        query: args.query,
        selectedCandidateId: selectedMatch.candidateId,
        mode,
      }),
    });

    return {
      sessionId,
      runId,
      mode,
      answer,
      selectedMatch,
      topMatches: matchResult.matches.slice(0, 3),
    };
  },
});
