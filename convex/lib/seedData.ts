export const jobs = [
  {
    publicId: "job_101",
    company: "Vertex Labs",
    title: "Backend Engineer",
    location: "Bengaluru",
    workMode: "Hybrid",
    skills: ["Python", "FastAPI", "Docker", "AWS", "PostgreSQL"],
    experienceLevel: "Entry Level",
    minYearsExperience: 1,
    description:
      "Build backend APIs for a workflow product, ship reliable integrations, and support deployment to AWS.",
    applyUrl: "https://example.com/jobs/job_101",
    highlights: [
      "Own backend APIs end to end",
      "Work closely with product and design",
      "Deploy production services on AWS",
    ],
  },
  {
    publicId: "job_102",
    company: "NovaAI",
    title: "AI Engineer",
    location: "Bengaluru",
    workMode: "Remote-friendly",
    skills: ["Python", "RAG", "LLMs", "FastAPI", "Docker"],
    experienceLevel: "Mid Level",
    minYearsExperience: 2,
    description:
      "Ship a retrieval-based assistant, own evaluation loops, and productionize model-backed APIs.",
    applyUrl: "https://example.com/jobs/job_102",
    highlights: [
      "Build a RAG product prototype in six weeks",
      "Own LLM evaluation and iteration",
      "Work across backend and AI workflows",
    ],
  },
  {
    publicId: "job_103",
    company: "Orbit Systems",
    title: "Platform Engineer",
    location: "Remote",
    workMode: "Remote",
    skills: ["Python", "Docker", "Kubernetes", "Terraform", "AWS"],
    experienceLevel: "Mid Level",
    minYearsExperience: 3,
    description:
      "Improve deployment reliability, own cloud infrastructure, and support platform tooling for product teams.",
    applyUrl: "https://example.com/jobs/job_103",
    highlights: [
      "Own platform reliability",
      "Write infrastructure as code",
      "Support multi-service deployments",
    ],
  },
  {
    publicId: "job_104",
    company: "Signal Stack",
    title: "Data Engineer",
    location: "Hyderabad",
    workMode: "Hybrid",
    skills: ["Python", "SQL", "Airflow", "PostgreSQL", "dbt"],
    experienceLevel: "Mid Level",
    minYearsExperience: 2,
    description:
      "Build pipelines, maintain warehouse models, and work with analytics engineers on trusted datasets.",
    applyUrl: "https://example.com/jobs/job_104",
    highlights: [
      "Build warehouse-backed data products",
      "Own ETL reliability",
      "Collaborate with analytics and engineering",
    ],
  },
];

export const applicants = [
  {
    publicId: "candidate_07",
    name: "Aarav Sharma",
    targetRoles: ["AI Engineer", "Backend Engineer"],
    skills: ["Python", "LangChain", "FastAPI", "Docker", "LLMs", "RAG"],
    resumeText:
      "Built retrieval-backed copilots, shipped FastAPI services, and deployed Dockerized backend projects.",
    location: "Bengaluru",
    remote: true,
    experienceYears: 2,
    education: "B.Tech in Computer Science",
    availability: "Available now",
    projects: [
      "Built a retrieval-based support copilot with FastAPI and vector search.",
      "Deployed a Dockerized API for a student placement platform.",
    ],
    evidenceLines: [
      "Built retrieval-backed support copilot with FastAPI and vector search.",
      "Shipped backend services in Python with Docker-based deployment.",
    ],
    profileStory:
      "Product-minded builder who can move between backend systems and applied AI prototypes.",
  },
  {
    publicId: "candidate_03",
    name: "Meera Iyer",
    targetRoles: ["Machine Learning Engineer", "AI Engineer"],
    skills: ["Python", "LLMs", "Evaluation", "Pandas", "Prompting"],
    resumeText:
      "Focused on LLM evaluation workflows, benchmarking, and experimentation for internal AI tools.",
    location: "Remote",
    remote: true,
    experienceYears: 3,
    education: "B.E. in Information Science",
    availability: "30-day notice",
    projects: [
      "Designed LLM evaluation workflows and an internal prompt-testing tool.",
      "Built analysis notebooks to compare model quality across tasks.",
    ],
    evidenceLines: [
      "Designed LLM evaluation workflows and prompt-testing tools.",
      "Strong benchmark and experimentation background.",
    ],
    profileStory:
      "Strong on evaluation and AI quality, lighter on production API ownership.",
  },
  {
    publicId: "candidate_11",
    name: "Kabir Nair",
    targetRoles: ["Backend Engineer", "Platform Engineer"],
    skills: ["Python", "FastAPI", "AWS", "Docker", "PostgreSQL"],
    resumeText:
      "Built event-driven APIs, owned AWS deployments, and maintained backend data models in PostgreSQL.",
    location: "Bengaluru",
    remote: false,
    experienceYears: 4,
    education: "B.Tech in Electronics and Communication",
    availability: "Available now",
    projects: [
      "Shipped event-driven APIs for a payments workflow on AWS.",
      "Maintained PostgreSQL-backed services with production observability.",
    ],
    evidenceLines: [
      "Shipped AWS-backed FastAPI services.",
      "Has strong production database and cloud evidence.",
    ],
    profileStory:
      "Backend and infrastructure engineer with stronger deployment depth than AI specialization.",
  },
];

export const recruiters = [
  {
    publicId: "recruiter_03",
    company: "NovaAI",
    roleToHire: "AI Engineer",
    prioritySkills: ["Python", "RAG", "LLMs", "FastAPI"],
    niceToHave: ["AWS", "Docker"],
    story:
      "Need an AI engineer who can ship a retrieval-based product prototype in six weeks.",
    location: "Bengaluru",
    workMode: "Remote-friendly",
    interviewFocus: [
      "Productionizing retrieval systems",
      "FastAPI architecture",
      "Evaluation and iteration",
    ],
  },
  {
    publicId: "recruiter_04",
    company: "Vertex Labs",
    roleToHire: "Backend Engineer",
    prioritySkills: ["Python", "FastAPI", "AWS", "PostgreSQL"],
    niceToHave: ["Docker", "System Design"],
    story:
      "Need a backend engineer who can own APIs, data access, and cloud deployment for a small product team.",
    location: "Bengaluru",
    workMode: "Hybrid",
    interviewFocus: [
      "API design",
      "Database tradeoffs",
      "Cloud deployment ownership",
    ],
  },
  {
    publicId: "recruiter_05",
    company: "Orbit Systems",
    roleToHire: "Platform Engineer",
    prioritySkills: ["AWS", "Docker", "Kubernetes", "Terraform"],
    niceToHave: ["Python", "Observability"],
    story:
      "Need someone who can improve platform reliability and support fast-moving engineering teams.",
    location: "Remote",
    workMode: "Remote",
    interviewFocus: [
      "Infrastructure as code",
      "Platform reliability",
      "Production debugging",
    ],
  },
];
