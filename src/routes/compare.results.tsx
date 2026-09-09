import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AnalysisAccessError, resolveDeveloper } from "@/lib/resolve-developer";
import { GitHubError } from "@/lib/github/api";
import { compareDevelopers } from "@/lib/mock/comparison";
import { CAREER_GOALS, type CareerGoal } from "@/lib/mock/types";
import { generateGapAnalysisServer } from "@/lib/compare-ai.functions";
import { saveComparison } from "@/lib/comparisons.functions";
import { recordComparisonUsage } from "@/utils/payments.functions";
import { useSubscription } from "@/hooks/useSubscription";
import { getPaddleEnvironment } from "@/lib/paddle";
import { supabase } from "@/integrations/supabase/client";
import { ScoreRing } from "@/components/progress";
import { GapPath } from "@/components/gap-path";
import { motion } from "motion/react";
import { ComparisonRow } from "@/components/comparison-row";
import { GapCard } from "@/components/gap-card";
import { RecommendationCard } from "@/components/recommendation-card";
import { ProjectCard } from "@/components/project-card";
import { TechChip } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShareMenu } from "@/components/share-menu";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Lock,
  Loader2,
  Sparkles,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/compare/results")({
  validateSearch: (search: Record<string, unknown>) => {
    const goal = CAREER_GOALS.some((g) => g.value === search["goal"])
      ? (search["goal"] as CareerGoal)
      : "ai-engineer";
    return {
      you: typeof search["you"] === "string" && search["you"] ? search["you"] : "you",
      target: typeof search["target"] === "string" && search["target"] ? search["target"] : "arjun-builds",
      goal,
    };
  },
  head: (ctx) => {
    const search = (ctx as { search?: Record<string, unknown> }).search ?? {};
    const you = typeof search["you"] === "string" ? search["you"] : "you";
    const target = typeof search["target"] === "string" ? search["target"] : "arjun-builds";
    const title = `@${you} vs @${target} — Skill Gap Analysis | DevMirror`;
    const desc = `The distance between @${you} and @${target}: critical gaps, goal-aware recommendations, and the next 3 moves to close them.`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: CompareResults,
});

function CompareResults() {
  const { you, target, goal } = Route.useSearch();
  const navigate = useNavigate();
  const saveFn = useServerFn(saveComparison);
  const recordUsage = useServerFn(recordComparisonUsage);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const env = getPaddleEnvironment();
  const { entitlement } = useSubscription();
  const isFreeUser = entitlement?.plan === "free";
  const usageExceeded = Boolean(
    isFreeUser && entitlement && entitlement.comparisonsUsed >= entitlement.comparisonsLimit,
  );

  const { data, error, isPending } = useQuery({
    queryKey: ["compare", you.toLowerCase(), target.toLowerCase()],
    queryFn: () => Promise.all([resolveDeveloper(you), resolveDeveloper(target)]),
    staleTime: 15 * 60_000,
    retry: false,
  });

  // The AI layer reads both resolved profiles and writes the narrative the
  // heuristics can't — verdict, trajectory, gap intel, and the 3 missions.
  const aiQuery = useQuery({
    queryKey: ["gap-ai", you.toLowerCase(), target.toLowerCase(), goal, env],
    queryFn: () =>
      generateGapAnalysisServer({ data: { you, target, goal, environment: env } }),
    enabled: Boolean(data) && !error && !usageExceeded,
    staleTime: 60 * 60_000,
    retry: false,
  });

  // Record comparison usage for signed-in free users once the AI layer resolves.
  useEffect(() => {
    if (!isFreeUser || usageExceeded || !aiQuery.isSuccess) return;
    recordUsage({ data: { environment: env } }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFreeUser, usageExceeded, aiQuery.isSuccess, env]);

  if (isPending) {
    return (
      <main className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
        <div className="font-mono text-[11px] tracking-[0.3em] text-muted-foreground uppercase">
          Bridging two universes
        </div>
        <div className="mt-3 font-mono text-sm text-foreground">
          @{you} <span className="text-muted-foreground">×</span> @{target}
        </div>
        <p className="mt-6 animate-pulse font-mono text-xs text-success">
          Fetching live GitHub data — reading repos, languages, architecture signals…
        </p>
      </main>
    );
  }

  if (error instanceof AnalysisAccessError) {
    const needsAuth = error.reason === "needs-auth";
    return (
      <main className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-warning/40 bg-warning/10">
          <Lock className="size-6 text-warning" />
        </div>
        <h1 className="mt-6 font-display text-3xl font-bold tracking-tight">
          {needsAuth ? "Sign in to run this comparison" : "Monthly analysis limit reached"}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild>
            <Link to={needsAuth ? "/auth" : "/pricing"}>
              <Zap className="size-4" /> {needsAuth ? "Create free account" : "See plans"}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/compare">
              <ArrowLeft className="size-4" /> Back to setup
            </Link>
          </Button>
        </div>
      </main>
    );
  }

  if (error || !data) {
    const notFound = error instanceof GitHubError && error.status === 404;
    return (
      <main className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
        <div className="font-mono text-[11px] tracking-[0.3em] text-danger uppercase">Signal lost</div>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">
          {notFound ? "One of these developers doesn't exist" : "Couldn't reach GitHub"}
        </h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          {notFound
            ? "Check both usernames — GitHub couldn't find at least one of them."
            : (error?.message ?? "Unknown error")}
        </p>
        <Link to="/compare" className="mt-6">
          <Button variant="outline">
            <ArrowLeft className="size-4" /> Back to setup
          </Button>
        </Link>
      </main>
    );
  }

  if (usageExceeded) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-warning/40 bg-warning/10">
          <Lock className="size-6 text-warning" />
        </div>
        <h1 className="mt-6 font-display text-3xl font-bold tracking-tight">
          You've used your free comparisons this month
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          Free accounts get 1 comparison per month. Upgrade to Pro for unlimited comparisons — or
          Career Pro to add role benchmarks, roadmaps, and project blueprints.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild>
            <Link to="/pricing">
              <Zap className="size-4" /> Upgrade to Pro
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/dashboard">View mission log</Link>
          </Button>
        </div>
      </main>
    );
  }

  const [youDev, targetDev] = data;
  const result = compareDevelopers(youDev, targetDev, goal);
  const ai = aiQuery.data;
  const missions = ai?.missions ?? result.nextActions;

  const onSave = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      toast.info("Sign in to save comparisons", {
        description: "Keep this analysis in your mission log.",
        action: { label: "Sign in", onClick: () => navigate({ to: "/auth" }) },
      });
      return;
    }
    setSaveState("saving");
    try {
      await saveFn({
        data: {
          yourUsername: youDev.username,
          targetUsername: targetDev.username,
          careerGoal: goal,
          result: JSON.parse(JSON.stringify(result)),
        },
      });
      setSaveState("saved");
      toast.success("Saved to your mission log", {
        action: { label: "View log", onClick: () => navigate({ to: "/dashboard" }) },
      });
    } catch {
      setSaveState("idle");
      toast.error("Couldn't save this comparison");
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <Link to="/compare">
        <Button variant="ghost" size="sm" className="mb-6 -ml-2 text-muted-foreground">
          <ArrowLeft className="size-4" /> New comparison
        </Button>
      </Link>

      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">The distance between you</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-mono text-foreground">@{youDev.username}</span> vs{" "}
            <span className="font-mono text-foreground">@{targetDev.username}</span> · Goal:{" "}
            <span className="text-foreground">{result.goalLabel}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onSave} disabled={saveState !== "idle"}>
            {saveState === "saving" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : saveState === "saved" ? (
              <BookmarkCheck className="size-4 text-success" />
            ) : (
              <Bookmark className="size-4" />
            )}
            {saveState === "saved" ? "Saved" : "Save this comparison"}
          </Button>
          <ShareMenu
            url={`/compare/results?you=${encodeURIComponent(youDev.username)}&target=${encodeURIComponent(targetDev.username)}&goal=${encodeURIComponent(goal)}`}
            text={`@${youDev.username} vs @${targetDev.username} — developer match, critical gaps and the next 3 moves to close them.`}
            label="Share this comparison"
          />
          <div className="flex items-center gap-3">
            <img src={youDev.avatarUrl} alt={`${youDev.username} avatar`} className="size-12 rounded-full border border-border bg-muted" />
            <span className="text-sm font-medium text-muted-foreground">VS</span>
            <img src={targetDev.avatarUrl} alt={`${targetDev.username} avatar`} className="size-12 rounded-full border border-success/40 bg-muted" />
          </div>
        </div>
      </div>

      {/* Trajectory — you are here, target is there */}
      <motion.div
        className="mt-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <GapPath result={result} />
      </motion.div>

      {/* Summary */}
      <div className="mt-6 grid gap-4 lg:grid-cols-[auto_1fr]">
        <Card className="flex flex-col items-center justify-center gap-2 p-6">
          <div className="text-sm font-medium text-muted-foreground">Developer Match</div>
          <ScoreRing score={result.matchScore} />
        </Card>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="gap-0 border-danger/25 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-danger">
              <span className="size-2 rounded-full bg-danger" /> Critical Gaps · {result.criticalGaps.length}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {result.criticalGaps.map((r) => (
                <TechChip key={r.skill} name={r.skill} />
              ))}
              {result.criticalGaps.length === 0 && <span className="text-sm text-muted-foreground">None</span>}
            </div>
          </Card>
          <Card className="gap-0 border-warning/25 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-warning">
              <span className="size-2 rounded-full bg-warning" /> Skills to Improve · {result.skillsToImprove.length}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {result.skillsToImprove.map((r) => (
                <TechChip key={r.skill} name={r.skill} />
              ))}
              {result.skillsToImprove.length === 0 && <span className="text-sm text-muted-foreground">None</span>}
            </div>
          </Card>
          <Card className="gap-0 border-success/25 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-success">
              <span className="size-2 rounded-full bg-success" /> Strong Matches · {result.strongMatches.length}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {result.strongMatches.map((r) => (
                <TechChip key={r.skill} name={r.skill} />
              ))}
              {result.strongMatches.length === 0 && <span className="text-sm text-muted-foreground">None</span>}
            </div>
          </Card>
        </div>
      </div>

      {/* The read — AI verdict */}
      {(ai || aiQuery.isPending) && (
        <motion.section
          className="mt-10"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="gap-0 border-primary/25 p-6">
            <div className="flex items-center gap-2 font-mono text-[11px] tracking-[0.3em] text-primary uppercase">
              <Sparkles className="size-3.5" /> the read
            </div>
            {ai ? (
              <>
                <p className="mt-3 text-sm leading-relaxed text-foreground sm:text-base">{ai.verdict}</p>
                <p className="mt-3 border-t border-border pt-3 text-sm text-muted-foreground">
                  <span className="font-mono text-xs tracking-wider text-success uppercase">Trajectory → </span>
                  {ai.trajectory}
                </p>
              </>
            ) : (
              <p className="mt-3 animate-pulse font-mono text-xs text-muted-foreground">
                Reading both universes — composing the verdict…
              </p>
            )}
          </Card>
        </motion.section>
      )}

      {/* Your next move — mission control */}
      <section className="mt-14">
        <div className="mb-2 flex items-center gap-2">
          <Zap className="size-5 text-success" />
          <span className="font-mono text-[11px] tracking-[0.3em] text-success uppercase">Mission control</span>
        </div>
        <h2 className="font-display text-3xl font-bold tracking-tight">Your next move</h2>
        <p className="mt-1 text-sm text-muted-foreground">Three missions. Highest leverage first. Nothing else.</p>
        <div className="mt-6 grid gap-px border border-border bg-border md:grid-cols-3">
          {missions.map((a, i) => (
            <motion.div
              key={a.title}
              className="bg-background p-6"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.5 }}
            >
              <div className="font-display text-4xl font-bold text-success/90">
                {String(i + 1).padStart(2, "0")}
              </div>
              <h3 className="mt-3 font-mono text-sm font-medium tracking-[0.15em] uppercase">{a.title}</h3>
              <p className="mt-3 text-xs text-muted-foreground">{a.context}</p>
              <p className="mt-4 border-t border-border pt-3 text-sm">
                <span className="font-mono text-xs tracking-wider text-success uppercase">Next → </span>
                <span className="text-muted-foreground">{a.action}</span>
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Side-by-side skills */}
      <section className="mt-10">
        <h2 className="mb-4 text-xl font-bold tracking-tight">Side-by-Side Skills</h2>
        <Card className="gap-0 overflow-hidden p-0">
          <div className="hidden grid-cols-[180px_1fr_1fr_auto] gap-x-4 border-b border-border bg-muted/40 px-4 py-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase sm:grid">
            <span>Skill</span>
            <span>You</span>
            <span>Target</span>
            <span>Status</span>
          </div>
          {result.rows
            .slice()
            .sort((a, b) => {
              const order = { critical: 0, improve: 1, match: 2, "not-required": 3 } as const;
              return order[a.status] - order[b.status];
            })
            .map((r) => (
              <ComparisonRow key={r.skill} row={r} />
            ))}
        </Card>
      </section>

      {/* Critical gaps detail */}
      {result.criticalGaps.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-bold tracking-tight">Critical Gaps</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.criticalGaps.map((r) => (
              <GapCard key={r.skill} row={r} />
            ))}
          </div>
          {ai && ai.gapInsights.length > 0 && (
            <div className="mt-4 space-y-2">
              {ai.gapInsights
                .filter((gi) => result.criticalGaps.some((g) => g.skill === gi.skill))
                .map((gi) => (
                  <p key={gi.skill} className="text-sm text-muted-foreground">
                    <span className="font-mono text-xs text-danger">{gi.skill}</span>
                    <span className="mx-2 text-muted-foreground/50">→</span>
                    {gi.insight}
                  </p>
                ))}
            </div>
          )}
        </section>
      )}

      {/* Recommendations */}
      <section className="mt-10">
        <h2 className="mb-1 text-xl font-bold tracking-tight">Personalized Recommendations</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Weighted by gap size × relevance to your {result.goalLabel} goal × how actively the target uses each skill.
        </p>
        <div className="grid gap-4 lg:grid-cols-2">
          {result.recommendations.map((rec) => (
            <RecommendationCard key={rec.skill} rec={rec} />
          ))}
        </div>
      </section>

      {/* Stack comparison */}
      <section className="mt-10">
        <h2 className="mb-4 text-xl font-bold tracking-tight">Tech Stack Comparison</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="gap-0 p-5">
            <h3 className="text-sm font-semibold">Your current stack</h3>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {result.userStack.map((t) => (
                <TechChip key={t} name={t} />
              ))}
            </div>
          </Card>
          <Card className="gap-0 p-5">
            <h3 className="text-sm font-semibold">Target's current stack</h3>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {result.targetStack.map((t) => (
                <TechChip key={t} name={t} />
              ))}
            </div>
          </Card>
          <Card className="gap-0 border-success/25 p-5">
            <h3 className="text-sm font-semibold text-success">Shared ground</h3>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {result.sharedStack.length ? (
                result.sharedStack.map((t) => <TechChip key={t} name={t} />)
              ) : (
                <span className="text-sm text-muted-foreground">No overlap yet</span>
              )}
            </div>
          </Card>
        </div>
      </section>

      {/* Project comparison */}
      <section className="mt-10 pb-10">
        <h2 className="mb-4 text-xl font-bold tracking-tight">Project Comparison</h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Your strongest project</h3>
            {youDev.topProjects[0] && <ProjectCard project={youDev.topProjects[0]} />}
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Target's strongest project</h3>
            {targetDev.topProjects[0] && <ProjectCard project={targetDev.topProjects[0]} />}
          </div>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Notice the engineering signals gap — the fastest way to close it is upgrading one existing project with
          tests, Docker, CI/CD, and a real deployment.
        </p>
      </section>
    </main>
  );
}
