import type { DeveloperProfile } from "./types";

const avatar = (seed: string) =>
  `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(seed)}`;

const aiEngineer: DeveloperProfile = {
  username: "arjun-builds",
  name: "Arjun Mehta",
  bio: "Building production LLM systems. Previously backend at a fintech. I like FastAPI, evals, and boring infrastructure.",
  avatarUrl: avatar("arjun-builds"),
  primaryFocus: "AI Engineering",
  secondaryFocus: ["Backend Engineering", "LLM Applications", "Full Stack Development"],
  stats: { publicRepos: 48, stars: 1240, followers: 862, recentActivity: "Very active — 21 commits last week" },
  primaryLanguages: ["Python", "TypeScript", "SQL"],
  skills: [
    { name: "Python", category: "Programming", proficiency: "expert", confidence: 0.97, recent: true, evidence: ["Primary language in 31 repositories", "Used in 5 of 6 recent projects", "Consistent commit activity"] },
    { name: "TypeScript", category: "Programming", proficiency: "advanced", confidence: 0.88, recent: true, evidence: ["Used in 9 repositories", "Frontend for 3 production apps"] },
    { name: "C++", category: "Programming", proficiency: "intermediate", confidence: 0.61, recent: false, evidence: ["2 older competitive programming repos", "No activity in 2+ years"] },
    { name: "DSA", category: "Fundamentals", proficiency: "advanced", confidence: 0.84, recent: false, evidence: ["750+ solved problems referenced in README", "Interview prep repo with curated patterns"] },
    { name: "System Design", category: "Fundamentals", proficiency: "advanced", confidence: 0.82, recent: true, evidence: ["Architecture docs in 4 repos", "Queue-based async workers in production projects"] },
    { name: "LLM Applications", category: "AI / ML", proficiency: "expert", confidence: 0.96, recent: true, evidence: ["6 LLM-powered repositories", "Eval harness + prompt versioning in recent work", "Production deployment with tracing"] },
    { name: "RAG", category: "AI / ML", proficiency: "advanced", confidence: 0.91, recent: true, evidence: ["3 RAG systems with vector stores", "Hybrid search + reranking implemented", "Found in requirements.txt across repos"] },
    { name: "LangChain", category: "AI / ML", proficiency: "advanced", confidence: 0.86, recent: true, evidence: ["Used in 4 repositories", "Found in pyproject.toml", "Custom tool-calling agents"] },
    { name: "Machine Learning", category: "AI / ML", proficiency: "intermediate", confidence: 0.72, recent: false, evidence: ["Fine-tuning notebook repos", "scikit-learn in older projects"] },
    { name: "FastAPI", category: "Backend", proficiency: "expert", confidence: 0.95, recent: true, evidence: ["Used in 8 repositories", "Found in requirements.txt", "Async endpoints with background workers"] },
    { name: "PostgreSQL", category: "Backend", proficiency: "advanced", confidence: 0.89, recent: true, evidence: ["Primary DB in 7 projects", "docker-compose.yml with Postgres", "Migration scripts present"] },
    { name: "REST APIs", category: "Backend", proficiency: "advanced", confidence: 0.93, recent: true, evidence: ["API-first design in 10 repos", "OpenAPI schemas committed"] },
    { name: "Redis", category: "Backend", proficiency: "intermediate", confidence: 0.7, recent: true, evidence: ["Caching layer in 2 projects", "Task queue broker"] },
    { name: "Docker", category: "DevOps", proficiency: "advanced", confidence: 0.9, recent: true, evidence: ["Dockerfile in 8 repositories", "Multi-stage builds", "docker-compose for local dev"] },
    { name: "CI/CD", category: "DevOps", proficiency: "advanced", confidence: 0.85, recent: true, evidence: ["GitHub Actions in 7 repos", "Automated tests + deploy on merge"] },
    { name: "Testing", category: "DevOps", proficiency: "advanced", confidence: 0.83, recent: true, evidence: ["pytest suites in 6 repos", "Coverage badges in READMEs"] },
    { name: "AWS", category: "DevOps", proficiency: "intermediate", confidence: 0.66, recent: true, evidence: ["Deployment config referencing ECS", "S3 usage in 2 projects"] },
    { name: "React", category: "Frontend", proficiency: "advanced", confidence: 0.87, recent: true, evidence: ["4 frontend repositories", "package.json with React 19", "Component-driven dashboards"] },
    { name: "Next.js", category: "Frontend", proficiency: "intermediate", confidence: 0.74, recent: false, evidence: ["2 Next.js projects", "SSR marketing pages"] },
  ],
  topProjects: [
    { name: "llm-support-agent", description: "Production customer-support agent that resolves tickets using RAG over company docs, with human handoff and full tracing.", techStack: ["Python", "FastAPI", "LangChain", "PostgreSQL", "Redis", "Docker"], complexity: "Advanced", signals: ["Docker", "Tests", "CI/CD", "Database", "Auth", "Deployment", "Background Workers"], stars: 412, lastActive: "3 days ago", score: 96 },
    { name: "rag-eval-harness", description: "Evaluation framework for RAG pipelines — measures retrieval quality, faithfulness, and latency across prompt versions.", techStack: ["Python", "FastAPI", "PostgreSQL", "Docker"], complexity: "Advanced", signals: ["Docker", "Tests", "CI/CD", "Database"], stars: 238, lastActive: "1 week ago", score: 91 },
    { name: "code-review-copilot", description: "GitHub bot that reviews pull requests with an LLM, grounded in the repo's own style guide and past review comments.", techStack: ["Python", "FastAPI", "React", "Docker", "AWS"], complexity: "Advanced", signals: ["Docker", "Tests", "CI/CD", "Auth", "Deployment"], stars: 187, lastActive: "2 weeks ago", score: 88 },
    { name: "vector-notes", description: "Semantic note-taking app — embeds notes and retrieves them with hybrid search. Full-stack side project.", techStack: ["TypeScript", "React", "Python", "FastAPI", "PostgreSQL"], complexity: "Intermediate", signals: ["Database", "Auth", "Deployment"], stars: 94, lastActive: "1 month ago", score: 79 },
    { name: "fastapi-starter", description: "Opinionated FastAPI production template with auth, migrations, Docker, and CI baked in.", techStack: ["Python", "FastAPI", "PostgreSQL", "Docker"], complexity: "Intermediate", signals: ["Docker", "Tests", "CI/CD", "Database", "Auth"], stars: 156, lastActive: "2 months ago", score: 77 },
  ],
  currentDirection: "Recently focusing more on production AI applications — evals, tracing, and agent reliability — on top of a strong backend engineering base.",
  currentFocus: ["LLM Applications", "RAG", "Evals", "FastAPI", "PostgreSQL", "Docker", "React"],
  historicalSkills: ["C++", "Competitive Programming", "scikit-learn", "Flask", "jQuery"],
};

const backendEngineer: DeveloperProfile = {
  username: "sofia-backend",
  name: "Sofia Reyes",
  bio: "Backend engineer. Distributed systems, Postgres internals, and Go services at scale.",
  avatarUrl: avatar("sofia-backend"),
  primaryFocus: "Backend Engineering",
  secondaryFocus: ["Distributed Systems", "Infrastructure", "Databases"],
  stats: { publicRepos: 62, stars: 980, followers: 1204, recentActivity: "Active — 12 commits last week" },
  primaryLanguages: ["Go", "Python", "SQL"],
  skills: [
    { name: "Go", category: "Programming", proficiency: "expert", confidence: 0.96, recent: true, evidence: ["Primary language in 24 repositories", "go.mod in all recent projects"] },
    { name: "Python", category: "Programming", proficiency: "advanced", confidence: 0.85, recent: true, evidence: ["Used in 11 repositories", "Scripting and services"] },
    { name: "DSA", category: "Fundamentals", proficiency: "advanced", confidence: 0.8, recent: false, evidence: ["Algorithm study repos", "Interview prep notes"] },
    { name: "System Design", category: "Fundamentals", proficiency: "expert", confidence: 0.94, recent: true, evidence: ["Sharding + replication designs in 3 repos", "Detailed architecture RFCs in READMEs"] },
    { name: "PostgreSQL", category: "Backend", proficiency: "expert", confidence: 0.95, recent: true, evidence: ["Primary DB in 14 projects", "Query optimization write-ups", "Extension development"] },
    { name: "REST APIs", category: "Backend", proficiency: "expert", confidence: 0.94, recent: true, evidence: ["API design in 16 repos", "Versioned endpoints"] },
    { name: "gRPC", category: "Backend", proficiency: "advanced", confidence: 0.86, recent: true, evidence: ["Protobuf schemas in 5 repos", "Service-to-service communication"] },
    { name: "Kafka", category: "Backend", proficiency: "advanced", confidence: 0.84, recent: true, evidence: ["Event-driven services in 4 repos", "docker-compose with Kafka"] },
    { name: "Redis", category: "Backend", proficiency: "advanced", confidence: 0.82, recent: true, evidence: ["Caching in 6 projects", "Rate limiting implementations"] },
    { name: "Docker", category: "DevOps", proficiency: "expert", confidence: 0.93, recent: true, evidence: ["Dockerfile in 15 repositories", "Multi-stage builds"] },
    { name: "Kubernetes", category: "DevOps", proficiency: "advanced", confidence: 0.88, recent: true, evidence: ["Helm charts in 4 repos", "K8s manifests for 6 services"] },
    { name: "CI/CD", category: "DevOps", proficiency: "advanced", confidence: 0.9, recent: true, evidence: ["GitHub Actions in 12 repos", "Automated deploy pipelines"] },
    { name: "Testing", category: "DevOps", proficiency: "advanced", confidence: 0.87, recent: true, evidence: ["Integration test suites", "Load testing with k6"] },
    { name: "AWS", category: "DevOps", proficiency: "advanced", confidence: 0.85, recent: true, evidence: ["Terraform configs", "ECS + RDS deployments"] },
    { name: "Machine Learning", category: "AI / ML", proficiency: "beginner", confidence: 0.4, recent: false, evidence: ["One tutorial-following notebook"] },
  ],
  topProjects: [
    { name: "distributed-kv-store", description: "A Raft-based distributed key-value store with leader election, log replication, and snapshotting — built to learn consensus deeply.", techStack: ["Go", "gRPC", "Docker", "Kubernetes"], complexity: "Advanced", signals: ["Docker", "Tests", "CI/CD", "Deployment"], stars: 356, lastActive: "5 days ago", score: 94 },
    { name: "pg-query-insights", description: "CLI that analyzes Postgres slow query logs and suggests indexes, with before/after benchmarks.", techStack: ["Go", "PostgreSQL", "Docker"], complexity: "Advanced", signals: ["Docker", "Tests", "Database"], stars: 221, lastActive: "1 week ago", score: 90 },
    { name: "event-pipeline", description: "Event-driven order processing system using Kafka, with exactly-once semantics and dead-letter queues.", techStack: ["Go", "Kafka", "PostgreSQL", "Redis", "Docker"], complexity: "Advanced", signals: ["Docker", "Tests", "CI/CD", "Database", "Background Workers"], stars: 148, lastActive: "2 weeks ago", score: 87 },
    { name: "rate-limiter", description: "Pluggable rate-limiting middleware (token bucket, sliding window) with a Redis backend.", techStack: ["Go", "Redis", "Docker"], complexity: "Intermediate", signals: ["Docker", "Tests"], stars: 97, lastActive: "1 month ago", score: 74 },
  ],
  currentDirection: "Deep in distributed systems and database internals — consensus protocols, query optimization, and event-driven architectures.",
  currentFocus: ["Go", "PostgreSQL", "Kafka", "Kubernetes", "System Design", "gRPC"],
  historicalSkills: ["PHP", "MySQL", "jQuery", "Monolith MVC"],
};

const fullstackEngineer: DeveloperProfile = {
  username: "lena-ships",
  name: "Lena Kowalski",
  bio: "Product engineer. I ship full-stack apps fast and care about DX, design systems, and edge deployment.",
  avatarUrl: avatar("lena-ships"),
  primaryFocus: "Full Stack Development",
  secondaryFocus: ["Frontend Engineering", "Product Engineering", "Edge Infrastructure"],
  stats: { publicRepos: 71, stars: 1530, followers: 2100, recentActivity: "Very active — 30 commits last week" },
  primaryLanguages: ["TypeScript", "Rust", "CSS"],
  skills: [
    { name: "TypeScript", category: "Programming", proficiency: "expert", confidence: 0.97, recent: true, evidence: ["Primary language in 40 repositories", "Strict mode everywhere"] },
    { name: "Rust", category: "Programming", proficiency: "intermediate", confidence: 0.68, recent: true, evidence: ["3 CLI tools in Rust", "WASM experiments"] },
    { name: "DSA", category: "Fundamentals", proficiency: "intermediate", confidence: 0.62, recent: false, evidence: ["Standard interview prep repo"] },
    { name: "System Design", category: "Fundamentals", proficiency: "intermediate", confidence: 0.66, recent: true, evidence: ["Architecture notes in app READMEs"] },
    { name: "React", category: "Frontend", proficiency: "expert", confidence: 0.96, recent: true, evidence: ["Used in 30 repositories", "Design system maintainer", "Server components in production"] },
    { name: "Next.js", category: "Frontend", proficiency: "expert", confidence: 0.94, recent: true, evidence: ["12 Next.js apps", "Edge runtime deployments"] },
    { name: "CSS / Tailwind", category: "Frontend", proficiency: "expert", confidence: 0.93, recent: true, evidence: ["Published design system", "Tailwind in 20 repos"] },
    { name: "Node.js", category: "Backend", proficiency: "advanced", confidence: 0.9, recent: true, evidence: ["API routes and BFFs in 15 repos", "package.json across projects"] },
    { name: "PostgreSQL", category: "Backend", proficiency: "advanced", confidence: 0.84, recent: true, evidence: ["Drizzle + Prisma schemas", "Supabase projects"] },
    { name: "GraphQL", category: "Backend", proficiency: "intermediate", confidence: 0.7, recent: false, evidence: ["2 GraphQL APIs"] },
    { name: "Docker", category: "DevOps", proficiency: "intermediate", confidence: 0.72, recent: true, evidence: ["Dockerfile in 5 repos", "docker-compose for local dev"] },
    { name: "CI/CD", category: "DevOps", proficiency: "advanced", confidence: 0.86, recent: true, evidence: ["Preview deployments on every PR", "E2E tests in CI"] },
    { name: "Testing", category: "DevOps", proficiency: "advanced", confidence: 0.85, recent: true, evidence: ["Vitest + Playwright suites in 10 repos"] },
  ],
  topProjects: [
    { name: "component-foundry", description: "A published React design system with 40+ accessible components, theming, docs site, and visual regression tests.", techStack: ["TypeScript", "React", "Tailwind", "Storybook"], complexity: "Advanced", signals: ["Tests", "CI/CD", "Deployment"], stars: 612, lastActive: "2 days ago", score: 95 },
    { name: "shipit-pm", description: "Full-stack project management app with realtime collaboration, offline support, and edge deployment.", techStack: ["TypeScript", "Next.js", "PostgreSQL", "Tailwind"], complexity: "Advanced", signals: ["Tests", "CI/CD", "Database", "Auth", "Deployment"], stars: 389, lastActive: "4 days ago", score: 92 },
    { name: "edge-analytics", description: "Lightweight privacy-first analytics platform running entirely on the edge.", techStack: ["TypeScript", "Rust", "Next.js", "PostgreSQL"], complexity: "Advanced", signals: ["Tests", "CI/CD", "Database", "Deployment"], stars: 203, lastActive: "1 week ago", score: 86 },
    { name: "markdown-garden", description: "Local-first markdown notes app with sync, built as a PWA.", techStack: ["TypeScript", "React", "Tailwind"], complexity: "Intermediate", signals: ["Tests", "Deployment"], stars: 88, lastActive: "3 weeks ago", score: 72 },
  ],
  currentDirection: "Shipping polished full-stack products with a focus on edge runtime, realtime UX, and design systems.",
  currentFocus: ["React", "Next.js", "TypeScript", "Tailwind", "Edge", "PostgreSQL"],
  historicalSkills: ["Angular", "Vue", "jQuery", "WordPress"],
};

const youProfile: DeveloperProfile = {
  username: "you",
  name: "You",
  bio: "Student developer learning AI and backend engineering.",
  avatarUrl: avatar("you-default"),
  primaryFocus: "AI Engineering (learning)",
  secondaryFocus: ["Backend Development"],
  stats: { publicRepos: 14, stars: 12, followers: 23, recentActivity: "Moderately active — 4 commits last week" },
  primaryLanguages: ["Python", "JavaScript"],
  skills: [
    { name: "Python", category: "Programming", proficiency: "intermediate", confidence: 0.78, recent: true, evidence: ["Primary language in 9 repositories", "Coursework + personal projects"] },
    { name: "JavaScript", category: "Programming", proficiency: "intermediate", confidence: 0.66, recent: true, evidence: ["Used in 4 repositories"] },
    { name: "DSA", category: "Fundamentals", proficiency: "beginner", confidence: 0.58, recent: true, evidence: ["Started a LeetCode tracker repo", "Arrays and hashing sections only"] },
    { name: "System Design", category: "Fundamentals", proficiency: "beginner", confidence: 0.35, recent: false, evidence: ["No architecture docs found in repos"] },
    { name: "LLM Applications", category: "AI / ML", proficiency: "intermediate", confidence: 0.7, recent: true, evidence: ["2 chatbot projects using LLM APIs", "Prompt templates in code"] },
    { name: "RAG", category: "AI / ML", proficiency: "intermediate", confidence: 0.68, recent: true, evidence: ["1 RAG project with a vector DB", "Follows a tutorial structure"] },
    { name: "LangChain", category: "AI / ML", proficiency: "beginner", confidence: 0.6, recent: true, evidence: ["Found in requirements.txt of 1 repo"] },
    { name: "Machine Learning", category: "AI / ML", proficiency: "beginner", confidence: 0.52, recent: false, evidence: ["2 Kaggle-style notebooks"] },
    { name: "FastAPI", category: "Backend", proficiency: "intermediate", confidence: 0.72, recent: true, evidence: ["Used in 3 repositories", "Basic CRUD endpoints"] },
    { name: "PostgreSQL", category: "Backend", proficiency: "intermediate", confidence: 0.62, recent: true, evidence: ["Used in 2 projects", "Basic schema, no migrations"] },
    { name: "REST APIs", category: "Backend", proficiency: "intermediate", confidence: 0.7, recent: true, evidence: ["CRUD APIs in 3 repos"] },
    { name: "Docker", category: "DevOps", proficiency: "beginner", confidence: 0.45, recent: false, evidence: ["One copied Dockerfile, not maintained"] },
    { name: "Testing", category: "DevOps", proficiency: "beginner", confidence: 0.3, recent: false, evidence: ["No test files found in public repos"] },
    { name: "CI/CD", category: "DevOps", proficiency: "beginner", confidence: 0.25, recent: false, evidence: ["No CI configuration found"] },
    { name: "React", category: "Frontend", proficiency: "intermediate", confidence: 0.68, recent: true, evidence: ["3 React projects", "Tutorial-level component structure"] },
  ],
  topProjects: [
    { name: "ai-study-buddy", description: "RAG chatbot that answers questions over uploaded lecture PDFs. Works end-to-end but runs only locally.", techStack: ["Python", "FastAPI", "LangChain"], complexity: "Intermediate", signals: ["Database"], stars: 5, lastActive: "1 week ago", score: 68 },
    { name: "leetcode-tracker", description: "Personal DSA practice tracker with solutions in Python — arrays and hashing sections so far.", techStack: ["Python"], complexity: "Beginner", signals: [], stars: 1, lastActive: "3 days ago", score: 52 },
    { name: "task-api", description: "Simple CRUD REST API for a todo app, built while learning FastAPI.", techStack: ["Python", "FastAPI", "PostgreSQL"], complexity: "Beginner", signals: ["Database"], stars: 2, lastActive: "1 month ago", score: 48 },
    { name: "portfolio-site", description: "Personal portfolio built with React.", techStack: ["JavaScript", "React"], complexity: "Beginner", signals: ["Deployment"], stars: 3, lastActive: "2 months ago", score: 44 },
  ],
  currentDirection: "Learning AI application development — LLM APIs and basic RAG — while starting DSA practice.",
  currentFocus: ["Python", "LLM Applications", "RAG", "FastAPI", "React"],
  historicalSkills: ["HTML/CSS", "Tkinter"],
};

const PROFILES: DeveloperProfile[] = [aiEngineer, backendEngineer, fullstackEngineer];

const RESERVED: Record<string, DeveloperProfile> = {
  you: youProfile,
  me: youProfile,
};

function hashUsername(username: string): number {
  let h = 0;
  for (let i = 0; i < username.length; i++) {
    h = (h * 31 + username.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Return a curated demo profile, or null when the username should hit the live GitHub API. */
export function getDemoDeveloper(username: string): DeveloperProfile | null {
  const clean = username.trim().toLowerCase().replace(/^https?:\/\/github\.com\//, "").replace(/\/+$/, "");
  if (RESERVED[clean]) return RESERVED[clean];
  return PROFILES.find((p) => p.username === clean) ?? null;
}

/** Resolve any GitHub username to a deterministic mock profile (offline fallback / demos). */
export function getDeveloper(username: string): DeveloperProfile {
  const clean = username.trim().toLowerCase().replace(/^https?:\/\/github\.com\//, "").replace(/\/+$/, "");
  const demo = getDemoDeveloper(clean);
  if (demo) return demo;
  const base = PROFILES[hashUsername(clean) % PROFILES.length] ?? aiEngineer;
  // Present the requested username while keeping the deterministic mock profile.
  return { ...base, username: clean, avatarUrl: avatar(clean) };
}

export const DEFAULT_TARGET = aiEngineer;
export const DEFAULT_USER = youProfile;
