import {
  PROFICIENCY_SCORE,
  PROFICIENCY_LABEL,
  CAREER_GOALS,
  type CareerGoal,
  type ComparisonResult,
  type DeveloperProfile,
  type GapStatus,
  type NextAction,
  type Proficiency,
  type Recommendation,
  type Skill,
  type SkillComparison,
} from "./types";

/**
 * Goal relevance: 0 = irrelevant to goal, 1 = useful, 2 = core to the role.
 * Keyed by goal -> skill name. Category defaults apply when a skill isn't listed.
 */
const CATEGORY_RELEVANCE: Record<CareerGoal, Record<string, number>> = {
  "ai-engineer": { "AI / ML": 2, Backend: 2, Programming: 2, Fundamentals: 2, DevOps: 1, Frontend: 1 },
  "ml-engineer": { "AI / ML": 2, Programming: 2, Fundamentals: 2, Backend: 1, DevOps: 1, Frontend: 0 },
  "backend-engineer": { Backend: 2, Fundamentals: 2, Programming: 2, DevOps: 2, "AI / ML": 0, Frontend: 0 },
  "fullstack-engineer": { Frontend: 2, Backend: 2, Programming: 2, DevOps: 1, Fundamentals: 2, "AI / ML": 1 },
  "software-engineer": { Programming: 2, Fundamentals: 2, Backend: 1, DevOps: 1, Frontend: 1, "AI / ML": 0 },
  "data-scientist": { "AI / ML": 2, Programming: 2, Fundamentals: 1, Backend: 1, DevOps: 0, Frontend: 0 },
  "web3-engineer": { Programming: 2, Backend: 2, Fundamentals: 2, Frontend: 1, DevOps: 1, "AI / ML": 0 },
};

const SKILL_RELEVANCE_OVERRIDES: Record<CareerGoal, Record<string, number>> = {
  "ai-engineer": { DSA: 2, "System Design": 2, Docker: 2, "CI/CD": 1, Testing: 2, Kubernetes: 1, CUDA: 1, "C++": 0, GraphQL: 0 },
  "ml-engineer": { DSA: 2, Docker: 2, CUDA: 2, "System Design": 1, Kubernetes: 1, React: 0 },
  "backend-engineer": { CUDA: 0, "C++": 1, RAG: 0, "LLM Applications": 0, LangChain: 0, "Machine Learning": 0, React: 0, "Next.js": 0, "CSS / Tailwind": 0, Kubernetes: 2 },
  "fullstack-engineer": { Kubernetes: 1, Kafka: 1, gRPC: 1, CUDA: 0 },
  "software-engineer": { CUDA: 0, RAG: 0, "LLM Applications": 0 },
  "data-scientist": { "System Design": 1, Docker: 1, React: 0, "Next.js": 0 },
  "web3-engineer": { CUDA: 0, "Machine Learning": 0, RAG: 0 },
};

function relevance(goal: CareerGoal, skill: Skill): number {
  const override = SKILL_RELEVANCE_OVERRIDES[goal][skill.name];
  if (override !== undefined) return override;
  return CATEGORY_RELEVANCE[goal][skill.category] ?? 1;
}

function statusFor(userScore: number, targetScore: number, rel: number): GapStatus {
  if (rel === 0) return "not-required";
  const gap = targetScore - userScore;
  if (gap <= 0) return "match";
  if (gap >= 2 && rel === 2) return "critical";
  if (gap >= 2) return "improve";
  return rel === 2 ? "improve" : "match";
}

const RECOMMENDATION_TEMPLATES: Record<string, Omit<Recommendation, "skill" | "priority" | "currentLevel" | "targetLevel">> = {
  DSA: {
    whyItMatters: "Core for coding interviews and programming fundamentals — the most common filter between you and the roles you're targeting.",
    whatToLearn: ["Python fundamentals for DSA", "Arrays", "Hashing", "Two pointers", "Sliding window", "Binary search", "Linked lists", "Stacks and queues", "Trees", "Graphs", "Dynamic programming"],
    recommendedGoal: "150–250 high-quality problems. Learn interview-focused DSA — do not try to become a competitive programmer or match raw problem counts.",
  },
  Docker: {
    whyItMatters: "Every production project in the target's portfolio ships in containers. Docker is table stakes for deploying anything real.",
    whatToLearn: ["Images vs containers", "Writing Dockerfiles", "Multi-stage builds", "docker-compose for local dev", "Containerizing a FastAPI app"],
    recommendedGoal: "Dockerize one existing project end-to-end and run it locally with docker-compose.",
  },
  Testing: {
    whyItMatters: "The target's repos all have test suites — it's a core signal of production engineering maturity.",
    whatToLearn: ["pytest basics", "Unit vs integration tests", "Fixtures and mocking", "Test coverage"],
    recommendedGoal: "Add a pytest suite with meaningful coverage to one existing project.",
  },
  "CI/CD": {
    whyItMatters: "Automated pipelines are how the target ships confidently — every meaningful repo deploys on merge.",
    whatToLearn: ["GitHub Actions basics", "Running tests in CI", "Build + deploy workflows"],
    recommendedGoal: "Add a GitHub Actions workflow that tests and deploys one project.",
  },
  "System Design": {
    whyItMatters: "The target designs systems deliberately — queues, caching, and async workers show up across their production projects.",
    whatToLearn: ["Load balancing", "Caching strategies", "Queues and async workers", "Database indexing", "API design at scale"],
    recommendedGoal: "Write an architecture doc for one of your projects and implement one scaling pattern (caching or a queue).",
  },
  "Machine Learning": {
    whyItMatters: "A working ML foundation makes your AI engineering work more than API plumbing.",
    whatToLearn: ["scikit-learn fundamentals", "Model evaluation", "Fine-tuning basics"],
    recommendedGoal: "Train and evaluate one small model end-to-end on a real dataset.",
  },
  Kubernetes: {
    whyItMatters: "The target deploys services with orchestration — a strong signal for senior backend roles.",
    whatToLearn: ["Pods, services, deployments", "K8s manifests", "Helm basics"],
    recommendedGoal: "Deploy one containerized service to a local cluster (kind/minikube).",
  },
};

function genericRecommendation(skill: string) {
  return {
    whyItMatters: `${skill} appears repeatedly in the target's meaningful, recent projects — it's part of how they actually build.`,
    whatToLearn: [`${skill} fundamentals`, `${skill} in a real project context`, `Best practices used in the target's repos`],
    recommendedGoal: `Build or upgrade one project that uses ${skill} in a production-like setup.`,
  };
}

function buildRecommendations(rows: SkillComparison[], goal: CareerGoal): Recommendation[] {
  return rows
    .filter((r) => r.status === "critical" || r.status === "improve")
    .sort((a, b) => {
      const score = (r: SkillComparison) =>
        (PROFICIENCY_SCORE[r.targetProficiency] - (r.userProficiency ? PROFICIENCY_SCORE[r.userProficiency] : 0)) * (r.relevanceToGoal + 1);
      return score(b) - score(a);
    })
    .slice(0, 4)
    .map((r) => {
      const template = RECOMMENDATION_TEMPLATES[r.skill] ?? genericRecommendation(r.skill);
      return {
        skill: r.skill,
        priority: r.status === "critical" ? "High" : "Medium",
        currentLevel: r.userProficiency ? PROFICIENCY_LABEL[r.userProficiency] : "No evidence",
        targetLevel: PROFICIENCY_LABEL[r.targetProficiency],
        ...template,
      } satisfies Recommendation;
    });
}

function buildNextActions(
  recs: Recommendation[],
  rows: SkillComparison[],
  user: DeveloperProfile,
): NextAction[] {
  const actions: NextAction[] = [];
  const first = recs[0];
  if (first) {
    actions.push({
      title: `Strengthen ${first.skill} Foundations`,
      context: `Current: ${first.currentLevel}.`,
      action:
        first.skill === "DSA"
          ? "Learn arrays and hashing, then work through the pattern list."
          : (first.whatToLearn[0] ?? `Learn ${first.skill} fundamentals`) + ".",
    });
  }
  const devopsGap = rows.find(
    (r) => ["Docker", "Testing", "CI/CD"].includes(r.skill) && (r.status === "critical" || r.status === "improve"),
  );
  if (devopsGap) {
    actions.push({
      title: "Improve Production Backend Skills",
      context: "Current gap: Docker, testing, deployment.",
      action: `Dockerize an existing project${user.topProjects[0] ? ` (start with ${user.topProjects[0].name})` : ""} and add a test suite.`,
    });
  }
  actions.push({
    title: "Build Production Engineering Experience",
    context: "Upgrade one existing project instead of starting a new one.",
    action: "Add authentication, PostgreSQL, Docker, tests, CI/CD, and a real deployment to your strongest project.",
  });
  if (actions.length < 3) {
    const biggest = rows.find((r) => r.status === "critical") ?? rows.find((r) => r.status === "improve");
    actions.push({
      title: biggest ? `Close the ${biggest.skill} Gap` : "Study the Target's Strongest Project",
      context: biggest
        ? `Target level: ${PROFICIENCY_LABEL[biggest.targetProficiency]}.`
        : "Read how they structure production work.",
      action: biggest
        ? (RECOMMENDATION_TEMPLATES[biggest.skill]?.recommendedGoal ?? `Build one project that exercises ${biggest.skill} in a production-like setup.`)
        : "Clone their most meaningful repo, read the architecture, and rebuild one feature yourself.",
    });
  }
  return actions.slice(0, 3);
}

export function compareDevelopers(
  user: DeveloperProfile,
  target: DeveloperProfile,
  goal: CareerGoal,
): ComparisonResult {
  const userSkills = new Map(user.skills.map((s) => [s.name, s]));

  const rows: SkillComparison[] = target.skills.map((ts) => {
    const us = userSkills.get(ts.name);
    const rel = relevance(goal, ts);
    const userScore = us ? PROFICIENCY_SCORE[us.proficiency] : 0;
    const targetScore = PROFICIENCY_SCORE[ts.proficiency];
    return {
      skill: ts.name,
      category: ts.category,
      userProficiency: us ? us.proficiency : null,
      targetProficiency: ts.proficiency,
      status: statusFor(userScore, targetScore, rel),
      relevanceToGoal: rel,
      targetEvidence: ts.evidence,
    };
  });

  const relevant = rows.filter((r) => r.status !== "not-required");
  const matched = relevant.filter((r) => r.status === "match");
  const partial = relevant.filter((r) => r.status === "improve");
  const matchScore = relevant.length
    ? Math.round(((matched.length + partial.length * 0.5) / relevant.length) * 100)
    : 100;

  const recommendations = buildRecommendations(rows, goal);

  const userSet = new Set(user.skills.map((s) => s.name));
  const targetStack = target.skills.filter((s) => s.recent).map((s) => s.name);
  const userStack = user.skills.filter((s) => s.recent).map((s) => s.name);

  return {
    goal,
    goalLabel: CAREER_GOALS.find((g) => g.value === goal)?.label ?? goal,
    matchScore,
    rows,
    criticalGaps: rows.filter((r) => r.status === "critical"),
    skillsToImprove: rows.filter((r) => r.status === "improve"),
    strongMatches: matched,
    notRequired: rows.filter((r) => r.status === "not-required"),
    recommendations,
    nextActions: buildNextActions(recommendations, rows, user),
    userStack,
    targetStack,
    sharedStack: targetStack.filter((s) => userSet.has(s)),
  };
}

export type { Proficiency };
