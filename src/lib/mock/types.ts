export type Proficiency = "beginner" | "intermediate" | "advanced" | "expert";

export const PROFICIENCY_SCORE: Record<Proficiency, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
  expert: 4,
};

export const PROFICIENCY_LABEL: Record<Proficiency, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  expert: "Expert",
};

export type EvidenceStrength = "strong" | "moderate" | "limited";

export interface Skill {
  name: string;
  category: string;
  proficiency: Proficiency;
  confidence: number; // 0–1
  evidence: string[];
  recent: boolean; // actively used in recent work
}

export interface Project {
  name: string;
  description: string;
  techStack: string[];
  complexity: "Beginner" | "Intermediate" | "Advanced";
  signals: string[]; // Docker, Tests, CI/CD, Database, Auth, Deployment...
  stars: number;
  lastActive: string;
  score: number; // meaningfulness ranking score
}

export interface DeveloperProfile {
  username: string;
  name: string;
  bio: string;
  avatarUrl: string;
  primaryFocus: string;
  secondaryFocus: string[];
  stats: {
    publicRepos: number;
    stars: number;
    followers: number;
    recentActivity: string;
  };
  primaryLanguages: string[];
  skills: Skill[];
  topProjects: Project[];
  currentDirection: string;
  currentFocus: string[];
  historicalSkills: string[];
  /** AI-generated narrative layers — present only on server-enriched profiles. */
  aiSummary?: string;
  aiTrajectory?: string;
  aiProjectInsights?: { name: string; why: string }[];
  /** Optional provenance for AI fields; absent on legacy cached profiles. */
  aiProvenance?: {
    provider: "baseline" | "nugen";
    model?: string;
  };
}

export type CareerGoal =
  | "ai-engineer"
  | "ml-engineer"
  | "backend-engineer"
  | "fullstack-engineer"
  | "software-engineer"
  | "data-scientist"
  | "web3-engineer";

export const CAREER_GOALS: { value: CareerGoal; label: string }[] = [
  { value: "ai-engineer", label: "AI Engineer" },
  { value: "ml-engineer", label: "ML Engineer" },
  { value: "backend-engineer", label: "Backend Engineer" },
  { value: "fullstack-engineer", label: "Full Stack Engineer" },
  { value: "software-engineer", label: "Software Engineer" },
  { value: "data-scientist", label: "Data Scientist" },
  { value: "web3-engineer", label: "Web3 Engineer" },
];

export type GapStatus = "critical" | "improve" | "match" | "not-required";

export interface SkillComparison {
  skill: string;
  category: string;
  userProficiency: Proficiency | null;
  targetProficiency: Proficiency;
  status: GapStatus;
  relevanceToGoal: number; // 0–2
  targetEvidence: string[];
}

export interface Recommendation {
  skill: string;
  priority: "High" | "Medium" | "Low";
  currentLevel: string;
  targetLevel: string;
  whyItMatters: string;
  whatToLearn: string[];
  recommendedGoal: string;
}

export interface NextAction {
  title: string;
  context: string;
  action: string;
}

export interface ComparisonResult {
  goal: CareerGoal;
  goalLabel: string;
  matchScore: number; // 0–100
  rows: SkillComparison[];
  criticalGaps: SkillComparison[];
  skillsToImprove: SkillComparison[];
  strongMatches: SkillComparison[];
  notRequired: SkillComparison[];
  recommendations: Recommendation[];
  nextActions: NextAction[];
  userStack: string[];
  targetStack: string[];
  sharedStack: string[];
}
