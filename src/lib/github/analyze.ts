import type { DeveloperProfile, Project, Proficiency, Skill } from "@/lib/mock/types";
import { fetchLanguages, fetchRepos, fetchRootEntries, fetchUser, type GhRepo, type GitHubAccess } from "./api";

/**
 * Evidence-based heuristic pipeline: GitHub profile + repos + languages + root
 * files -> DeveloperProfile. Every skill carries the evidence that produced it.
 */

const DAY = 86_400_000;
const RECENT_WINDOW = 180 * DAY;

function daysAgo(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / DAY;
}

export function relativeTime(iso: string): string {
  const d = Math.floor(daysAgo(iso));
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 7) return `${d} days ago`;
  if (d < 30) return `${Math.floor(d / 7)} week${Math.floor(d / 7) > 1 ? "s" : ""} ago`;
  if (d < 365) return `${Math.floor(d / 30)} month${Math.floor(d / 30) > 1 ? "s" : ""} ago`;
  return `${Math.floor(d / 365)} year${Math.floor(d / 365) > 1 ? "s" : ""} ago`;
}

/** Framework / technology keyword signals matched against name + description + topics. */
const TECH_SIGNALS: { skill: string; category: string; keywords: string[] }[] = [
  { skill: "FastAPI", category: "Backend", keywords: ["fastapi"] },
  { skill: "Flask", category: "Backend", keywords: ["flask"] },
  { skill: "Django", category: "Backend", keywords: ["django"] },
  { skill: "Node.js", category: "Backend", keywords: ["nodejs", "node-js", "express", "expressjs", "hono"] },
  { skill: "REST APIs", category: "Backend", keywords: ["rest-api", "restful", "rest api", "api-server", "openapi", "swagger"] },
  { skill: "GraphQL", category: "Backend", keywords: ["graphql", "apollo"] },
  { skill: "gRPC", category: "Backend", keywords: ["grpc", "protobuf"] },
  { skill: "PostgreSQL", category: "Backend", keywords: ["postgres", "postgresql", "supabase", "prisma", "drizzle"] },
  { skill: "MySQL", category: "Backend", keywords: ["mysql", "mariadb"] },
  { skill: "MongoDB", category: "Backend", keywords: ["mongodb", "mongoose", "mongo"] },
  { skill: "Redis", category: "Backend", keywords: ["redis", "cache", "caching"] },
  { skill: "Kafka", category: "Backend", keywords: ["kafka", "event-driven", "message-queue"] },
  { skill: "React", category: "Frontend", keywords: ["react", "reactjs", "react-app", "nextjs", "next.js", "next-js"] },
  { skill: "Next.js", category: "Frontend", keywords: ["nextjs", "next.js", "next-js"] },
  { skill: "Vue", category: "Frontend", keywords: ["vue", "vuejs", "nuxt"] },
  { skill: "CSS / Tailwind", category: "Frontend", keywords: ["tailwind", "tailwindcss", "css", "sass", "design-system", "ui-components"] },
  { skill: "LLM Applications", category: "AI / ML", keywords: ["llm", "gpt", "openai", "claude", "chatbot", "agent", "agents", "prompt"] },
  { skill: "RAG", category: "AI / ML", keywords: ["rag", "retrieval", "vector", "embeddings", "embedding", "semantic-search", "chromadb", "pinecone", "qdrant", "pgvector"] },
  { skill: "LangChain", category: "AI / ML", keywords: ["langchain", "llamaindex", "llama-index", "crewai", "autogen"] },
  { skill: "Machine Learning", category: "AI / ML", keywords: ["machine-learning", "ml", "sklearn", "scikit", "pytorch", "tensorflow", "keras", "transformers", "huggingface", "fine-tuning", "finetune", "notebook", "kaggle", "jupyter"] },
  { skill: "Data Engineering", category: "AI / ML", keywords: ["etl", "airflow", "spark", "dbt", "data-pipeline", "pandas"] },
  { skill: "Kubernetes", category: "DevOps", keywords: ["kubernetes", "k8s", "helm"] },
  { skill: "AWS / Cloud", category: "DevOps", keywords: ["aws", "lambda", "s3", "ec2", "ecs", "cloudformation", "terraform", "gcp", "azure", "cloudflare"] },
  { skill: "System Design", category: "Fundamentals", keywords: ["distributed", "microservices", "architecture", "system-design", "scalable", "scalability", "high-performance"] },
  { skill: "DSA", category: "Fundamentals", keywords: ["leetcode", "codeforces", "algorithms", "algorithm", "data-structures", "competitive-programming", "dsa", "interview"] },
  { skill: "Web3", category: "Web3", keywords: ["web3", "solidity", "ethereum", "smart-contract", "blockchain", "solana", "hardhat", "foundry"] },
  { skill: "Mobile", category: "Frontend", keywords: ["android", "ios", "flutter", "react-native", "swift", "kotlin-multiplatform"] },
];

const LANGUAGE_CATEGORY: Record<string, string> = {};

function bucket(lang: string): string {
  return LANGUAGE_CATEGORY[lang] ?? "Programming";
}

interface RepoScan {
  repo: GhRepo;
  languages: Record<string, number>;
  root: string[];
}

function detectSignals(root: string[]): string[] {
  const has = (...names: string[]) => root.some((r) => names.includes(r));
  const signals: string[] = [];
  if (has("dockerfile", "docker-compose.yml", "docker-compose.yaml", "compose.yml", "compose.yaml")) signals.push("Docker");
  if (has("tests", "test", "__tests__", "spec", "e2e", "pytest.ini")) signals.push("Tests");
  if (has(".github", ".gitlab-ci.yml", ".circleci", "jenkinsfile")) signals.push("CI/CD");
  if (has("schema.prisma", "migrations", "alembic", "docker-compose.yml", "docker-compose.yaml")) signals.push("Database");
  if (has("vercel.json", "netlify.toml", "fly.toml", "render.yaml", "dockerfile", "railway.json", ".github")) signals.push("Deployment");
  if (has("workers", "celery.py", "tasks.py", "queue")) signals.push("Background Workers");
  return [...new Set(signals)];
}

function proficiencyFrom(count: number, recent: boolean): Proficiency {
  let level: Proficiency = count >= 6 ? "expert" : count >= 3 ? "advanced" : count >= 2 ? "intermediate" : "beginner";
  if (!recent && level !== "beginner") {
    level = level === "expert" ? "advanced" : level === "advanced" ? "intermediate" : "beginner";
  }
  return level;
}

function confidenceFrom(count: number, recent: boolean): number {
  return Math.min(0.96, Math.round((0.42 + count * 0.08 + (recent ? 0.14 : 0)) * 100) / 100);
}

export async function analyzeGitHubUser(
  username: string,
  access?: GitHubAccess,
): Promise<DeveloperProfile> {
  const user = await fetchUser(username, access);
  const allRepos = (await fetchRepos(username, access)).filter((r) => !r.fork);

  // Rank candidate repos by meaningfulness signals available without extra calls.
  const candidates = allRepos
    .map((repo) => ({
      repo,
      preScore:
        Math.min(repo.size, 5000) / 500 +
        Math.min(repo.stargazers_count, 100) * 0.2 +
        (repo.description ? 3 : 0) +
        repo.topics.length * 0.5 +
        Math.max(0, 10 - daysAgo(repo.pushed_at) / 30),
    }))
    .sort((a, b) => b.preScore - a.preScore)
    .slice(0, 6);

  // Deep-scan those repos: languages + root file listing.
  const scans: RepoScan[] = await Promise.all(
    candidates.map(async ({ repo }) => {
      const [languages, root] = await Promise.all([
        fetchLanguages(repo.full_name, access).catch(() => ({}) as Record<string, number>),
        fetchRootEntries(repo.full_name, access).catch(() => [] as string[]),
      ]);
      return { repo, languages, root };
    }),
  );

  // ---- aggregate language evidence ----
  const langBytes = new Map<string, number>();
  const langRepos = new Map<string, number>();
  for (const scan of scans) {
    for (const [lang, bytes] of Object.entries(scan.languages)) {
      langBytes.set(lang, (langBytes.get(lang) ?? 0) + bytes);
    }
  }
  for (const repo of allRepos) {
    if (repo.language) langRepos.set(repo.language, (langRepos.get(repo.language) ?? 0) + 1);
  }

  const recentRepos = allRepos.filter((r) => daysAgo(r.pushed_at) <= 180);
  const recentLangs = new Set(recentRepos.map((r) => r.language).filter(Boolean) as string[]);

  const skills: Skill[] = [];
  const totalBytes = [...langBytes.values()].reduce((a, b) => a + b, 0);

  for (const [lang, count] of [...langRepos.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)) {
    const share = totalBytes ? (langBytes.get(lang) ?? 0) / totalBytes : 0;
    const recent = recentLangs.has(lang);
    const evidence = [`Primary language in ${count} repositor${count > 1 ? "ies" : "y"}`];
    if (share > 0.4) evidence.push(`${Math.round(share * 100)}% of scanned code volume`);
    evidence.push(recent ? "Active in recent repositories" : "No recent activity — weighted lower");
    skills.push({
      name: lang,
      category: bucket(lang),
      proficiency: proficiencyFrom(count, recent),
      confidence: confidenceFrom(count, recent),
      evidence,
      recent,
    });
  }

  // ---- framework / technology signals from text ----
  const techHits = new Map<string, { category: string; repos: string[]; recent: boolean }>();
  for (const repo of allRepos) {
    const haystack = `${repo.name} ${repo.description ?? ""} ${repo.topics.join(" ")}`.toLowerCase();
    for (const sig of TECH_SIGNALS) {
      if (sig.keywords.some((k) => haystack.includes(k))) {
        const hit = techHits.get(sig.skill) ?? { category: sig.category, repos: [], recent: false };
        hit.repos.push(repo.name);
        if (daysAgo(repo.pushed_at) <= 180) hit.recent = true;
        techHits.set(sig.skill, hit);
      }
    }
  }
  for (const [skill, hit] of techHits) {
    const count = hit.repos.length;
    skills.push({
      name: skill,
      category: hit.category,
      proficiency: proficiencyFrom(count, hit.recent),
      confidence: confidenceFrom(count, hit.recent),
      evidence: [
        `Detected in ${count} repositor${count > 1 ? "ies" : "y"} (${hit.repos.slice(0, 3).join(", ")}${count > 3 ? ", …" : ""})`,
        hit.recent ? "Active in recent work" : "Only in older repositories",
      ],
      recent: hit.recent,
    });
  }

  // ---- engineering-practice skills from root files across scanned repos ----
  const dockerCount = scans.filter((s) => detectSignals(s.root).includes("Docker")).length;
  const testCount = scans.filter((s) => detectSignals(s.root).includes("Tests")).length;
  const ciCount = scans.filter((s) => detectSignals(s.root).includes("CI/CD")).length;
  const recentDocker = scans.some((s) => detectSignals(s.root).includes("Docker") && daysAgo(s.repo.pushed_at) <= 180);
  const recentTests = scans.some((s) => detectSignals(s.root).includes("Tests") && daysAgo(s.repo.pushed_at) <= 180);
  const recentCi = scans.some((s) => detectSignals(s.root).includes("CI/CD") && daysAgo(s.repo.pushed_at) <= 180);

  if (dockerCount > 0)
    skills.push({
      name: "Docker",
      category: "DevOps",
      proficiency: proficiencyFrom(dockerCount, recentDocker),
      confidence: confidenceFrom(dockerCount, recentDocker),
      evidence: [`Dockerfile / compose in ${dockerCount} of ${scans.length} scanned repos`],
      recent: recentDocker,
    });
  skills.push({
    name: "Testing",
    category: "DevOps",
    proficiency: proficiencyFrom(testCount, recentTests),
    confidence: confidenceFrom(testCount, recentTests),
    evidence:
      testCount > 0
        ? [`Test suites in ${testCount} of ${scans.length} scanned repos`]
        : ["No test directories found in scanned repos"],
    recent: recentTests,
  });
  skills.push({
    name: "CI/CD",
    category: "DevOps",
    proficiency: proficiencyFrom(ciCount, recentCi),
    confidence: confidenceFrom(ciCount, recentCi),
    evidence:
      ciCount > 0
        ? [`CI configuration in ${ciCount} of ${scans.length} scanned repos`]
        : ["No CI configuration found in scanned repos"],
    recent: recentCi,
  });

  // ---- projects ----
  const topProjects: Project[] = scans
    .map(({ repo, languages, root }) => {
      const signals = detectSignals(root);
      const techStack = [
        ...Object.keys(languages).sort((a, b) => languages[b]! - languages[a]!).slice(0, 3),
        ...repo.topics.filter((t) => t.length <= 14).slice(0, 3),
      ];
      const score = Math.round(
        Math.min(repo.size, 8000) / 400 +
          signals.length * 4 +
          (repo.description ? 5 : 0) +
          Math.min(repo.stargazers_count, 60) * 0.3 +
          Math.max(0, 20 - daysAgo(repo.pushed_at) / 15),
      );
      return {
        name: repo.name,
        description:
          repo.description ??
          `A ${repo.language ?? "code"} repository — no description provided on GitHub.`,
        techStack: [...new Set(techStack)].slice(0, 6),
        complexity: (signals.length >= 4 || score >= 30 ? "Advanced" : signals.length >= 2 || score >= 16 ? "Intermediate" : "Beginner") as Project["complexity"],
        signals,
        stars: repo.stargazers_count,
        lastActive: relativeTime(repo.pushed_at),
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  // ---- direction: recent vs historical ----
  const currentSkills = skills.filter((s) => s.recent);
  const currentFocus = currentSkills
    .slice()
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 8)
    .map((s) => s.name);
  const historicalSkills = skills
    .filter((s) => !s.recent && s.proficiency !== "beginner")
    .map((s) => s.name)
    .slice(0, 6);

  const pushed30 = allRepos.filter((r) => daysAgo(r.pushed_at) <= 30).length;
  const activity =
    pushed30 >= 5
      ? `Very active — ${pushed30} repos updated in the last 30 days`
      : pushed30 >= 2
        ? `Active — ${pushed30} repos updated in the last 30 days`
        : recentRepos.length > 0
          ? `Moderately active — last push ${relativeTime(allRepos[0]?.pushed_at ?? new Date().toISOString())}`
          : "Quiet — no recent public activity";

  // ---- focus inference ----
  const catStrength = (cat: string) =>
    currentSkills.filter((s) => s.category === cat).reduce((a, s) => a + s.confidence, 0);
  const strengths: [string, string][] = [
    ["AI Engineering", "AI / ML"],
    ["Backend Engineering", "Backend"],
    ["Frontend Engineering", "Frontend"],
    ["Web3 Engineering", "Web3"],
  ];
  const ranked = strengths.map(([label, cat]) => ({ label, v: catStrength(cat) })).sort((a, b) => b.v - a.v);
  const primaryFocus = (ranked[0]?.v ?? 0) > 0.5 ? ranked[0]!.label : "Software Engineering";
  const secondaryFocus = ranked.filter((r) => r.label !== primaryFocus && r.v > 0.4).map((r) => r.label).slice(0, 3);
  if (ranked.some((r) => r.label === "Frontend Engineering" && r.v > 0.4) && ranked.some((r) => r.label === "Backend Engineering" && r.v > 0.4)) {
    if (!secondaryFocus.includes("Full Stack Development") && primaryFocus !== "Full Stack Development")
      secondaryFocus.unshift("Full Stack Development");
  }

  const directionBits = currentFocus.slice(0, 3);
  const currentDirection =
    directionBits.length > 0
      ? `Recent public work centers on ${directionBits.join(", ")}${recentRepos.length > 0 ? ` — ${recentRepos.length} repos active in the last 6 months` : ""}.`
      : "Little recent public activity — profile reflects older work.";

  return {
    username: user.login,
    name: user.name ?? user.login,
    bio: user.bio ?? "No bio on GitHub.",
    avatarUrl: user.avatar_url,
    primaryFocus,
    secondaryFocus,
    stats: {
      publicRepos: user.public_repos,
      stars: allRepos.reduce((a, r) => a + r.stargazers_count, 0),
      followers: user.followers,
      recentActivity: activity,
    },
    primaryLanguages: [...langRepos.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([l]) => l),
    skills: skills.sort((a, b) => b.confidence - a.confidence),
    topProjects,
    currentDirection,
    currentFocus,
    historicalSkills,
  };
}
