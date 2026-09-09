import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { AnalysisAccessError, resolveDeveloper } from "@/lib/resolve-developer";
import { GitHubError } from "@/lib/github/api";
import type { DeveloperProfile } from "@/lib/mock/types";
import { ScanningSequence } from "@/components/scanning-sequence";
import { SkillConstellation } from "@/components/skill-constellation";
import { SkillCard } from "@/components/skill-card";
import { ProjectCard } from "@/components/project-card";
import { TechChip } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShareMenu } from "@/components/share-menu";
import { Star, Users, FolderGit2, Activity, GitCompareArrows, TrendingUp, History } from "lucide-react";

export const Route = createFileRoute("/analyze/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.username} — Developer Analysis | DevMirror` },
      { name: "description", content: `Evidence-based developer analysis of ${params.username}: skills, top projects, tech stack, and technical direction.` },
      { property: "og:title", content: `${params.username} — Developer Analysis | DevMirror` },
      { property: "og:description", content: `Skills, projects, and technical direction of ${params.username}, grounded in repository evidence.` },
    ],
  }),
  component: AnalyzePage,
});

function SnapshotStat({ icon: Icon, label, value }: { icon: typeof Star; label: string; value: string }) {
  return (
    <Card className="flex-row items-center gap-3 p-4">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </Card>
  );
}

function AnalyzePage() {
  const { username } = Route.useParams();
  const [scanned, setScanned] = useState(false);
  const { data: dev, error, isPending, isFetching, refetch } = useQuery({
    queryKey: ["developer", username.toLowerCase()],
    queryFn: () => resolveDeveloper(username),
    staleTime: 15 * 60_000,
    retry: (count, err) => (err instanceof GitHubError ? false : count < 1),
  });

  const ready = scanned && !isPending && !error;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <AnimatePresence>
        {!scanned && <ScanningSequence username={username} onComplete={() => setScanned(true)} />}
      </AnimatePresence>

      {scanned && isPending && (
        <div className="flex min-h-[50vh] items-center justify-center font-mono text-sm text-muted-foreground">
          <span className="animate-pulse">Fetching live data from GitHub…</span>
        </div>
      )}

      {scanned && error instanceof AnalysisAccessError && (
        <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
          <div className="font-mono text-[11px] tracking-[0.3em] text-warning uppercase">
            {error.reason === "needs-auth" ? "access required" : "monthly limit"}
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">
            {error.reason === "needs-auth"
              ? "Sign in to scan a new developer"
              : "You've used your free analyses this month"}
          </h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">{error.message}</p>
          <div className="mt-6 flex items-center gap-2">
            <Link to={error.reason === "needs-auth" ? "/auth" : "/pricing"}>
              <Button>
                {error.reason === "needs-auth" ? "Create free account" : "See plans"}
              </Button>
            </Link>
            <Link to="/">
              <Button variant="outline">Back to base</Button>
            </Link>
          </div>
        </div>
      )}

      {scanned && error && !(error instanceof AnalysisAccessError) && (
        <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
          <div className="font-mono text-[11px] tracking-[0.3em] text-danger uppercase">Signal lost</div>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">
            {error instanceof GitHubError && error.status === 404 ? "No such developer" : "Couldn't reach GitHub"}
          </h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            {error instanceof GitHubError && error.status === 404
              ? `No GitHub user named "${username}" exists. Check the spelling and try again.`
              : error.message}
          </p>
          <div className="mt-6 flex items-center gap-2">
            <Button onClick={() => void refetch()} disabled={isFetching}>
              {isFetching ? "Reconnecting…" : "Try again"}
            </Button>
            <Link to="/">
              <Button variant="outline">Back to base</Button>
            </Link>
          </div>
        </div>
      )}

      {dev && ready && <AnalysisContent dev={dev} scanned={ready} />}
    </main>
  );
}

function AnalysisContent({ dev, scanned }: { dev: DeveloperProfile; scanned: boolean }) {
  const skillsByCategory = dev.skills.reduce<Record<string, typeof dev.skills>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});

  return (
    <>

      {/* Identity */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: scanned ? 1 : 0, y: scanned ? 0 : 16 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
      {/* Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <img src={dev.avatarUrl} alt={`${dev.name} avatar`} className="size-16 rounded-full border border-border bg-muted" />
          <div>
            <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground uppercase">
              Developer intelligence
            </div>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">{dev.name}</h1>
            <div className="font-mono text-sm text-muted-foreground">@{dev.username}</div>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">{dev.bio}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ShareMenu
            url={`/analyze/${dev.username}`}
            text={`Developer intelligence on @${dev.username} — skills, projects and technical direction, decoded by DevMirror.`}
          />
          <Link to="/compare" search={{ target: dev.username }}>
            <Button>
              <GitCompareArrows className="size-4" /> Compare With Me
            </Button>
          </Link>
        </div>
      </div>

      {/* Focus */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-success/25 bg-success/10 px-3 py-1 text-sm font-medium text-success">
          Primary: {dev.primaryFocus}
        </span>
        {dev.secondaryFocus.map((f) => (
          <span key={f} className="rounded-full border border-border bg-card px-3 py-1 text-sm text-muted-foreground">
            {f}
          </span>
        ))}
      </div>

      {/* Snapshot */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <SnapshotStat icon={FolderGit2} label="Public repos" value={String(dev.stats.publicRepos)} />
        <SnapshotStat icon={Star} label="Stars received" value={dev.stats.stars.toLocaleString()} />
        <SnapshotStat icon={Users} label="Followers" value={dev.stats.followers.toLocaleString()} />
        <SnapshotStat icon={Activity} label="Recent activity" value={(dev.stats.recentActivity.split("—")[0] ?? "").trim()} />
        <Card className="col-span-2 flex-col items-start gap-1.5 p-4">
          <div className="text-xs text-muted-foreground">Primary languages</div>
          <div className="flex flex-wrap gap-1.5">
            {dev.primaryLanguages.map((l) => (
              <TechChip key={l} name={l} />
            ))}
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="mt-8">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="stack">Tech Stack</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* The developer universe */}
          <section className="border border-border bg-card/30 px-4 py-8">
            <div className="mb-2 text-center font-mono text-[11px] tracking-[0.3em] text-muted-foreground uppercase">
              Skill universe — hover a node for evidence
            </div>
            <SkillConstellation skills={dev.skills} name={dev.name} />
          </section>
          {dev.aiSummary && (
            <Card className="gap-0 border-primary/25 p-5">
              <div className="font-mono text-[11px] tracking-[0.3em] text-primary uppercase">
                › the read
              </div>
              <p className="mt-3 text-sm leading-relaxed text-foreground">{dev.aiSummary}</p>
              {dev.aiTrajectory && (
                <p className="mt-3 border-t border-border pt-3 text-sm text-muted-foreground">
                  <span className="font-mono text-xs tracking-wider text-success uppercase">Trajectory → </span>
                  {dev.aiTrajectory}
                </p>
              )}
            </Card>
          )}
          <Card className="p-5">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <TrendingUp className="size-4 text-success" /> Current Technical Direction
            </div>
            <p className="text-sm text-muted-foreground">{dev.currentDirection}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {dev.currentFocus.map((t) => (
                <TechChip key={t} name={t} />
              ))}
            </div>
          </Card>
          <div>
            <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Top skills
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {dev.skills
                .slice()
                .sort((a, b) => b.confidence - a.confidence)
                .slice(0, 6)
                .map((s) => (
                  <SkillCard key={s.name} skill={s} />
                ))}
            </div>
          </div>
          <div>
            <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Most meaningful projects
            </h2>
            <div className="grid gap-4 lg:grid-cols-2">
              {dev.topProjects.slice(0, 2).map((p) => {
                const insight = dev.aiProjectInsights?.find((pi) => pi.name === p.name);
                return (
                  <div key={p.name} className="space-y-2">
                    <ProjectCard project={p} />
                    {insight && (
                      <p className="px-1 text-xs leading-relaxed text-muted-foreground">
                        <span className="font-mono text-[10px] tracking-wider text-primary uppercase">why it matters → </span>
                        {insight.why}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="skills" className="mt-6 space-y-8">
          {Object.entries(skillsByCategory).map(([category, skills]) => (
            <div key={category}>
              <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                {category}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {skills.map((s) => (
                  <SkillCard key={s.name} skill={s} />
                ))}
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="projects" className="mt-6">
          <p className="mb-4 text-sm text-muted-foreground">
            Ranked by meaningfulness — size, activity, documentation, and engineering signals — not star count.
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            {dev.topProjects.map((p) => (
              <ProjectCard key={p.name} project={p} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="stack" className="mt-6 space-y-6">
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold">Current stack</h2>
            <div className="flex flex-wrap gap-1.5">
              {dev.currentFocus.map((t) => (
                <TechChip key={t} name={t} />
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="mb-1 text-sm font-semibold">Historical skills</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Used in older projects — weighted lower than current work.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {dev.historicalSkills.map((t) => (
                <TechChip key={t} name={t} dim />
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <Card className="p-5">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <History className="size-4 text-muted-foreground" /> Recent activity
            </div>
            <p className="text-sm text-muted-foreground">{dev.stats.recentActivity}</p>
            <ul className="mt-4 space-y-2">
              {dev.topProjects.slice(0, 4).map((p) => (
                <li key={p.name} className="flex items-center justify-between border-b border-border pb-2 text-sm last:border-0">
                  <span className="font-mono">{p.name}</span>
                  <span className="text-xs text-muted-foreground">{p.lastActive}</span>
                </li>
              ))}
            </ul>
          </Card>
        </TabsContent>
      </Tabs>
      </motion.div>
    </>
  );
}
