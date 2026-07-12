import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ConvexHttpClient } from "convex/browser";

export const demoRecruiters = [
  {
    publicId: "demo_recruiter_anika_sharma",
    name: "Anika Sharma",
    company: "Northstar Analytics",
    roleToHire: "Data Analyst",
    prioritySkills: ["SQL", "Excel", "Power BI", "Data Analysis"],
    niceToHave: ["Python", "Tableau"],
    story: "Growing analytics team building practical reporting and decision-support workflows.",
    location: "Mumbai, Maharashtra, India",
    workMode: "Hybrid",
    interviewFocus: ["SQL reasoning", "dashboard design", "stakeholder communication"],
    isExample: true,
    sourceKind: "synthetic-demo-recruiter",
  },
  {
    publicId: "demo_recruiter_james_bennett",
    name: "James Bennett",
    company: "Riverstone Systems",
    roleToHire: "Backend Engineer",
    prioritySkills: ["Python", "Node.js", "SQL", "Docker"],
    niceToHave: ["PostgreSQL", "AWS"],
    story: "Platform team building reliable APIs and data services for growing customers.",
    location: "Seattle, Washington, USA",
    workMode: "Hybrid",
    interviewFocus: ["API design", "data modeling", "production debugging"],
    isExample: true,
    sourceKind: "synthetic-demo-recruiter",
  },
  {
    publicId: "demo_recruiter_neha_kulkarni",
    name: "Neha Kulkarni",
    company: "Aster Materials Labs",
    roleToHire: "Process Engineer",
    prioritySkills: ["MATLAB", "Python", "Data Analysis", "Excel"],
    niceToHave: ["Process Optimization", "Materials Science"],
    story: "Engineering group improving process quality through experiments, analysis, and documentation.",
    location: "Bengaluru, Karnataka, India",
    workMode: "On-site",
    interviewFocus: ["experimental design", "process analysis", "technical communication"],
    isExample: true,
    sourceKind: "synthetic-demo-recruiter",
  },
  {
    publicId: "demo_recruiter_michael_alvarez",
    name: "Michael Alvarez",
    company: "Cedar Peak Consulting",
    roleToHire: "Business Analyst",
    prioritySkills: ["Excel", "SQL", "Tableau", "Data Analysis"],
    niceToHave: ["Power BI", "Stakeholder Management"],
    story: "Consulting practice translating business questions into measurable operational improvements.",
    location: "Chicago, Illinois, USA",
    workMode: "Hybrid",
    interviewFocus: ["problem framing", "data storytelling", "client communication"],
    isExample: true,
    sourceKind: "synthetic-demo-recruiter",
  },
  {
    publicId: "demo_recruiter_priyanka_rao",
    name: "Priyanka Rao",
    company: "Blueforge Cloud",
    roleToHire: "Software Engineer",
    prioritySkills: ["Java", "Python", "AWS", "Git"],
    niceToHave: ["Docker", "SQL"],
    story: "Cloud engineering team shipping secure developer tooling and scalable product services.",
    location: "Toronto, Ontario, Canada",
    workMode: "Remote",
    interviewFocus: ["software design", "testing", "cloud fundamentals"],
    isExample: true,
    sourceKind: "synthetic-demo-recruiter",
  },
  {
    publicId: "demo_recruiter_emma_collins",
    name: "Emma Collins",
    company: "Summit Operations",
    roleToHire: "Operations Analyst",
    prioritySkills: ["Data Analysis", "Excel", "Power BI"],
    niceToHave: ["SQL", "Process Improvement"],
    story: "Operations team using data to improve planning, customer outcomes, and internal workflows.",
    location: "New York, New York, USA",
    workMode: "Hybrid",
    interviewFocus: ["process mapping", "metric selection", "cross-functional communication"],
    isExample: true,
    sourceKind: "synthetic-demo-recruiter",
  },
];

const readConvexUrl = () => {
  const envPath = new URL("../.env.local", import.meta.url);
  const line = readFileSync(envPath, "utf8").split(/\r?\n/).find((entry) => entry.startsWith("CONVEX_URL="));
  return process.env.CONVEX_URL ?? line?.slice("CONVEX_URL=".length).replace(/^['"]|['"]$/g, "");
};

const run = async () => {
  const convexUrl = readConvexUrl();
  const importToken = process.env.IMPORT_ADMIN_TOKEN;
  if (!convexUrl) throw new Error("CONVEX_URL is required in .env.local or the process environment.");
  if (!importToken) throw new Error("IMPORT_ADMIN_TOKEN is required in the process environment.");
  const client = new ConvexHttpClient(convexUrl);
  const result = await client.mutation("recruiters:importDemoRecruiters", {
    importToken,
    recruiters: demoRecruiters,
  });
  console.log(JSON.stringify(result, null, 2));
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
