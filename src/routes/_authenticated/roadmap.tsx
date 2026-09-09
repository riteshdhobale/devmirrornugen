import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Github,
  Hammer,
  Loader2,
  Lock,
  Route as RouteIcon,
  Save,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildRoadmapServer, saveRoadmap } from "@/lib/roles.functions";
import {
  GAP_LEVEL_LABEL,
  GAP_VERDICT_LABEL,
  ROLE_CATALOG,
  type GapVerdict,
  type RoleGapRow,
  type RoleRoadmap,
} from "@/lib/roles-types";
import { getPaddleEnvironment } from "@/lib/paddle";

export const Route = createFileRoute("/_authenticated/roadmap")({
  validateSearch: (search: Record<string, unknown>) => ({
    role: typeof search['role'] === "string" ? (search['role'] as string) : undefined,
    username: typeof search['username'] === "string" ? (search['username'] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Your Roadmap — Close the Gap to Your Target Role | DevMirror" },
      {
        name: "description",
        content:
          "Measure your public GitHub evidence against a role benchmark, then get a three-phase path and three project blueprints that prove the missing skills.",
      },
      { property: "og:title", content: "Your Roadmap — DevMirror" },
      {
        property: "og:description",
        content: "From where your code is today to what the role expects — in three phases.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RoadmapPage,
});

const normalize = (v: string) =>
  v.trim().replace(/^https?:\/\/(www\.)?github\.com\//i, "").replace(/\/+$/, "").split("/")[0] ?? "";

const VERDICT_TONE: Record<GapVerdict, string> = {
  match: "border-success/40 text-success",
  improve: "border-warning/40 text-warning",
  critical: "border-destructive/40 text-destructive",
  optional: "border-border text-muted-foreground",
};

function GapRow({ row }: { row: RoleGapRow }) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border/60 py-2 last:border-0">
      <div className="w-40 shrink-0 truncate font-mono text-sm">{row.skill}</div>
      <div className="h-2 min-w-24 flex-1 overflow-hidden rounded-full bg-muted">
        <motion.div
          className={`h-full rounded-full ${
            row.verdict === "critical"
              ? "bg-destructive"
              : row.verdict === "improve"
                ? "bg-warning"
                : "bg-success"
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(row.strength, 2)}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      <span
        className={`shrink-0 rounded border px-2 py-0.5 font-mono text-[10px] tracking-wider uppercase ${VERDICT_TONE[row.verdict]}`}
      >
        {GAP_VERDICT_LABEL[row.verdict]}
      </span>
      <div className="w-full font-mono text-[11px] text-muted-foreground sm:w-72">
        {GAP_LEVEL_LABEL[row.level]} · {row.evidence}
      </div>
    </div>
  );
}

function RoadmapPage() {
  const search = Route.useSearch();
  const [slug, setSlug] = useState(search.role ?? ROLE_CATALOG[0]!.slug);
  const [username, setUsername] = useState(search.username ?? "");

  const build = useServerFn(buildRoadmapServer);
  const save = useServerFn(saveRoadmap);
  const env = getPaddleEnvironment();

  const run = useMutation({
    mutationFn: (vars: { slug: string; username: string }) =>
      build({ data: { ...vars, environment: env } }),
  });
  const persist = useMutation({
    mutationFn: (roadmap: RoleRoadmap) =>
      save({
        data: {
          roleSlug: roadmap.role.slug,
          roleLabel: roadmap.role.label,
          githubUsername: roadmap.username,
          readiness: roadmap.readiness,
          roadmap: roadmap as unknown as Record<string, unknown>,
        },
      }),
    onSuccess: () => toast.success("Roadmap saved to your mission log"),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  const handle = normalize(username);
  const roadmap = run.data?.ok ? run.data.roadmap : null;
  const needsGitHub =
    run.data && !run.data.ok && run.data.reason === "needs-github" ? run.data.message : null;
  const needsPro =
    run.data && !run.data.ok && run.data.reason === "needs-upgrade" ? run.data.message : null;
  const failure =
    run.error instanceof Error
      ? run.error.message
      : run.data && !run.data.ok && !needsGitHub && !needsPro
        ? (run.data as { message: string }).message
        : null;

  return (
    <main className="mx-auto max-w-5xl px-4 py-14">
      <div className="text-center">
        <div className="font-mono text-[10px] tracking-[0.35em] text-primary uppercase">
          › trajectory
        </div>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight">
          The distance, and how to cross it.
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
          Pick the role you're aiming at. We measure your public evidence against the pattern real
          developers in that role share — then hand you three phases and three projects that close it.
        </p>
      </div>

      <Card className="mt-10 gap-0 border-border/80 p-6">
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="role">Target role</Label>
            <select
              id="role"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 font-mono text-sm outline-none focus-visible:border-ring"
            >
              {ROLE_CATALOG.map((r) => (
                <option key={r.slug} value={r.slug} className="bg-background">
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Your GitHub username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="octocat"
              className="font-mono"
            />
          </div>
          <Button
            disabled={!handle || run.isPending}
            onClick={() => run.mutate({ slug, username: handle })}
          >
            {run.isPending ? (
              <>
                <Loader2 className="mr-1.5 size-4 animate-spin" /> Charting
              </>
            ) : (
              <>
                Chart path <ArrowRight className="ml-1.5 size-4" />
              </>
            )}
          </Button>
        </div>
        <p className="mt-3 font-mono text-[11px] text-muted-foreground">
          first run for a role analyzes its cohort live — later runs are instant
        </p>
      </Card>

      {needsGitHub && (
        <Card className="mt-8 gap-0 border-primary/40 p-6">
          <div className="flex items-start gap-3">
            <Github className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <h2 className="font-display text-lg font-semibold">Connect GitHub to run this</h2>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">{needsGitHub}</p>
              <Button asChild className="mt-4">
                <Link to="/dashboard">
                  Connect GitHub <ArrowRight className="ml-1.5 size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </Card>
      )}

      {needsPro && (
        <Card className="mt-8 gap-0 border-primary/40 p-6">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <h2 className="font-display text-lg font-semibold">Roadmaps are a Career Pro feature</h2>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">{needsPro}</p>
              <Button asChild className="mt-4">
                <Link to="/pricing">
                  Upgrade to Career Pro <ArrowRight className="ml-1.5 size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </Card>
      )}

      {failure && (
        <Card className="mt-8 gap-0 border-destructive/40 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
            <div>
              <h2 className="font-display text-lg font-semibold">Couldn't chart this path</h2>
              <p className="mt-2 text-sm text-muted-foreground">{failure}</p>
            </div>
          </div>
        </Card>
      )}

      {roadmap && (
        <>
          <section className="mt-10">
            <Card className="gap-0 border-primary/30 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <img
                    src={roadmap.avatarUrl}
                    alt={`${roadmap.name} GitHub avatar`}
                    className="size-12 rounded-full border border-border bg-muted"
                  />
                  <div>
                    <div className="font-display text-lg font-semibold">{roadmap.name}</div>
                    <div className="font-mono text-xs text-muted-foreground">
                      @{roadmap.username} → {roadmap.role.label}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display text-4xl leading-none font-bold">
                    {roadmap.readiness}
                    <span className="text-lg text-muted-foreground">/100</span>
                  </div>
                  <div className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase">
                    role readiness
                  </div>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-foreground">{roadmap.headline}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{roadmap.leverage}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={persist.isPending}
                  onClick={() => persist.mutate(roadmap)}
                >
                  <Save className="mr-1.5 size-3.5" /> Save to mission log
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/roles/$slug" params={{ slug: roadmap.role.slug }}>
                    See the full role benchmark
                  </Link>
                </Button>
              </div>
            </Card>
          </section>

          <section className="mt-8">
            <h2 className="flex items-center gap-2 font-mono text-[11px] tracking-[0.3em] text-muted-foreground uppercase">
              <Target className="size-3.5" /> where you stand, skill by skill
            </h2>
            <Card className="mt-3 gap-0 p-5">
              {roadmap.rows.map((row) => (
                <GapRow key={row.skill} row={row} />
              ))}
            </Card>
          </section>

          <section className="mt-8">
            <h2 className="flex items-center gap-2 font-mono text-[11px] tracking-[0.3em] text-muted-foreground uppercase">
              <RouteIcon className="size-3.5" /> the path across
            </h2>
            <div className="mt-3 grid gap-4 lg:grid-cols-3">
              {roadmap.phases.map((phase, i) => (
                <motion.div
                  key={phase.title}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.4 }}
                >
                  <Card className="h-full gap-0 p-5">
                    <div className="font-mono text-[10px] tracking-[0.25em] text-primary uppercase">
                      phase {i + 1} · {phase.duration}
                    </div>
                    <h3 className="mt-2 font-display text-lg font-semibold tracking-tight">
                      {phase.title}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">{phase.focus}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {phase.skills.map((s) => (
                        <span
                          key={s}
                          className="rounded border border-border bg-muted/40 px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                    <p className="mt-4 border-t border-border pt-3 text-sm">
                      <span className="font-mono text-[11px] tracking-wider text-success uppercase">
                        outcome
                      </span>
                      <br />
                      {phase.outcome}
                    </p>
                  </Card>
                </motion.div>
              ))}
            </div>
          </section>

          <section className="mt-8">
            <h2 className="flex items-center gap-2 font-mono text-[11px] tracking-[0.3em] text-muted-foreground uppercase">
              <Hammer className="size-3.5" /> build these three
            </h2>
            <div className="mt-3 grid gap-4 lg:grid-cols-3">
              {roadmap.blueprints.map((b) => (
                <Card key={b.name} className="h-full gap-0 p-5">
                  <h3 className="font-display text-lg font-semibold tracking-tight">{b.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{b.problem}</p>
                  <p className="mt-2 text-sm">{b.pitch}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {b.stack.map((s) => (
                      <span
                        key={s}
                        className="rounded border border-border bg-muted/40 px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                  <ul className="mt-4 space-y-1.5 border-t border-border pt-3 text-sm">
                    {b.mustShow.map((m) => (
                      <li key={m} className="flex gap-2 text-muted-foreground">
                        <Check className="mt-0.5 size-3.5 shrink-0 text-success" /> {m}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 font-mono text-[11px] text-muted-foreground">
                    closes: {b.provesGaps.join(", ") || "—"} · {b.scope}
                  </div>
                </Card>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
