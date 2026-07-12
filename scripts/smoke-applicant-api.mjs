import { readFileSync } from "node:fs";

const envFile = new URL("../.env.local", import.meta.url);
const envLines = readFileSync(envFile, "utf8").split(/\r?\n/);
const siteUrl = process.env.CONVEX_SITE_URL ?? envLines
  .find((line) => line.startsWith("CONVEX_SITE_URL="))
  ?.slice("CONVEX_SITE_URL=".length)
  .replace(/^['"]|['"]$/g, "");

if (!siteUrl) {
  throw new Error("Set CONVEX_SITE_URL or configure it in .env.local.");
}

const request = async (path, options = {}) => {
  const response = await fetch(`${siteUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`${options.method ?? "GET"} ${path} failed (${response.status}): ${JSON.stringify(payload)}`);
  }
  return payload;
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const health = await request("/health");
assert(health.ok === true, "Health check did not return ok=true.");

const applicants = await request("/applicants");
assert(Array.isArray(applicants) && applicants.length > 0, "No applicant profiles are available.");
const requestedApplicantId = process.argv[2];
const applicantId = requestedApplicantId ?? applicants[0].publicId;
assert(
  applicants.some((applicant) => applicant.publicId === applicantId),
  `Applicant ${applicantId} is not available.`,
);

const applicant = await request(`/applicants/${encodeURIComponent(applicantId)}`);
assert(applicant.publicId === applicantId, "Applicant lookup returned the wrong profile.");

const rankedResponse = await request(`/applicants/${encodeURIComponent(applicantId)}/job-matches`);
const rankedMatches = rankedResponse.matches;
assert(Array.isArray(rankedMatches) && rankedMatches.length > 0, "Applicant matching returned no jobs.");
assert(
  rankedMatches.every((match) =>
    typeof match.jobId === "string" &&
    typeof match.score === "number" &&
    match.score >= 0 &&
    match.score <= 100 &&
    Array.isArray(match.matchedSkills) &&
    Array.isArray(match.missingSkills),
  ),
  "Applicant matching returned an invalid match contract.",
);

const selectedJobId = rankedMatches[0].jobId;
const directMatches = await request("/match/applicant-to-jobs", {
  method: "POST",
  body: JSON.stringify({ applicantId, limit: 3 }),
});
assert(Array.isArray(directMatches) && directMatches.length > 0, "Direct applicant matching returned no jobs.");

const agent = await request(`/applicants/${encodeURIComponent(applicantId)}/ask-agent`, {
  method: "POST",
  body: JSON.stringify({
    query: "What should I emphasize when applying for this job?",
    selectedJobId,
  }),
});
assert(["live", "fallback"].includes(agent.mode), "Applicant agent returned an unknown mode.");
assert(typeof agent.answer === "string" && agent.answer.length > 0, "Applicant agent returned no answer.");
assert(typeof agent.sessionId === "string" && agent.sessionId.length > 0, "Applicant agent returned no session ID.");

console.log(JSON.stringify({
  status: "passed",
  applicantId,
  profileLoaded: true,
  rankedMatchCount: rankedMatches.length,
  directMatchCount: directMatches.length,
  selectedJobId,
  agentMode: agent.mode,
  sessionIdReturned: true,
}, null, 2));
