const SKILL_ALIASES: Record<string, string[]> = {
  Python: ["python"],
  TypeScript: ["typescript", "ts"],
  JavaScript: ["javascript", "node.js", "nodejs"],
  React: ["react"],
  "Next.js": ["next.js", "nextjs"],
  FastAPI: ["fastapi"],
  Django: ["django"],
  SQL: ["sql", "postgres", "postgresql", "mysql"],
  Docker: ["docker", "containers"],
  Kubernetes: ["kubernetes", "k8s"],
  AWS: ["aws", "amazon web services"],
  Azure: ["azure"],
  GCP: ["gcp", "google cloud"],
  Terraform: ["terraform"],
  Airflow: ["airflow"],
  dbt: ["dbt"],
  Spark: ["spark", "pyspark"],
  RAG: ["rag", "retrieval augmented", "retrieval-augmented"],
  LLMs: ["llm", "llms", "large language model"],
  LangChain: ["langchain"],
  "Machine Learning": ["machine learning", "ml model"],
  Evaluation: ["evaluation", "evals", "benchmark"],
  Java: ["java", "spring boot"],
  Go: ["golang", " go "],
  "C#": ["c#", ".net"],
  Git: ["git", "github"],
  "System Design": ["system design", "distributed system"],
};

const unique = (values: string[]) => Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

export const extractSkills = (resumeText: string, suppliedSkills: string[] = []) => {
  const text = ` ${resumeText.toLowerCase()} `;
  const extracted = Object.entries(SKILL_ALIASES)
    .filter(([, aliases]) => aliases.some((alias) => text.includes(alias)))
    .map(([skill]) => skill);
  return unique([...suppliedSkills, ...extracted]);
};

export const extractEvidence = (resumeText: string) => {
  const sentences = resumeText
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 30);
  const evidence = sentences.filter((sentence) => /\b(built|shipped|designed|led|implemented|deployed|owned|improved|created)\b/i.test(sentence));
  return unique((evidence.length ? evidence : sentences).slice(0, 4));
};

export const inferTargetRoles = (resumeText: string, suppliedRoles: string[] = []) => {
  if (suppliedRoles.length) return unique(suppliedRoles);
  const text = resumeText.toLowerCase();
  const roles = [
    ["AI Engineer", ["rag", "llm", "machine learning", "langchain"]],
    ["Data Engineer", ["airflow", "dbt", "warehouse", "etl", "spark"]],
    ["Platform Engineer", ["kubernetes", "terraform", "platform", "sre"]],
    ["Backend Engineer", ["api", "fastapi", "django", "spring", "postgres"]],
    ["Frontend Engineer", ["react", "next.js", "frontend", "user interface"]],
  ] as const;
  const inferred = roles.filter(([, clues]) => clues.some((clue) => text.includes(clue))).map(([role]) => role);
  return inferred.length ? inferred : ["Software Engineer"];
};

export const profileStory = (roles: string[], skills: string[], evidence: string[]) => {
  const role = roles[0] ?? "software";
  const strengths = skills.slice(0, 4).join(", ") || "practical delivery";
  const proof = evidence[0] ? ` Evidence includes: ${evidence[0]}` : "";
  return `Resume-backed ${role} profile with strengths in ${strengths}.${proof}`;
};
