/** Client-safe types for Recruiter Mode (role decoding + candidate screening). */

export interface RoleRequirement {
  skill: string;
  why: string;
  weight: "must-have" | "important" | "nice-to-have";
}

export interface PortfolioBlueprint {
  name: string;
  pitch: string;
  stack: string[];
  mustShow: string[];
  scope: string;
}

export interface RoleSpec {
  title: string;
  seniority: string;
  summary: string;
  requirements: RoleRequirement[];
  portfolioBlueprints: PortfolioBlueprint[];
  screeningSignals: string[];
  redFlags: string[];
}

export interface CandidateFit {
  username: string;
  name: string;
  avatarUrl: string;
  primaryFocus: string;
  fitScore: number; // 0–100
  band: "strong" | "possible" | "stretch";
  verdict: string;
  matched: { skill: string; evidence: string }[];
  missing: { skill: string; note: string }[];
  standoutProject: string;
  risks: string[];
  interviewProbes: string[];
}

export const BAND_LABEL: Record<CandidateFit["band"], string> = {
  strong: "Strong fit",
  possible: "Possible fit",
  stretch: "Stretch",
};

export type ScreenResult =
  | { ok: true; role: RoleSpec; candidates: CandidateFit[]; failed: { username: string; message: string }[] }
  | { ok: false; message: string; needsUpgrade?: boolean };

export type RoleResult = { ok: true; role: RoleSpec } | { ok: false; message: string };
