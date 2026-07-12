import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });

const badRequest = (message: string, status = 400) => json({ error: message }, status);

const parseBody = async (request: Request) => {
  try {
    return await request.json();
  } catch {
    return null;
  }
};

const lastSegment = (request: Request, countFromEnd = 1) => {
  const parts = new URL(request.url).pathname.split("/").filter(Boolean);
  return parts[parts.length - countFromEnd];
};

http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => json({ ok: true, service: "find-me-a-job-backend" })),
});

http.route({
  path: "/seed",
  method: "POST",
  handler: httpAction(async (ctx) => {
    const result = await ctx.runMutation(api.seed.seedDemo, {});
    return json(result);
  }),
});

http.route({
  path: "/applicants",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const result = await ctx.runQuery(api.applicants.list, {});
    return json(result);
  }),
});

http.route({
  pathPrefix: "/applicants/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const path = new URL(request.url).pathname;

    if (path.endsWith("/job-matches")) {
      const id = lastSegment(request, 2);
      const result = await ctx.runQuery(api.applicants.getJobMatches, { publicId: id, limit: 5 });
      return json(result);
    }

    const id = lastSegment(request);
    const result = await ctx.runQuery(api.applicants.getByPublicId, { publicId: id });
    return result ? json(result) : badRequest(`Applicant ${id} not found`, 404);
  }),
});

http.route({
  pathPrefix: "/applicants/",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const path = new URL(request.url).pathname;
    if (!path.endsWith("/ask-agent")) {
      return badRequest("Unsupported applicant POST route.", 404);
    }

    const id = lastSegment(request, 2);
    const body = await parseBody(request);
    if (!body || typeof body.query !== "string") {
      return badRequest("Body must include a string 'query' field.");
    }

    const result = await ctx.runAction(api.hermes.askApplicant, {
      applicantId: id,
      query: body.query,
      sessionId: typeof body.sessionId === "string" ? body.sessionId : undefined,
      selectedJobId: typeof body.selectedJobId === "string" ? body.selectedJobId : undefined,
    });
    return json(result);
  }),
});

http.route({
  path: "/recruiters",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const result = await ctx.runQuery(api.recruiters.list, {});
    return json(result);
  }),
});

http.route({
  pathPrefix: "/recruiters/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const path = new URL(request.url).pathname;

    if (path.endsWith("/candidate-matches")) {
      const id = lastSegment(request, 2);
      const result = await ctx.runQuery(api.recruiters.getCandidateMatches, {
        publicId: id,
        limit: 5,
      });
      return json(result);
    }

    const id = lastSegment(request);
    const result = await ctx.runQuery(api.recruiters.getByPublicId, { publicId: id });
    return result ? json(result) : badRequest(`Recruiter ${id} not found`, 404);
  }),
});

http.route({
  pathPrefix: "/recruiters/",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const path = new URL(request.url).pathname;
    if (!path.endsWith("/ask-agent")) {
      return badRequest("Unsupported recruiter POST route.", 404);
    }

    const id = lastSegment(request, 2);
    const body = await parseBody(request);
    if (!body || typeof body.query !== "string") {
      return badRequest("Body must include a string 'query' field.");
    }

    const result = await ctx.runAction(api.hermes.askRecruiter, {
      recruiterId: id,
      query: body.query,
      sessionId: typeof body.sessionId === "string" ? body.sessionId : undefined,
      selectedCandidateId:
        typeof body.selectedCandidateId === "string" ? body.selectedCandidateId : undefined,
    });
    return json(result);
  }),
});

http.route({
  path: "/match/applicant-to-jobs",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await parseBody(request);
    if (!body || typeof body.applicantId !== "string") {
      return badRequest("Body must include a string 'applicantId' field.");
    }

    const result = await ctx.runQuery(api.matching.applicantToJobs, {
      applicantId: body.applicantId,
      limit: typeof body.limit === "number" ? body.limit : undefined,
    });
    return json(result);
  }),
});

http.route({
  path: "/match/recruiter-to-candidates",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await parseBody(request);
    if (!body || typeof body.recruiterId !== "string") {
      return badRequest("Body must include a string 'recruiterId' field.");
    }

    const result = await ctx.runQuery(api.matching.recruiterToCandidates, {
      recruiterId: body.recruiterId,
      limit: typeof body.limit === "number" ? body.limit : undefined,
    });
    return json(result);
  }),
});

export default http;
